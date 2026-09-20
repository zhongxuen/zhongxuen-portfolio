"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, GitPullRequestArrow, LoaderCircle, Unlink } from "lucide-react";
import { applySync } from "@/app/(admin)/actions/sync";
import { DeployStatus } from "@/components/admin/DeployStatus";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IDLE_ACTION, syncEntryId, type SyncPlan } from "@/types/admin";

/**
 * The GitHub sync review step (docs/admin-plan.md §7.4).
 *
 * The whole point of this component is that nothing is applied without being
 * looked at. It posts only the ticked entry ids — the action re-fetches the repos
 * and rebuilds the plan itself, because a posted plan would be a client-supplied
 * instruction to write arbitrary fields.
 *
 * Default selection: changes on, additions off. A change is a fact GitHub knows
 * better than the file does; an addition arrives with a machine-written
 * description that wants rewriting first, so it is off until the operator has read
 * it. Orphans have no checkbox at all — they are a flag, never an action.
 */
export function DiffTable({ plan, canWrite }: { plan: SyncPlan; canWrite: boolean }) {
    const [state, formAction, pending] = useActionState(applySync, IDLE_ACTION);
    const actionable = plan.added.length + plan.changed.length;

    return (
        <div className="flex flex-col gap-6">
            {actionable === 0 ? (
                <Card plain className="p-5">
                    <p className="text-sm text-ink-muted">
                        Nothing to apply — every repository already has an entry, and every
                        entry&rsquo;s links agree with its repository.
                    </p>
                </Card>
            ) : (
                <form action={formAction} className="flex flex-col gap-6">
                    {plan.changed.length > 0 && (
                        <Group
                            title="Changed"
                            note="Fields where the repository and data/projects.ts disagree. Pre-selected: GitHub knows its own links better than the file does."
                        >
                            {plan.changed.map((change) => {
                                const id = syncEntryId(change);

                                return (
                                    <Row key={id} id={id} defaultChecked disabled={!canWrite}>
                                        <p className="text-sm font-medium text-ink">
                                            {change.title}
                                        </p>
                                        <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs">
                                            <Badge>{change.field}</Badge>
                                            <span className="text-ink-muted line-through decoration-danger/60">
                                                {change.current ?? "not set"}
                                            </span>
                                            <ArrowRight
                                                size={12}
                                                aria-hidden="true"
                                                className="text-ink-muted"
                                            />
                                            <span className="text-accent">{change.proposed}</span>
                                        </p>
                                    </Row>
                                );
                            })}
                        </Group>
                    )}

                    {plan.added.length > 0 && (
                        <Group
                            title="Unlisted repositories"
                            note="Repos with no entry. Off by default — the description below is the repo's own one-liner, not case-study copy, so read it before you publish it."
                        >
                            {plan.added.map((addition) => {
                                const id = syncEntryId(addition);

                                return (
                                    <Row key={id} id={id} disabled={!canWrite}>
                                        <p className="text-sm font-medium text-ink">
                                            {addition.title}
                                        </p>
                                        <p className="mt-0.5 font-mono text-xs text-ink-muted">
                                            /projects/{addition.slug}
                                        </p>
                                        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                                            {addition.description}
                                        </p>
                                        {addition.technologies.length > 0 && (
                                            <ul className="mt-2 flex flex-wrap gap-1.5">
                                                {addition.technologies.map((technology) => (
                                                    <li key={technology}>
                                                        <Badge>{technology}</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </Row>
                                );
                            })}
                        </Group>
                    )}

                    <div className="sticky bottom-0 z-sticky -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-void/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
                        <p className="font-mono text-xs text-ink-muted">commits data/projects.ts</p>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={pending || !canWrite}
                        >
                            {pending ? (
                                <LoaderCircle
                                    size={16}
                                    aria-hidden="true"
                                    className="animate-spin"
                                />
                            ) : (
                                <GitPullRequestArrow size={16} aria-hidden="true" />
                            )}
                            {pending ? "Committing…" : "Apply selected"}
                        </Button>
                    </div>
                </form>
            )}

            <DeployStatus result={state} />

            {plan.orphaned.length > 0 && (
                <Group
                    title="Orphaned"
                    note="These entries name a repository that no longer resolves — renamed, made private, or deleted. Flagged, never removed automatically: a repo that is private for an afternoon is not a project that stopped existing."
                >
                    {plan.orphaned.map((orphan) => (
                        <li
                            key={orphan.slug}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
                        >
                            <Unlink size={15} aria-hidden="true" className="shrink-0 text-signal" />
                            <Link
                                href={`/admin/projects/${orphan.slug}`}
                                className="bp-focus rounded-sm text-sm font-medium text-ink hover:text-accent"
                            >
                                {orphan.title}
                            </Link>
                            <code className="font-mono text-xs text-ink-muted">
                                githubRepo: {orphan.githubRepo}
                            </code>
                        </li>
                    ))}
                </Group>
            )}
        </div>
    );
}

function Group({
    title,
    note,
    children,
}: {
    title: string;
    note: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2.5">
            <h2 className="bp-meta text-ink-muted">{title}</h2>
            <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">{note}</p>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {children}
            </ul>
        </section>
    );
}

/**
 * One reviewable entry.
 *
 * The whole row is the label, so the click target is the row rather than a 16px
 * box — and the checkbox still carries the accessible name, because the label
 * wraps it.
 */
function Row({
    id,
    defaultChecked = false,
    disabled,
    children,
}: {
    id: string;
    defaultChecked?: boolean;
    disabled: boolean;
    children: React.ReactNode;
}) {
    return (
        <li>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors duration-fast ease-bp hover:bg-surface-alt has-disabled:cursor-default has-disabled:hover:bg-transparent">
                <input
                    type="checkbox"
                    name="entry"
                    value={id}
                    defaultChecked={defaultChecked}
                    disabled={disabled}
                    className="bp-focus mt-0.5 size-4 shrink-0 rounded-xs border border-line-ui accent-accent"
                />
                <span className="min-w-0 flex-1">{children}</span>
            </label>
        </li>
    );
}
