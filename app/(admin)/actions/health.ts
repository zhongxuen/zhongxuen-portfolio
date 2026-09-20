"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin/dal";
import {
    CommitConflictError,
    MissingTokenError,
    commitMessage,
    deleteFiles,
    isGithubWriteConfigured,
    screenshotTarget,
    type WriteTarget,
} from "@/lib/admin/github";
import { checkAssets, checkProjectLinks } from "@/lib/admin/health";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import type { ActionResult, LinkCheckResult } from "@/types/admin";

/**
 * The health page's two actions (docs/admin-plan.md §17.8).
 *
 * **Both begin with `await verifySession()`**, asserted statically by
 * tests/admin/actionGuards.test.ts. `runLinkCheck` is the one where the reason is
 * least obvious and most important: it makes this deployment issue outbound HTTP
 * requests to a list of URLs. Unauthenticated, that is a request-forwarding
 * primitive — someone else's traffic, from this project's IP, on demand. The
 * URLs come from `data/projects.ts` rather than from the caller, which already
 * bounds it, but "the input is trusted" plus "anyone can trigger it" is a poor
 * pair to rely on.
 */

export async function runLinkCheck(): Promise<LinkCheckResult> {
    await verifySession();

    let projects;

    try {
        ({ projects } = await loadProjectsFile());
    } catch (error) {
        console.error("[admin/health] could not load projects", error);

        return { status: "error", message: "Could not read data/projects.ts." };
    }

    try {
        const checks = await checkProjectLinks(projects);
        const bad = checks.filter(
            (check) => check.verdict === "broken" || check.verdict === "unreachable",
        ).length;

        return {
            status: "success",
            message:
                bad === 0
                    ? `Checked ${checks.length} links. Nothing is broken.`
                    : `Checked ${checks.length} links. ${bad} ${bad === 1 ? "is" : "are"} not answering.`,
            checks,
            ranAt: Date.now(),
        };
    } catch (error) {
        console.error("[admin/health] link check failed", error);

        return { status: "error", message: "The link check failed. The reason is in the logs." };
    }
}

/**
 * Deletes screenshot files that no project references.
 *
 * **The posted list is re-derived, never trusted.** Every path is put back
 * through `screenshotTarget` — so only a name this console could itself have
 * written is even expressible as a delete — and then checked against the *live*
 * `data/projects.ts` to confirm nothing references it. A stale page whose
 * orphan list was computed before a save would otherwise delete an image that
 * had since been attached to an entry, and the form's own list is exactly the
 * input an attacker or a stale tab would control.
 *
 * One commit for the whole sweep. A dozen commits to delete a dozen files would
 * bury the interesting history under housekeeping.
 */
export async function deleteOrphans(
    _previous: ActionResult,
    formData: FormData,
): Promise<ActionResult> {
    await verifySession();

    if (!isGithubWriteConfigured()) {
        return {
            status: "error",
            message:
                "GITHUB_ADMIN_TOKEN is not configured on this deployment, so nothing can be deleted.",
        };
    }

    const requested = formData.getAll("path").map((value) => String(value));

    if (requested.length === 0) {
        return { status: "error", message: "Nothing was selected." };
    }

    let projects;

    try {
        ({ projects } = await loadProjectsFile());
    } catch (error) {
        console.error("[admin/health] could not load projects", error);

        return { status: "error", message: "Could not read data/projects.ts." };
    }

    const report = await checkAssets(projects, true);
    const deletable = new Set(report.orphans);

    const targets = requested
        .filter((path) => deletable.has(path))
        .map((path) => screenshotTarget(path))
        .filter((target): target is WriteTarget => target !== null);

    if (targets.length === 0) {
        return {
            status: "conflict",
            message:
                "None of those files is still an orphan — the list on screen was computed before a change. Re-run the check.",
        };
    }

    try {
        const commit = await deleteFiles({
            targets,
            message: commitMessage.screenshotsDelete(targets.length),
        });

        if (!commit) {
            return {
                status: "success",
                message: "Those files were already gone. Nothing to commit.",
            };
        }

        revalidatePath("/admin", "layout");

        const skipped = requested.length - targets.length;

        return {
            status: "success",
            message: `Deleted ${targets.length} unreferenced screenshot${targets.length === 1 ? "" : "s"}.${
                skipped > 0 ? ` ${skipped} were skipped — they are referenced or not ours.` : ""
            }`,
            commit,
        };
    } catch (error) {
        if (error instanceof CommitConflictError) {
            return {
                status: "conflict",
                message: "The repository changed while deleting. Nothing was written — try again.",
            };
        }

        if (error instanceof MissingTokenError) {
            return { status: "error", message: "GITHUB_ADMIN_TOKEN is not configured." };
        }

        console.error("[admin/health] delete failed", error);

        return { status: "error", message: "The delete failed. The reason is in the logs." };
    }
}
