import { CircleCheck, ExternalLink, GitCommitHorizontal, TriangleAlert } from "lucide-react";
import type { ActionResult } from "@/types/admin";
import { cn } from "@/lib/utils";

/**
 * The result banner for every admin action (docs/admin-plan.md §6.4).
 *
 * On success it must not say "Saved." A save here is a commit plus a Vercel
 * build — roughly a minute before the public site reflects it — and a console
 * that reports the write as instant teaches its operator to refresh the live
 * site, see the old content, and distrust the tool. So it says what actually
 * happened and links the commit, which doubles as the audit record.
 *
 * It polls nothing. A real build-status indicator needs a Vercel API token for
 * the deployment list filtered by sha; that is optional scope, and the commit
 * link is already enough to answer "did it land".
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
                    <p className="mt-2 text-xs text-ink-muted">
                        Vercel is building. The public site updates in about a minute — this page
                        already shows the new data.
                    </p>
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
