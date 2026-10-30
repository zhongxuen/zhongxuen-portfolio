"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin/dal";
import {
    CommitConflictError,
    MissingTokenError,
    commitFile,
    commitMessage,
} from "@/lib/admin/github";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import { serializeProjects } from "@/lib/admin/serializeProjects";
import {
    applySyncPlan,
    buildSyncPlan,
    planSize,
    type NarrativeUpdate,
} from "@/lib/admin/syncDiff";
import { DraftInputError, draftNarrative } from "@/lib/admin/syncNarrative";
import { getPortfolioRepos } from "@/services/githubService";
import {
    NARRATIVE_FIELDS,
    NARRATIVE_LIST_FIELDS,
    draftFieldName,
    type ActionResult,
    type DraftResult,
    type SyncPlan,
} from "@/types/admin";

/**
 * Applies a reviewed GitHub sync plan (docs/admin-plan.md §7.4).
 *
 * Begins with `await verifySession()`, like every action outside auth.ts.
 *
 * **The plan is rebuilt server-side, not read from the form.** The form posts only
 * the ids of the entries that were ticked; the repos are re-fetched and the diff
 * recomputed here. Trusting a posted plan would let a replayed request write any
 * field of any project — the checkbox values are a *selection*, and a selection is
 * the only thing the client is allowed to decide.
 *
 * The cost is that a repo pushed between rendering the page and pressing Apply
 * produces an entry whose id is not in the selection, so it is simply not applied.
 * That is the right failure: the operator reviews what they saw.
 *
 * **The one exception is drafted copy.** A model draft cannot be recomputed —
 * the same prompt gives different words — and the operator may have edited it,
 * so the kept text is posted. It is accepted only for activity entries that the
 * rebuilt plan still lists and that were ticked, only for the narrative fields
 * in `NARRATIVE_FIELDS`, and only within the length limits below. That is the
 * same write the project editor already allows an authenticated session.
 */
export async function applySync(
    _previous: ActionResult,
    formData: FormData,
): Promise<ActionResult> {
    await verifySession();

    const selected = new Set(formData.getAll("entry").map((value) => String(value)));

    if (selected.size === 0) {
        return { status: "error", message: "Nothing was selected, so nothing was committed." };
    }

    let file;

    try {
        file = await loadProjectsFile();
    } catch (error) {
        return { status: "error", message: describe(error, "Could not read data/projects.ts.") };
    }

    if (file.source === "build") {
        return {
            status: "error",
            message:
                "GITHUB_ADMIN_TOKEN is not configured on this deployment, so this console can read but not write. Nothing was changed.",
        };
    }

    const repos = await getPortfolioRepos();

    if (repos.length === 0) {
        /*
         * An empty repo list is indistinguishable from "every repo was deleted",
         * and `buildSyncPlan` would dutifully orphan everything. It applies no
         * deletions, so nothing would be lost — but it would also silently apply
         * nothing while reporting success, which is worse than refusing.
         */
        return {
            status: "error",
            message:
                "GitHub returned no repositories — a rate limit or a network failure. Nothing was committed.",
        };
    }

    const plan = buildSyncPlan(file.projects, repos);

    if (planSize(plan) === 0) {
        return {
            status: "conflict",
            message:
                "The diff is now empty — the repository or the repo list changed since this page loaded. Reload to see the current state.",
        };
    }

    const drafts = readDrafts(formData, plan, selected);

    if (typeof drafts === "string") {
        return { status: "error", message: drafts };
    }

    const updated = applySyncPlan(file.projects, plan, selected, drafts);

    if (updated.length === file.projects.length && serializedUnchanged(file.projects, updated)) {
        return {
            status: "error",
            message:
                "None of the selected changes still apply. Reload the page to rebuild the diff.",
        };
    }

    try {
        const commit = await commitFile({
            target: { kind: "known", key: "projects" },
            content: serializeProjects(updated),
            sha: file.sha,
            message: commitMessage.sync(selected.size),
        });

        revalidatePath("/admin", "layout");

        const added = updated.length - file.projects.length;

        return {
            status: "success",
            message:
                added > 0
                    ? `Committed. ${added} new ${added === 1 ? "entry" : "entries"} appended — each arrives with a machine-written description you will want to rewrite.`
                    : "Committed.",
            commit,
        };
    } catch (error) {
        return {
            status: describeStatus(error),
            message: describe(error, "The commit failed."),
        };
    }
}

/**
 * Drafts an update to one entry's copy from its README and the commits since its
 * last review. Writes nothing: the result goes back to the review form, where it
 * is edited and ticked like any other entry before `applySync` commits it.
 */
export async function draftUpdate(slug: string): Promise<DraftResult> {
    await verifySession();

    let file;

    try {
        file = await loadProjectsFile();
    } catch (error) {
        return { status: "error", message: describe(error, "Could not read data/projects.ts.") };
    }

    const project = file.projects.find((candidate) => candidate.slug === slug);
    const entry = project
        ? buildSyncPlan([project], await getPortfolioRepos()).activity[0]
        : undefined;

    if (!project || !entry) {
        return {
            status: "error",
            message: "That entry has no new work to draft from any more. Reload the page.",
        };
    }

    try {
        return { status: "success", draft: await draftNarrative(project, entry.githubRepo) };
    } catch (error) {
        if (error instanceof DraftInputError) {
            return {
                status: "error",
                message: "The repository has no README and no commits to draft from.",
            };
        }

        console.error("[admin/sync] draft failed", error);

        return {
            status: "error",
            message:
                "The draft failed — usually the AI Gateway is not configured (AI_GATEWAY_API_KEY locally; OIDC on Vercel) or the model is unavailable. The reason is in the logs. You can still mark the entry reviewed.",
        };
    }
}

const MAX_TEXT = { description: 300, longDescription: 8000 } as const;
const MAX_ITEM = 800;
const MAX_ITEMS = 40;

/**
 * Reads and validates the drafted copy the operator kept. Returns the updates by
 * slug, or an error message naming the first field that failed.
 *
 * A field arrives only when its "keep" box is ticked: an unticked field's
 * textarea is disabled, and disabled controls are not submitted.
 */
function readDrafts(
    formData: FormData,
    plan: SyncPlan,
    selected: Set<string>,
): Map<string, NarrativeUpdate> | string {
    const drafts = new Map<string, NarrativeUpdate>();

    for (const entry of plan.activity) {
        if (!selected.has(`activity:${entry.slug}`)) {
            continue;
        }

        const update: NarrativeUpdate = {};

        for (const field of NARRATIVE_FIELDS) {
            const raw = formData.get(draftFieldName(entry.slug, field));

            if (raw === null) {
                continue;
            }

            const value = String(raw);

            if (NARRATIVE_LIST_FIELDS.includes(field)) {
                const items = value
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0);

                if (items.length > MAX_ITEMS || items.some((item) => item.length > MAX_ITEM)) {
                    return `${entry.title}: ${field} is too long — at most ${MAX_ITEMS} items of ${MAX_ITEM} characters.`;
                }

                if (field === "technologies" && items.length === 0) {
                    return `${entry.title}: technologies cannot be empty.`;
                }

                (update as Record<string, string[]>)[field] = items;
            } else {
                const text = value.trim();
                const max = MAX_TEXT[field as keyof typeof MAX_TEXT];

                if (field === "description" && text.length === 0) {
                    return `${entry.title}: the description cannot be empty.`;
                }

                if (text.length > max) {
                    return `${entry.title}: ${field} is longer than ${max} characters.`;
                }

                (update as Record<string, string>)[field] = text;
            }
        }

        drafts.set(entry.slug, update);
    }

    return drafts;
}

/**
 * Compares by serialized output rather than by deep equality.
 *
 * The serialized text is what would actually be committed, so this answers the
 * only question that matters — "would this commit change the file?" — and avoids a
 * commit whose diff is empty.
 */
function serializedUnchanged(
    before: Parameters<typeof serializeProjects>[0],
    after: Parameters<typeof serializeProjects>[0],
): boolean {
    return serializeProjects(before) === serializeProjects(after);
}

function describeStatus(error: unknown): "error" | "conflict" {
    return error instanceof CommitConflictError ? "conflict" : "error";
}

function describe(error: unknown, fallback: string): string {
    if (error instanceof CommitConflictError) {
        return "The repository changed since this page loaded, so nothing was written.";
    }

    if (error instanceof MissingTokenError) {
        return "GITHUB_ADMIN_TOKEN is not configured on this deployment. Nothing was changed.";
    }

    console.error("[admin/sync] action failed", error);

    if (error instanceof Error && error.name === "ProjectSourceError") {
        return error.message;
    }

    return `${fallback} The reason is in the deployment logs.`;
}
