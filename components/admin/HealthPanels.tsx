"use client";

import { useActionState, useState } from "react";
import {
    CircleCheck,
    CircleSlash,
    ExternalLink,
    LoaderCircle,
    RefreshCw,
    Trash2,
    TriangleAlert,
} from "lucide-react";
import { deleteOrphans, runLinkCheck } from "@/app/(admin)/actions/health";
import { DeployStatus } from "@/components/admin/DeployStatus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IDLE_ACTION, type LinkCheckResult } from "@/types/admin";
import type { AssetReport, LinkVerdict } from "@/lib/admin/health";
import { cn } from "@/lib/utils";

/**
 * The health page's interactive halves (docs/admin-plan.md §17.8).
 *
 * The asset report is computed on the server when the page renders — it is two
 * cheap GitHub reads — while the link check is a button, because it makes a
 * dozen outbound requests to other people's servers and a page that did that on
 * every load would be both slow and rude.
 */

/**
 * How each verdict reads, and whether it is a problem.
 *
 * `blocked` is deliberately neutral rather than green or red. A 403 from a
 * GitHub repo means it went private, which is a real finding; a 403 from a demo
 * host means its bot protection does not like a HEAD from a datacentre, which is
 * nothing. The checker cannot tell those apart, so it declines to guess and says
 * what it saw.
 */
const VERDICTS: Record<LinkVerdict, { label: string; tone: "ok" | "warn" | "bad" }> = {
    ok: { label: "OK", tone: "ok" },
    redirect: { label: "Redirects", tone: "warn" },
    blocked: { label: "Refused to answer", tone: "warn" },
    broken: { label: "Broken", tone: "bad" },
    unreachable: { label: "Unreachable", tone: "bad" },
};

const toneClass = {
    ok: "text-success",
    warn: "text-signal",
    bad: "text-danger",
} as const;

export function LinkCheckPanel() {
    const [state, setState] = useState<LinkCheckResult>(IDLE_ACTION);
    const [pending, setPending] = useState(false);

    async function run() {
        setPending(true);

        try {
            setState(await runLinkCheck());
        } catch {
            setState({
                status: "error",
                message: "The check could not be started. Reload and try again.",
            });
        } finally {
            setPending(false);
        }
    }

    const problems = (state.checks ?? []).filter(
        (check) => VERDICTS[check.verdict].tone !== "ok",
    ).length;

    return (
        <section className="flex flex-col gap-3">
            <div>
                <h2 className="font-display text-h4 font-bold text-ink">Outbound links</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">
                    Every <code className="font-mono">liveUrl</code> and{" "}
                    <code className="font-mono">githubUrl</code> in data/projects.ts, requested from
                    this deployment. A demo host that slept a project after ninety days and a repo
                    that went private both look exactly like a working site from in here — the only
                    way to find out is to ask.
                </p>
            </div>

            <Card plain className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={run}
                        disabled={pending}
                    >
                        {pending ? (
                            <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} aria-hidden="true" />
                        )}
                        {pending ? "Checking…" : "Run link check"}
                    </Button>

                    {state.ranAt && (
                        <p className="font-mono text-xs text-ink-muted">
                            Last run {new Date(state.ranAt).toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Mounted at all times so the summary is announced when it changes. */}
                <div role="status" aria-live="polite" className="min-w-0">
                    {state.status === "error" && (
                        <p className="flex items-start gap-2.5 rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-ink">
                            <TriangleAlert
                                size={16}
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-danger"
                            />
                            {state.message}
                        </p>
                    )}

                    {state.status === "success" && (
                        <p className="text-sm text-ink">
                            {state.message}
                            {problems > 0 && (
                                <span className="text-ink-muted">
                                    {" "}
                                    {problems} need{problems === 1 ? "s" : ""} a look.
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {state.checks && state.checks.length > 0 && (
                    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-sm border border-line">
                        {state.checks.map((check) => {
                            const verdict = VERDICTS[check.verdict];

                            return (
                                <li
                                    key={`${check.slug}-${check.field}`}
                                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3.5 py-2.5"
                                >
                                    <span
                                        className={cn(
                                            "w-36 shrink-0 text-xs font-medium",
                                            toneClass[verdict.tone],
                                        )}
                                    >
                                        {verdict.label}
                                        {check.status ? ` · ${check.status}` : ""}
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <a
                                            href={check.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bp-focus inline-flex items-baseline gap-1 rounded-sm font-mono text-xs break-all text-ink transition-colors duration-fast ease-bp hover:text-accent"
                                        >
                                            {check.url}
                                            <ExternalLink
                                                size={11}
                                                aria-hidden="true"
                                                className="shrink-0"
                                            />
                                        </a>
                                        <span className="block text-xs text-ink-muted">
                                            {check.title} · {check.field}
                                            {check.ms !== undefined ? ` · ${check.ms} ms` : ""}
                                            {check.location ? ` → ${check.location}` : ""}
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>
        </section>
    );
}

export function AssetPanel({ report, canWrite }: { report: AssetReport; canWrite: boolean }) {
    const [state, action, pending] = useActionState(deleteOrphans, IDLE_ACTION);

    const clean =
        !report.unavailable &&
        report.orphans.length === 0 &&
        report.missing.length === 0 &&
        report.unmanaged.length === 0;

    return (
        <section className="flex flex-col gap-3">
            <div>
                <h2 className="font-display text-h4 font-bold text-ink">Screenshots</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">
                    <code className="font-mono">public/images/projects/</code> reconciled against
                    what data/projects.ts actually references, read from the repository rather than
                    from this build — a file deleted yesterday is still on disk in a deploy from
                    last week.
                </p>
            </div>

            <Card plain className="flex flex-col gap-5 p-4 sm:p-5">
                {report.unavailable && (
                    <p className="text-sm text-ink-muted">
                        No write token, so the repository cannot be listed. This check needs{" "}
                        <code className="font-mono text-xs">GITHUB_ADMIN_TOKEN</code>.
                    </p>
                )}

                {clean && (
                    <p className="flex items-center gap-2 text-sm text-success">
                        <CircleCheck size={16} aria-hidden="true" className="shrink-0" />
                        Every referenced screenshot exists, and every file is referenced.
                    </p>
                )}

                {report.missing.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <h3 className="flex items-center gap-2 text-sm font-medium text-danger">
                            <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
                            Referenced but not in the repository
                        </h3>
                        <p className="text-xs leading-relaxed text-ink-muted">
                            These render as a broken image on the project page. Next does not fail a
                            build over a missing file in <code className="font-mono">public/</code>,
                            so nothing else reports them. Fix by re-uploading the image or removing
                            the path from the entry.
                        </p>
                        <ul className="flex flex-col gap-1">
                            {report.missing.map((entry) => (
                                <li key={entry.path} className="font-mono text-xs text-ink">
                                    {entry.path}{" "}
                                    <span className="text-ink-muted">— {entry.slug}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {report.orphans.length > 0 && (
                    <form action={action} className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium text-ink">Unreferenced files</h3>
                        <p className="text-xs leading-relaxed text-ink-muted">
                            No project lists these. They cost nothing but accumulate forever —
                            before the console could delete, every trimmed screenshot stayed here
                            permanently. Deleting is one commit and{" "}
                            <code className="font-mono">git revert</code> brings them back.
                        </p>

                        <ul className="flex flex-col gap-1.5 py-1">
                            {report.orphans.map((path) => (
                                <li key={path} className="flex items-center gap-2.5">
                                    <input
                                        id={`orphan-${path}`}
                                        type="checkbox"
                                        name="path"
                                        value={path}
                                        defaultChecked
                                        disabled={pending || !canWrite}
                                        className="bp-focus size-4 shrink-0 rounded-xs border border-line-ui accent-accent"
                                    />
                                    <label
                                        htmlFor={`orphan-${path}`}
                                        className="font-mono text-xs break-all text-ink"
                                    >
                                        {path}
                                    </label>
                                </li>
                            ))}
                        </ul>

                        <Button
                            type="submit"
                            variant="secondary"
                            size="md"
                            className="w-fit"
                            disabled={pending || !canWrite}
                        >
                            {pending ? (
                                <LoaderCircle
                                    size={16}
                                    aria-hidden="true"
                                    className="animate-spin"
                                />
                            ) : (
                                <Trash2 size={16} aria-hidden="true" />
                            )}
                            {pending ? "Deleting…" : "Delete selected"}
                        </Button>

                        <DeployStatus result={state} />
                    </form>
                )}

                {report.unmanaged.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-line pt-4">
                        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-muted">
                            <CircleSlash size={15} aria-hidden="true" className="shrink-0" />
                            Unreferenced, and not this console&rsquo;s to delete
                        </h3>
                        <p className="text-xs leading-relaxed text-ink-muted">
                            These do not match the <code className="font-mono">slug-index.ext</code>{" "}
                            filename the uploader produces, so they were put here by hand and are
                            left strictly alone. No checkbox is offered — deleting a file this
                            console did not write is not a decision it should make on your behalf.
                        </p>
                        <ul className="flex flex-col gap-1">
                            {report.unmanaged.map((path) => (
                                <li key={path} className="font-mono text-xs break-all text-ink">
                                    {path}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Card>
        </section>
    );
}
