"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin/dal";
import {
    CommitConflictError,
    MissingTokenError,
    commitFile,
    commitFiles,
    commitMessage,
    screenshotHref,
    type ScreenshotExtension,
} from "@/lib/admin/github";
import { inDisplayOrder, loadProjectsFile, renumber } from "@/lib/admin/projectStore";
import {
    NEW_PROJECT_SLUG,
    parseProjectForm,
    validateProject,
    type ProjectFormState,
} from "@/lib/admin/projectForm";
import { serializeProjects } from "@/lib/admin/serializeProjects";
import type { ActionResult } from "@/types/admin";
import type { Project } from "@/types/project";

/**
 * Project create / update / delete / reorder (docs/admin-plan.md §7.2, §7.3).
 *
 * **Every exported function here begins with `await verifySession()`.** A Server
 * Action is a public POST endpoint reachable by replay, and the Next 16 proxy
 * docs are explicit that a proxy matcher does not cover Server Function calls.
 * tests/admin/actionGuards.test.ts asserts this by static check over the
 * directory, because the failure it catches is invisible in review.
 *
 * Every write reads the current file first and passes its blob sha back, so a
 * push that arrived from another device between page load and save is rejected
 * rather than clobbered — see §6.2 and `CommitConflictError`.
 */

/** Screenshot uploads: what the magic bytes must say, keyed by the extension we will commit as. */
const IMAGE_SIGNATURES: {
    extension: ScreenshotExtension;
    matches: (bytes: Uint8Array) => boolean;
}[] = [
    { extension: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    {
        extension: "png",
        matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
    },
    {
        // "RIFF" .... "WEBP"
        extension: "webp",
        matches: (b) =>
            b[0] === 0x52 &&
            b[1] === 0x49 &&
            b[2] === 0x46 &&
            b[3] === 0x46 &&
            b[8] === 0x57 &&
            b[9] === 0x45 &&
            b[10] === 0x42 &&
            b[11] === 0x50,
    },
];

/** 4 MB. Comfortably above a prepared screenshot and below the 6 MB Server Action body cap. */
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

/**
 * A rejection the operator is meant to read.
 *
 * Its own class so `saveProject` can tell "this file is 9 MB" — which is exactly
 * what they need to know — apart from whatever a failing `arrayBuffer()` would
 * say, which is a runtime detail that must not be serialized back to a browser.
 * Anything that is not one of these becomes a generic sentence and a log line.
 */
class UploadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UploadError";
    }
}

/**
 * Creates or updates one project, optionally committing a screenshot in the same
 * commit.
 *
 * `originalSlug` distinguishes the two: absent or `"new"` means create. It is a
 * hidden field rather than a closure argument so the form still submits without
 * JavaScript.
 */
export async function saveProject(
    _previous: ProjectFormState,
    formData: FormData,
): Promise<ProjectFormState> {
    await verifySession();

    const originalSlug = String(formData.get("originalSlug") ?? "").trim();
    const isCreate = originalSlug.length === 0 || originalSlug === NEW_PROJECT_SLUG;

    const submitted = parseProjectForm(formData);

    let file;

    try {
        file = await loadProjectsFile();
    } catch (error) {
        return failure(error, "Could not read data/projects.ts.");
    }

    if (file.source === "build") {
        return readOnly();
    }

    const existing = isCreate
        ? undefined
        : file.projects.find((project) => project.slug === originalSlug);

    if (!isCreate && !existing) {
        return {
            status: "error",
            message: `No project with the slug "${originalSlug}" exists in the repository any more. It may have been deleted from another device.`,
            errors: {},
            warnings: [],
        };
    }

    const takenSlugs = file.projects
        .filter((project) => project.slug !== originalSlug)
        .map((project) => project.slug);

    const { errors, warnings } = validateProject(submitted, takenSlugs);

    /*
     * `order` is never read from the form. On create it appends; on edit it keeps
     * whatever the list page's reorder action set. That makes a replayed save
     * incapable of reshuffling the site.
     */
    const next: Project = {
        ...submitted,
        order: existing?.order ?? file.projects.length + 1,
    };

    let screenshot: ScreenshotUpload | null = null;

    try {
        screenshot = await readScreenshot(formData, next);
    } catch (error) {
        if (error instanceof UploadError) {
            errors.screenshot = error.message;
        } else {
            console.error("[admin/projects] screenshot read failed", error);
            errors.screenshot = "That file could not be read.";
        }
    }

    if (Object.keys(errors).length > 0) {
        return {
            status: "error",
            message: "Nothing was committed — fix the highlighted fields.",
            errors,
            warnings: [],
        };
    }

    if (screenshot) {
        // Appended after validation so the path this run is about to create is not
        // rejected for not existing yet.
        next.screenshots = [...(next.screenshots ?? []), screenshotHref(screenshot.target)];
    }

    const updated = isCreate
        ? [...file.projects, next]
        : file.projects.map((project) => (project.slug === originalSlug ? next : project));

    const message = isCreate
        ? commitMessage.projectCreate(next.title)
        : commitMessage.project(next.title);

    try {
        const source = serializeProjects(updated);

        /*
         * Two files or one. A screenshot plus the entry referencing it must be a
         * single commit: two commits would leave `main` in a state where
         * data/projects.ts points at an image that is not there yet, and every
         * deploy of that commit ships a broken <Image>.
         */
        const commit = screenshot
            ? await commitFiles({
                  files: [
                      { target: { kind: "known", key: "projects" }, content: source },
                      { target: screenshot.target, content: screenshot.content },
                  ],
                  message,
              })
            : await commitFile({
                  target: { kind: "known", key: "projects" },
                  content: source,
                  sha: file.sha,
                  message,
              });

        revalidateAdmin();

        return {
            status: "success",
            message: isCreate ? `Created "${next.title}".` : `Saved "${next.title}".`,
            errors: {},
            warnings,
            commit,
        };
    } catch (error) {
        return failure(error, "The commit failed.");
    }
}

/**
 * Removes a project.
 *
 * Does not touch the GitHub repository the project describes, and does not delete
 * its screenshots — an image left in `public/images/projects/` costs 60 KB and
 * makes the deletion trivially reversible with `git revert`, which deleting it
 * would not be.
 */
export async function deleteProject(
    _previous: ActionResult,
    formData: FormData,
): Promise<ActionResult> {
    await verifySession();

    const slug = String(formData.get("slug") ?? "").trim();

    let file;

    try {
        file = await loadProjectsFile();
    } catch (error) {
        return { status: "error", message: describe(error, "Could not read data/projects.ts.") };
    }

    if (file.source === "build") {
        return { status: "error", message: READ_ONLY_MESSAGE };
    }

    const target = file.projects.find((project) => project.slug === slug);

    if (!target) {
        return { status: "error", message: `No project with the slug "${slug}" exists.` };
    }

    const remaining = renumber(
        inDisplayOrder(file.projects.filter((project) => project.slug !== slug)),
    );

    try {
        const commit = await commitFile({
            target: { kind: "known", key: "projects" },
            content: serializeProjects(remaining),
            sha: file.sha,
            message: commitMessage.projectDelete(target.title),
        });

        revalidateAdmin();

        return {
            status: "success",
            message: `Removed "${target.title}". /projects/${slug} becomes a 404 once the deploy finishes.`,
            commit,
        };
    } catch (error) {
        return { status: "error", message: describe(error, "The commit failed.") };
    }
}

/**
 * Rewrites `order` across the whole list from a posted sequence of slugs.
 *
 * The whole list, not a delta: `order` is the curated sort key
 * `services/projectService.ts` reads, and renumbering 1..n in one commit keeps it
 * dense. A partial update would leave gaps and duplicates that only show up as a
 * surprising card order on the live site.
 */
export async function reorderProjects(
    _previous: ActionResult,
    formData: FormData,
): Promise<ActionResult> {
    await verifySession();

    const order = formData.getAll("slug").map((value) => String(value));

    let file;

    try {
        file = await loadProjectsFile();
    } catch (error) {
        return { status: "error", message: describe(error, "Could not read data/projects.ts.") };
    }

    if (file.source === "build") {
        return { status: "error", message: READ_ONLY_MESSAGE };
    }

    const bySlug = new Map(file.projects.map((project) => [project.slug, project]));

    /*
     * The posted sequence must name every project exactly once. Anything else —
     * a stale tab, a replay, a project deleted meanwhile — would silently drop
     * entries from the file, which is the one outcome a reorder must never have.
     */
    if (
        order.length !== file.projects.length ||
        new Set(order).size !== order.length ||
        order.some((slug) => !bySlug.has(slug))
    ) {
        return {
            status: "conflict",
            message:
                "The posted order does not match the projects in the repository. Reload and try again.",
        };
    }

    const reordered = renumber(order.map((slug) => bySlug.get(slug)!));

    try {
        const commit = await commitFile({
            target: { kind: "known", key: "projects" },
            content: serializeProjects(reordered),
            sha: file.sha,
            message: commitMessage.reorder(reordered.length),
        });

        revalidateAdmin();

        return { status: "success", message: "New order committed.", commit };
    } catch (error) {
        return { status: "error", message: describe(error, "The commit failed.") };
    }
}

/**
 * Reads an optional screenshot out of the form and validates it properly.
 *
 * The browser-supplied MIME type is ignored entirely — it is attacker-controlled
 * and says nothing. The extension the file is committed under comes from its
 * actual magic bytes, so a `.jpg` that is really a PNG lands as a `.png` and a
 * file that is neither is refused. The destination path is built by
 * `targetPath()` from the slug and an index, never from the uploaded filename, so
 * no part of the user's input reaches the path.
 */
interface ScreenshotUpload {
    target: { kind: "screenshot"; slug: string; index: number; extension: ScreenshotExtension };
    content: Uint8Array;
}

async function readScreenshot(
    formData: FormData,
    project: Project,
): Promise<ScreenshotUpload | null> {
    const entry = formData.get("screenshotFile");

    if (!(entry instanceof File) || entry.size === 0) {
        return null;
    }

    if (entry.size > MAX_SCREENSHOT_BYTES) {
        throw new UploadError(
            `That image is ${Math.round(entry.size / 1024)} KB. The limit is ${MAX_SCREENSHOT_BYTES / 1024 / 1024} MB — resize it first.`,
        );
    }

    const content = new Uint8Array(await entry.arrayBuffer());
    const signature = IMAGE_SIGNATURES.find((candidate) => candidate.matches(content));

    if (!signature) {
        throw new UploadError("That file is not a JPEG, PNG or WebP image.");
    }

    /*
     * Index is one past however many screenshots the entry already has, so
     * uploading twice does not overwrite the first. It is bounded by
     * `targetPath()` at 24, which is far past anything reasonable.
     */
    const index = (project.screenshots?.length ?? 0) + 1;

    return {
        target: {
            kind: "screenshot",
            slug: project.slug,
            index,
            extension: signature.extension,
        },
        content,
    };
}

const READ_ONLY_MESSAGE =
    "GITHUB_ADMIN_TOKEN is not configured on this deployment, so this console can read but not write. Nothing was changed.";

function readOnly(): ProjectFormState {
    return { status: "error", message: READ_ONLY_MESSAGE, errors: {}, warnings: [] };
}

function failure(error: unknown, fallback: string): ProjectFormState {
    return {
        status: describeStatus(error),
        message: describe(error, fallback),
        errors: {},
        warnings: [],
    };
}

function describeStatus(error: unknown): "error" | "conflict" {
    return error instanceof CommitConflictError ? "conflict" : "error";
}

/**
 * Turns a thrown error into something safe to return.
 *
 * Action return values are serialized straight to the client, so only the three
 * error classes this module defines contribute their own wording. Everything else
 * is logged server-side and replaced with the caller's generic sentence — the
 * discipline `app/actions/contact.ts` already documents.
 */
function describe(error: unknown, fallback: string): string {
    if (error instanceof CommitConflictError) {
        return "The repository changed since this page loaded, so nothing was written.";
    }

    if (error instanceof MissingTokenError) {
        return READ_ONLY_MESSAGE;
    }

    console.error("[admin/projects] action failed", error);

    /*
     * ProjectSourceError's message names a field or a line number and nothing
     * else, and it is the one message the operator actually needs — a file the
     * parser refuses to read cannot be fixed from a generic sentence.
     */
    if (error instanceof Error && error.name === "ProjectSourceError") {
        return error.message;
    }

    return `${fallback} The reason is in the deployment logs.`;
}

/**
 * Refreshes the console's own pages after a write.
 *
 * Only the admin tree: the public site is regenerated by the Vercel build the
 * commit triggers, not by a revalidation here, because the data it renders from
 * is a module import that this running process cannot change. Revalidating `/`
 * would re-render it from the same stale array and look like the save failed.
 */
function revalidateAdmin(): void {
    revalidatePath("/admin", "layout");
}
