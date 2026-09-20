"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin/dal";
import {
    CommitConflictError,
    MissingTokenError,
    blobSha,
    commitFile,
    commitMessage,
    WRITABLE_FILES,
} from "@/lib/admin/github";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import { renderResume } from "@/lib/resume/render";
import type { ResumeActionState } from "@/types/admin";

/**
 * Résumé upload and regeneration (docs/admin-plan.md §7.5, §8.4).
 *
 * Both exported actions begin with `await verifySession()`.
 */

/** 8 MB. Above any sane résumé, below the 6 MB Server Action body cap plus multipart overhead. */
const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** `%PDF-`. Checked on the bytes, never on the browser-supplied MIME type. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];

/**
 * Renders the résumé from the repository's current data and returns it for
 * review. Commits nothing.
 */
export async function regenerateResume(
    _previous: ResumeActionState,
    _formData: FormData,
): Promise<ResumeActionState> {
    await verifySession();

    try {
        const file = await loadProjectsFile();
        const { bytes, pageCount } = await renderResume(file.projects);

        return {
            status: "success",
            message:
                pageCount === 1
                    ? "Rendered one page. Nothing has been committed — review it, then commit."
                    : `Rendered ${pageCount} pages. The target is one: lower maxProjects, maxRoles or projectSummaryMaxChars in data/resume.ts. Nothing has been committed.`,
            preview: {
                dataUrl: `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`,
                pageCount,
                byteLength: bytes.length,
            },
        };
    } catch (error) {
        console.error("[admin/resume] render failed", error);

        return {
            status: "error",
            message: "The résumé could not be rendered. The reason is in the deployment logs.",
        };
    }
}

/**
 * Commits a previously previewed render.
 *
 * It re-renders rather than taking the preview's bytes back from the client: a
 * base64 payload posted by a browser is client-supplied data, and this endpoint
 * writes a file the public site serves. Re-rendering from the same source costs
 * a second of CPU and removes the question entirely. The data has not moved in
 * between — both reads come from the same repository state — so what is
 * committed is what was reviewed.
 */
export async function commitGeneratedResume(
    _previous: ResumeActionState,
    _formData: FormData,
): Promise<ResumeActionState> {
    await verifySession();

    try {
        const file = await loadProjectsFile();
        const { bytes, pageCount } = await renderResume(file.projects);

        const commit = await commitFile({
            target: { kind: "known", key: "resumePdf" },
            content: bytes,
            sha: await blobSha(WRITABLE_FILES.resumePdf),
            message: commitMessage.resumeGenerate(),
        });

        revalidatePath("/admin", "layout");

        return {
            status: "success",
            message: `Committed a ${pageCount}-page résumé, ${Math.round(bytes.length / 1024)} KB. The size shown on the site updates itself on the next build.`,
            commit,
        };
    } catch (error) {
        return { status: describeStatus(error), message: describe(error) };
    }
}

/**
 * Replaces `public/resume/resume.pdf` with an uploaded file.
 *
 * Validated by magic bytes, not by the `type` the browser reported — that value
 * is attacker-controlled and says nothing about the content. The destination is a
 * fixed allowlist key, so the uploaded filename never touches the path.
 */
export async function uploadResume(
    _previous: ResumeActionState,
    formData: FormData,
): Promise<ResumeActionState> {
    await verifySession();

    const entry = formData.get("file");

    if (!(entry instanceof File) || entry.size === 0) {
        return { status: "error", message: "Choose a PDF first." };
    }

    if (entry.size > MAX_PDF_BYTES) {
        return {
            status: "error",
            message: `That file is ${Math.round(entry.size / 1024)} KB. The limit is ${MAX_PDF_BYTES / 1024 / 1024} MB.`,
        };
    }

    const bytes = new Uint8Array(await entry.arrayBuffer());

    if (!PDF_MAGIC.every((byte, index) => bytes[index] === byte)) {
        return {
            status: "error",
            message:
                "That file does not start with %PDF- , so it is not a PDF whatever it is named.",
        };
    }

    try {
        const commit = await commitFile({
            target: { kind: "known", key: "resumePdf" },
            content: bytes,
            sha: await blobSha(WRITABLE_FILES.resumePdf),
            message: commitMessage.resumeUpload(),
        });

        revalidatePath("/admin", "layout");

        return {
            status: "success",
            message: `Uploaded ${Math.round(bytes.length / 1024)} KB. The size annotation on the site is measured at build time, so it updates itself.`,
            commit,
        };
    } catch (error) {
        return { status: describeStatus(error), message: describe(error) };
    }
}

function describeStatus(error: unknown): "error" | "conflict" {
    return error instanceof CommitConflictError ? "conflict" : "error";
}

function describe(error: unknown): string {
    if (error instanceof CommitConflictError) {
        return "The résumé changed in the repository since this page loaded, so nothing was written.";
    }

    if (error instanceof MissingTokenError) {
        return "GITHUB_ADMIN_TOKEN is not configured on this deployment. Nothing was changed.";
    }

    console.error("[admin/resume] commit failed", error);

    return "The commit failed. The reason is in the deployment logs.";
}
