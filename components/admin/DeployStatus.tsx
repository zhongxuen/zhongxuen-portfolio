"use client";

import { useEffect, useState } from "react";
import {
    CircleCheck,
    CircleSlash,
    ExternalLink,
    GitCommitHorizontal,
    LoaderCircle,
    TriangleAlert,
} from "lucide-react";
import { checkDeployment } from "@/app/(admin)/actions/deploy";
import type { ActionResult, DeployStatusResult } from "@/types/admin";
import { cn } from "@/lib/utils";

/**
 * The result banner for every admin action (docs/admin-plan.md §6.4, §17.4).
 *
 * On success it must not say "Saved." A save here is a commit plus a Vercel
 * build — roughly a minute before the public site reflects it — and a console
 * that reports the write as instant teaches its operator to refresh the live
 * site, see the old content, and distrust the tool. So it says what actually
 * happened and links the commit, which doubles as the audit record.
 *
 * **It now polls**, which reverses the note that used to sit here: "a real
 * build-status indicator needs a Vercel API token… the commit link is already
 * enough to answer 'did it land'". Landing was never the question in doubt — the
 * action returned a sha. The question the banner could not answer was whether
 * the *build* succeeded, and a save that broke the build looked exactly like one
 * that worked: the same green plate, the same "Vercel is building", then
 * silence. The live site would go on serving the previous deploy, so checking it
 * showed no change and read as "not finished yet".
 *
 * Polling is optional and self-limiting. With no `VERCEL_TOKEN` the action
 * answers `"unknown"` on the first call, `DeployProgress` renders the sentence
 * this component used to end on, and no further requests are made.
 *
 * `role="status"` with the wrapper permanently mounted: a live region that
 * appears at the same moment its text does is frequently missed by screen
 * readers, so only the contents change.
 */
export function DeployStatus({ result }: { result: ActionResult }) {
    return (
        <div role="status" aria-live="polite" className="min-w-0">
            {result.status === "success" && (
                <Plate tone="success" icon={CircleCheck}>
                    <p>{result.message}</p>
                    {result.commit && (
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
                                <GitCommitHorizontal size={14} aria-hidden="true" />
                                {result.commit.sha.slice(0, 7)}
                            </span>
                            <a
                                href={result.commit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bp-focus inline-flex items-center gap-1 rounded-sm text-xs font-medium text-accent underline decoration-line-strong underline-offset-4 transition-colors duration-fast ease-bp hover:decoration-accent"
                            >
                                View commit
                                <ExternalLink size={12} aria-hidden="true" />
                            </a>
                        </p>
                    )}

                    {result.commit ? (
                        <DeployProgress sha={result.commit.sha} />
                    ) : (
                        <p className="mt-2 text-xs text-ink-muted">
                            This page already shows the new data.
                        </p>
                    )}
                </Plate>
            )}

            {result.status === "conflict" && (
                <Plate tone="signal" icon={TriangleAlert}>
                    <p>{result.message}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                        Nothing was written. Reload this page to pick up the newer version, then
                        redo your change — saving over it would discard whatever the other edit
                        added.
                    </p>
                </Plate>
            )}

            {result.status === "error" && (
                <Plate tone="danger" icon={TriangleAlert}>
                    {result.message}
                </Plate>
            )}
        </div>
    );
}

/**
 * Follows one commit's build to a conclusion.
 *
 * **Stops on its own, three ways**, because a poll loop in a console someone
 * leaves open in a background tab is a slow request leak: it stops at a terminal
 * state, it stops after `MAX_POLLS`, and it stops immediately if the first
 * answer is `"unknown"` — no token configured, or the API is unreachable, and
 * either way no amount of waiting produces an answer.
 *
 * The interval widens rather than staying flat. A build for this project takes
 * about a minute, so a fixed three-second poll would spend twenty requests
 * learning nothing; backing off keeps the first "it failed" fast without making
 * the twentieth cost anything.
 */
const MAX_POLLS = 40;

function DeployProgress({ sha }: { sha: string }) {
    const [status, setStatus] = useState<DeployStatusResult>({ state: "pending" });

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        let polls = 0;

        async function poll() {
            let next: DeployStatusResult;

            try {
                next = await checkDeployment(sha);
            } catch {
                /*
                 * A failed poll is not a failed deploy and must never be shown as
                 * one. Stop quietly; the banner keeps saying what it already knows.
                 */
                if (!cancelled) {
                    setStatus({ state: "unknown" });
                }

                return;
            }

            if (cancelled) {
                return;
            }

            setStatus(next);
            polls += 1;

            const done =
                next.state === "ready" ||
                next.state === "error" ||
                next.state === "canceled" ||
                next.state === "unknown";

            if (done || polls >= MAX_POLLS) {
                return;
            }

            timer = setTimeout(poll, Math.min(3000 + polls * 750, 12000));
        }

        /*
         * A short head start: GitHub has to notify Vercel and Vercel has to
         * create the deployment, so polling instantly would spend the first
         * request guaranteeing a "pending".
         */
        timer = setTimeout(poll, 2500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [sha]);

    if (status.state === "unknown") {
        return (
            <p className="mt-2 text-xs text-ink-muted">
                Vercel is building. The public site updates in about a minute — this page already
                shows the new data. Set <code className="font-mono">VERCEL_TOKEN</code> and{" "}
                <code className="font-mono">VERCEL_PROJECT_ID</code> to see the build&rsquo;s real
                outcome here.
            </p>
        );
    }

    if (status.state === "ready") {
        return (
            <p className="mt-2 flex items-center gap-2 text-xs text-success">
                <CircleCheck size={13} aria-hidden="true" className="shrink-0" />
                Build succeeded — the public site is serving this change now.
            </p>
        );
    }

    if (status.state === "error" || status.state === "canceled") {
        return (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-danger">
                <TriangleAlert size={13} aria-hidden="true" className="shrink-0" />
                {status.state === "error"
                    ? "The build failed. The commit is on main, but the live site is still serving the previous deploy."
                    : "The build was canceled. The live site is still serving the previous deploy."}
                {status.inspectorUrl && (
                    <a
                        href={status.inspectorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bp-focus inline-flex items-center gap-1 rounded-sm font-medium underline decoration-line-strong underline-offset-4 hover:decoration-current"
                    >
                        Build log
                        <ExternalLink size={11} aria-hidden="true" />
                    </a>
                )}
            </p>
        );
    }

    return (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
            {status.state === "pending" ? (
                <CircleSlash size={13} aria-hidden="true" className="shrink-0 opacity-60" />
            ) : (
                <LoaderCircle size={13} aria-hidden="true" className="shrink-0 animate-spin" />
            )}
            {status.state === "pending"
                ? "Waiting for Vercel to pick up the commit…"
                : "Vercel is building. This line updates when it finishes."}
        </p>
    );
}

const toneStyles = {
    success: "border-success/40 bg-success/10",
    danger: "border-danger/40 bg-danger/10",
    signal: "border-signal/40 bg-signal/10",
} as const;

const iconTone = {
    success: "text-success",
    danger: "text-danger",
    signal: "text-signal",
} as const;

/** Result plate. The icon is decorative — the wording alone carries the outcome. */
function Plate({
    tone,
    icon: Icon,
    children,
}: {
    tone: keyof typeof toneStyles;
    icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: "true" }>;
    children: React.ReactNode;
}) {
    return (
        <div className={cn("flex items-start gap-3 rounded-sm border p-3.5", toneStyles[tone])}>
            <Icon size={17} aria-hidden="true" className={cn("mt-0.5 shrink-0", iconTone[tone])} />
            <div className="min-w-0 text-sm leading-relaxed text-ink">{children}</div>
        </div>
    );
}
