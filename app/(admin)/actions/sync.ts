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
import { applySyncPlan, buildSyncPlan, planSize } from "@/lib/admin/syncDiff";
import { getPortfolioRepos } from "@/services/githubService";
import type { ActionResult } from "@/types/admin";

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

    const updated = applySyncPlan(file.projects, plan, selected);

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
