"use client";

import { useActionState } from "react";
import { FileUp, LoaderCircle, RefreshCw, TriangleAlert, Upload } from "lucide-react";
import {
    commitGeneratedResume,
    regenerateResume,
    uploadResume,
} from "@/app/(admin)/actions/resume";
import { DeployStatus } from "@/components/admin/DeployStatus";
import { controlStyles } from "@/components/admin/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IDLE_RESUME } from "@/types/admin";

/**
 * Upload and regeneration for the résumé (docs/admin-plan.md §7.5).
 *
 * Three separate `useActionState` hooks rather than one, because they are three
 * independent operations whose results must not overwrite each other: a
 * successful render's preview has to survive the operator reading the upload
 * form's error, and vice versa.
 *
 * **Regeneration never commits.** The render action returns the PDF and its page
 * count; a second, explicitly-labelled button commits. Replacing a résumé that
 * has already been sent to someone should not be a side effect of pressing
 * "preview".
 */
export function ResumePanel({ canWrite }: { canWrite: boolean }) {
    const [renderState, renderAction, rendering] = useActionState(regenerateResume, IDLE_RESUME);
    const [commitState, commitAction, committing] = useActionState(
        commitGeneratedResume,
        IDLE_RESUME,
    );
    const [uploadState, uploadAction, uploading] = useActionState(uploadResume, IDLE_RESUME);

    const preview = renderState.preview;

    return (
        <div className="flex flex-col gap-6">
            <Card plain className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1.5">
                    <h2 className="bp-meta text-ink-muted">Regenerate from site data</h2>
                    <p className="text-xs leading-relaxed text-ink-muted">
                        Builds a fresh PDF from{" "}
                        <code className="font-mono">data/experience.ts</code>,{" "}
                        <code className="font-mono">data/education.ts</code>,{" "}
                        <code className="font-mono">data/skills.ts</code> and the current project
                        list, laid out in the site&rsquo;s own typography. Curation lives in{" "}
                        <code className="font-mono">data/resume.ts</code>. No language model is
                        involved — a résumé has to be factually exact, and every word here already
                        exists somewhere in the repository.
                    </p>
                </div>

                <form action={renderAction}>
                    <Button type="submit" variant="secondary" size="sm" disabled={rendering}>
                        {rendering ? (
                            <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />
                        ) : (
                            <RefreshCw size={15} aria-hidden="true" />
                        )}
                        {rendering ? "Rendering…" : "Render preview"}
                    </Button>
                </form>

                <DeployStatus result={renderState} />

                {preview && (
                    <div className="flex flex-col gap-3">
                        {preview.pageCount !== 1 && (
                            <p className="flex items-start gap-2.5 rounded-sm border border-signal/40 bg-signal/10 p-3 text-sm leading-relaxed text-ink">
                                <TriangleAlert
                                    size={16}
                                    aria-hidden="true"
                                    className="mt-0.5 shrink-0 text-signal"
                                />
                                <span>
                                    {preview.pageCount} pages. The target is one — pull a lever in{" "}
                                    <code className="font-mono text-xs">data/resume.ts</code>:{" "}
                                    <code className="font-mono text-xs">maxProjects</code>,{" "}
                                    <code className="font-mono text-xs">maxRoles</code>,{" "}
                                    <code className="font-mono text-xs">maxBulletsPerRole</code> or{" "}
                                    <code className="font-mono text-xs">
                                        projectSummaryMaxChars
                                    </code>
                                    . Better to know now than after someone downloads it.
                                </span>
                            </p>
                        )}

                        {/*
                         * <object>, not <iframe>: an iframe to a data: URL is blocked by the
                         * CSP's frame-src, while an object is governed by object-src. If the
                         * browser refuses to inline it, the fallback link below still works —
                         * which is why the fallback is a real link and not a message.
                         */}
                        <object
                            data={preview.dataUrl}
                            type="application/pdf"
                            aria-label="Rendered résumé preview"
                            className="h-[70vh] w-full rounded-sm border border-line bg-surface-alt"
                        >
                            <p className="p-4 text-sm text-ink-muted">
                                This browser will not inline the PDF.{" "}
                                <a
                                    href={preview.dataUrl}
                                    download="resume-preview.pdf"
                                    className="bp-focus rounded-sm text-accent underline decoration-line-strong underline-offset-4"
                                >
                                    Download the preview
                                </a>{" "}
                                instead.
                            </p>
                        </object>

                        <form action={commitAction} className="flex flex-wrap items-center gap-3">
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={committing || !canWrite}
                            >
                                {committing ? (
                                    <LoaderCircle
                                        size={15}
                                        aria-hidden="true"
                                        className="animate-spin"
                                    />
                                ) : (
                                    <FileUp size={15} aria-hidden="true" />
                                )}
                                {committing ? "Committing…" : "Commit this version"}
                            </Button>
                            <p className="font-mono text-xs text-ink-muted">
                                replaces public/resume/resume.pdf ·{" "}
                                {Math.round(preview.byteLength / 1024)} KB
                            </p>
                        </form>

                        <DeployStatus result={commitState} />
                    </div>
                )}
            </Card>

            <Card plain className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1.5">
                    <h2 className="bp-meta text-ink-muted">Upload a replacement</h2>
                    <p className="text-xs leading-relaxed text-ink-muted">
                        For a PDF made elsewhere. Validated server-side by its leading bytes rather
                        than by the type the browser reports, and committed to the same fixed path.
                    </p>
                </div>

                <form action={uploadAction} className="flex flex-col gap-3">
                    <input
                        name="file"
                        type="file"
                        accept="application/pdf"
                        required
                        disabled={uploading || !canWrite}
                        aria-label="Replacement résumé PDF"
                        className={controlStyles}
                    />

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            disabled={uploading || !canWrite}
                        >
                            {uploading ? (
                                <LoaderCircle
                                    size={15}
                                    aria-hidden="true"
                                    className="animate-spin"
                                />
                            ) : (
                                <Upload size={15} aria-hidden="true" />
                            )}
                            {uploading ? "Committing…" : "Upload and commit"}
                        </Button>
                        <p className="font-mono text-xs text-ink-muted">5 MB max · PDF only</p>
                    </div>
                </form>

                <DeployStatus result={uploadState} />
            </Card>
        </div>
    );
}
