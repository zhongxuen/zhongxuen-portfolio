"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin/dal";
import {
    CommitConflictError,
    MissingTokenError,
    commitFile,
    commitMessage,
    isGithubWriteConfigured,
    readFile,
} from "@/lib/admin/github";
import {
    SettingsPatchError,
    serializeNow,
    writeAvailability,
    writeLastModified,
} from "@/lib/admin/serializeSettings";
import type { ActionResult } from "@/types/admin";
import type { NowEntry } from "@/types/now";

/**
 * The one-line edits that would otherwise need a code change
 * (docs/admin-plan.md §7.6): the availability pill, the NOW block, and the
 * sitemap's manually-bumped last-modified date.
 *
 * All three exported actions begin with `await verifySession()`.
 *
 * Each reads the live file, patches or re-emits it, and commits with the blob sha
 * it read — so a concurrent edit is a conflict rather than a clobber, exactly as
 * in the project actions.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Availability pill: `AVAILABILITY` in lib/constants.ts. */
export async function saveAvailability(
    _previous: ActionResult,
    formData: FormData,
): Promise<ActionResult> {
    await verifySession();

    const open = formData.get("open") === "on";
    const label = String(formData.get("label") ?? "").trim();

    if (label.length === 0) {
        return { status: "error", message: "The pill needs a label." };
    }

    if (label.length > 60) {
        return { status: "error", message: "Keep the label under 60 characters — it is a pill." };
    }

    return patchConstants(
        (source) => writeAvailability(source, { open, label }),
        commitMessage.settings("the availability pill"),
        open
            ? `Availability is on: the navbar pill and the footer now read “${label}”.`
            : "Availability is off: the navbar pill and the footer stop claiming availability.",
    );
}

/**
 * `SITE_LAST_MODIFIED` in lib/constants.ts, which app/sitemap.ts publishes for
 * the home and /projects pages.
 *
 * The date is validated here rather than trusted from the form, because it is
 * written into a string literal in a source file: an unvalidated value is a
 * template-injection hole into `lib/constants.ts`. `writeLastModified` escapes
 * quotes too, so this is the second of two locks on the same door.
 */
export async function bumpLastModified(
    _previous: ActionResult,
    formData: FormData,
): Promise<ActionResult> {
    await verifySession();

    const date = String(formData.get("date") ?? "").trim();

    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
        return { status: "error", message: "That is not a valid YYYY-MM-DD date." };
    }

    return patchConstants(
        (source) => writeLastModified(source, date),
        commitMessage.settings("the sitemap's last-modified date"),
        `Sitemap last-modified set to ${date}.`,
    );
}

/** The NOW block: `data/now.ts`, re-emitted in full. */
export async function saveNow(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
    await verifySession();

    if (!isGithubWriteConfigured()) {
        return { status: "error", message: READ_ONLY };
    }

    const read = (name: string) => formData.getAll(name).map((value) => String(value).trim());

    const ids = read("id");
    const labels = read("label");
    const details = read("detail");
    const sinces = read("since");

    const entries: NowEntry[] = [];

    for (let index = 0; index < ids.length; index += 1) {
        /*
         * A row whose id and detail are both blank was added and abandoned. Skip
         * it rather than rejecting the whole save — the same courtesy ListField's
         * empty rows get everywhere else in this console.
         */
        if (!ids[index] && !details[index]) {
            continue;
        }

        if (!ids[index] || !labels[index] || !details[index]) {
            return {
                status: "error",
                message: `Row ${index + 1} is missing its id, label or detail. Nothing was committed.`,
            };
        }

        if (!ISO_DATE.test(sinces[index] ?? "")) {
            return {
                status: "error",
                message: `Row ${index + 1} needs a YYYY-MM-DD "since" date. A NOW list with no dates cannot tell anyone it has gone stale — which is the whole reason the field is required.`,
            };
        }

        entries.push({
            id: ids[index],
            label: labels[index],
            detail: details[index],
            since: sinces[index],
        });
    }

    if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
        return {
            status: "error",
            message: "Two rows share an id. Ids are React keys, so they must be unique.",
        };
    }

    try {
        const file = await readFile({ kind: "known", key: "now" });

        const commit = await commitFile({
            target: { kind: "known", key: "now" },
            content: serializeNow(entries),
            sha: file?.sha ?? null,
            message: commitMessage.settings("the NOW block"),
        });

        revalidatePath("/admin", "layout");

        return {
            status: "success",
            message: `Committed ${entries.length} NOW ${entries.length === 1 ? "entry" : "entries"}.`,
            commit,
        };
    } catch (error) {
        return { status: describeStatus(error), message: describe(error) };
    }
}

/**
 * Reads `lib/constants.ts`, applies a patch, commits it.
 *
 * The file is patched rather than re-emitted because it is not a data literal —
 * it holds `resolveSiteUrl()`, a build-time throw, and several paragraphs of
 * reasoning that this console has no business regenerating. See
 * lib/admin/serializeSettings.ts.
 */
async function patchConstants(
    patch: (source: string) => string,
    message: string,
    success: string,
): Promise<ActionResult> {
    if (!isGithubWriteConfigured()) {
        return { status: "error", message: READ_ONLY };
    }

    try {
        const file = await readFile({ kind: "known", key: "availability" });

        if (!file) {
            return {
                status: "error",
                message: "lib/constants.ts was not found in the repository.",
            };
        }

        const patched = patch(file.text);

        if (patched === file.text) {
            /*
             * Nothing changed, so there is nothing to commit. Saying so beats
             * pushing an empty commit and telling the operator to wait a minute
             * for a build that will produce an identical site.
             */
            return {
                status: "success",
                message: "No change — that is already what the file says.",
            };
        }

        const commit = await commitFile({
            target: { kind: "known", key: "availability" },
            content: patched,
            sha: file.sha,
            message,
        });

        revalidatePath("/admin", "layout");

        return { status: "success", message: success, commit };
    } catch (error) {
        return { status: describeStatus(error), message: describe(error) };
    }
}

const READ_ONLY =
    "GITHUB_ADMIN_TOKEN is not configured on this deployment, so this console can read but not write. Nothing was changed.";

function describeStatus(error: unknown): "error" | "conflict" {
    return error instanceof CommitConflictError ? "conflict" : "error";
}

function describe(error: unknown): string {
    if (error instanceof CommitConflictError) {
        return "The file changed in the repository since this page loaded, so nothing was written.";
    }

    if (error instanceof MissingTokenError) {
        return READ_ONLY;
    }

    /*
     * SettingsPatchError's message names the declaration it could not find and
     * says how to fix it. It describes the repository's own state rather than any
     * internal detail, and it is the one message the operator actually needs.
     */
    if (error instanceof SettingsPatchError) {
        return error.message;
    }

    console.error("[admin/settings] action failed", error);

    return "The commit failed. The reason is in the deployment logs.";
}
