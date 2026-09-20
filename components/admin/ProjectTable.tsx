"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
    ChevronDown,
    ChevronUp,
    CircleCheck,
    LoaderCircle,
    Pencil,
    Trash2,
    TriangleAlert,
} from "lucide-react";
import { deleteProject, reorderProjects } from "@/app/(admin)/actions/projects";
import { DeployStatus } from "@/components/admin/DeployStatus";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IDLE_ACTION } from "@/types/admin";
import { cn } from "@/lib/utils";

/**
 * The project list (docs/admin-plan.md §7.2): order, title, slug, featured flag,
 * repo match state, and per-row edit and delete.
 *
 * One client component rather than a server table plus islands, because the two
 * interactive behaviours both need local state and both need to avoid nested
 * forms:
 *
 *  - **Reorder** is a `<form>` around the table holding one hidden `slug` input
 *    per row in the current order. Moving a row is state, so the posted sequence
 *    is the DOM order, and the action rewrites `order` across the whole list in
 *    one commit.
 *  - **Delete** cannot be a form inside that form. So a row's Delete button only
 *    selects the row; the confirmation — with its own `<form>` and its own
 *    submit — renders below the table, outside the reorder form. That also gives
 *    the two-step confirm somewhere to explain what deleting actually does.
 */
export interface ProjectRow {
    slug: string;
    title: string;
    featured: boolean;
    order?: number;
    /**
     * Whether `githubRepo` resolved against the live repo list.
     * `"none"` means the project has no repo configured, which is fine and not a
     * warning — three entries are coursework with no public repo.
     */
    repo: "matched" | "missing" | "none";
    screenshots: number;
}

export function ProjectTable({ rows, canWrite }: { rows: ProjectRow[]; canWrite: boolean }) {
    const [order, setOrder] = useState(() => rows.map((row) => row.slug));
    const [dirty, setDirty] = useState(false);
    const [confirming, setConfirming] = useState<string | null>(null);

    const [reorderState, reorderAction, reordering] = useActionState(reorderProjects, IDLE_ACTION);
    const [deleteState, deleteAction, deleting] = useActionState(deleteProject, IDLE_ACTION);

    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    const ordered = order.map((slug) => bySlug.get(slug)!).filter(Boolean);
    const confirmingRow = confirming ? bySlug.get(confirming) : undefined;

    function move(index: number, delta: number) {
        const target = index + delta;

        if (target < 0 || target >= order.length) {
            return;
        }

        const next = [...order];
        [next[index], next[target]] = [next[target], next[index]];

        setOrder(next);
        setDirty(true);
    }

    return (
        <div className="flex flex-col gap-4">
            <form action={reorderAction} className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-xl border border-line bg-surface">
                    <ul className="divide-y divide-line">
                        {ordered.map((row, index) => (
                            <li
                                key={row.slug}
                                className={cn(
                                    "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3",
                                    confirming === row.slug && "bg-danger/8",
                                )}
                            >
                                {/* The posted sequence. Order here is order there. */}
                                <input type="hidden" name="slug" value={row.slug} />

                                <span className="w-6 shrink-0 font-mono text-xs text-ink-muted">
                                    {String(index + 1).padStart(2, "0")}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={`/admin/projects/${row.slug}`}
                                        className="bp-focus rounded-sm text-sm font-medium text-ink transition-colors duration-fast ease-bp hover:text-accent"
                                    >
                                        {row.title}
                                    </Link>
                                    <p className="mt-0.5 font-mono text-xs text-ink-muted">
                                        /projects/{row.slug}
                                    </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                    {row.featured && <Badge variant="outline">Featured</Badge>}
                                    {row.screenshots > 0 && (
                                        <Badge>
                                            {row.screenshots} shot
                                            {row.screenshots === 1 ? "" : "s"}
                                        </Badge>
                                    )}
                                    <RepoState state={row.repo} />
                                </div>

                                <div className="flex shrink-0 items-center gap-0.5">
                                    <IconButton
                                        label={`Move ${row.title} up`}
                                        icon={ChevronUp}
                                        onClick={() => move(index, -1)}
                                        disabled={index === 0 || !canWrite}
                                    />
                                    <IconButton
                                        label={`Move ${row.title} down`}
                                        icon={ChevronDown}
                                        onClick={() => move(index, 1)}
                                        disabled={index === ordered.length - 1 || !canWrite}
                                    />
                                    <Link
                                        href={`/admin/projects/${row.slug}`}
                                        aria-label={`Edit ${row.title}`}
                                        title={`Edit ${row.title}`}
                                        className="bp-focus inline-flex size-7 items-center justify-center rounded-sm text-ink-muted transition-colors duration-fast ease-bp hover:text-accent"
                                    >
                                        <Pencil size={14} aria-hidden="true" />
                                    </Link>
                                    <IconButton
                                        label={`Delete ${row.title}`}
                                        icon={Trash2}
                                        danger
                                        onClick={() => setConfirming(row.slug)}
                                        disabled={!canWrite}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={!dirty || reordering || !canWrite}
                    >
                        {reordering && (
                            <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />
                        )}
                        {reordering ? "Committing…" : "Save order"}
                    </Button>

                    <p className="font-mono text-xs text-ink-muted">
                        {dirty
                            ? "Unsaved order — one commit rewrites `order` across every entry."
                            : "Order matches the repository."}
                    </p>
                </div>
            </form>

            <DeployStatus result={reorderState} />

            {/*
             * Outside the reorder form on purpose — a form cannot contain a form.
             * Rendered only while a row is selected, so the destructive control is
             * never one stray click away.
             */}
            {confirmingRow && (
                <form
                    action={deleteAction}
                    className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/8 p-4"
                >
                    <input type="hidden" name="slug" value={confirmingRow.slug} />

                    <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
                        <TriangleAlert
                            size={17}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-danger"
                        />
                        <span>
                            Remove <strong>{confirmingRow.title}</strong>? Its slug is a live URL —{" "}
                            <code className="font-mono text-xs">
                                /projects/{confirmingRow.slug}
                            </code>{" "}
                            becomes a 404 and drops out of the sitemap once the deploy finishes. The
                            GitHub repository is not touched, and the screenshots stay in the
                            repository so <code className="font-mono text-xs">git revert</code> puts
                            everything back.
                        </span>
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" variant="primary" size="sm" disabled={deleting}>
                            {deleting ? (
                                <LoaderCircle
                                    size={15}
                                    aria-hidden="true"
                                    className="animate-spin"
                                />
                            ) : (
                                <Trash2 size={15} aria-hidden="true" />
                            )}
                            {deleting ? "Committing…" : "Yes, remove it"}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirming(null)}
                            disabled={deleting}
                        >
                            Keep it
                        </Button>
                    </div>
                </form>
            )}

            <DeployStatus result={deleteState} />
        </div>
    );
}

/**
 * Repo match state. Colour is never the only carrier — each state has its own
 * word, so the row still reads in greyscale and to a screen reader.
 */
function RepoState({ state }: { state: ProjectRow["repo"] }) {
    if (state === "matched") {
        return (
            <Badge variant="success" className="gap-1">
                <CircleCheck size={11} aria-hidden="true" />
                repo
            </Badge>
        );
    }

    if (state === "missing") {
        return (
            <Badge variant="signal" className="gap-1">
                <TriangleAlert size={11} aria-hidden="true" />
                repo not found
            </Badge>
        );
    }

    return <Badge className="text-ink-muted">no repo</Badge>;
}

function IconButton({
    label,
    icon: Icon,
    onClick,
    disabled = false,
    danger = false,
}: {
    label: string;
    icon: React.ComponentType<{ size?: number; "aria-hidden"?: "true" }>;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={cn(
                "bp-focus inline-flex size-7 items-center justify-center rounded-sm text-ink-muted transition-colors duration-fast ease-bp disabled:opacity-30",
                danger ? "hover:text-danger" : "hover:text-accent",
            )}
        >
            <Icon size={14} aria-hidden="true" />
        </button>
    );
}
