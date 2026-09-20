"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A repeatable list of *structured* entries — a whole experience row, a whole
 * skill — as opposed to `ListField`, which repeats a single text value.
 *
 * The two could not be one component. `ListField` owns its inputs because a row
 * is one string; here a row is a dozen fields of four different kinds, so the
 * caller renders them and this owns only what it must: how many rows there are,
 * what order they are in, and the hidden `row` input that makes both of those
 * survive the post.
 *
 * **The `row` input is the whole mechanism.** Each row posts its key once, in
 * DOM order, and every field inside it is named `field:key`. `FormData.getAll`
 * preserves document order, so moving a row up moves its data up and the server
 * needs no index arithmetic to work out which values belong together. See the
 * row-encoding note in `lib/admin/careerForm.ts` for why parallel arrays cannot
 * do this once a row contains a list of its own.
 *
 * Keys are generated, never derived from the entry's `id`: the id is a field the
 * operator is editing, and a key that changed as they typed would remount the
 * row and discard every uncontrolled input in it on each keystroke.
 */
export function EntryList<T>({
    entries,
    blank,
    title,
    subtitle,
    addLabel,
    disabled = false,
    emptyNote,
    children,
}: {
    entries: T[];
    /** A fresh entry for the add button. Called per press, so it may carry today's date. */
    blank: () => T;
    /** The row's heading — usually a job title or a skill name. */
    title: (entry: T, index: number) => string;
    /** Second line of the row heading: a company, a category. */
    subtitle?: (entry: T, index: number) => string;
    addLabel: string;
    disabled?: boolean;
    emptyNote: string;
    /** Renders the row's fields. `name` builds a posted field name for this row. */
    children: (row: {
        entry: T;
        index: number;
        name: (field: string) => string;
        disabled: boolean;
    }) => React.ReactNode;
}) {
    const seed = useId();
    const [rows, setRows] = useState(() =>
        entries.map((entry, index) => ({ key: `${seed}-${index}`, entry })),
    );
    const [nextKey, setNextKey] = useState(entries.length);

    function add() {
        setRows((current) => [...current, { key: `${seed}-new-${nextKey}`, entry: blank() }]);
        setNextKey((n) => n + 1);
    }

    function remove(key: string) {
        setRows((current) => current.filter((row) => row.key !== key));
    }

    function move(index: number, delta: number) {
        setRows((current) => {
            const target = index + delta;

            if (target < 0 || target >= current.length) {
                return current;
            }

            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];

            return next;
        });
    }

    return (
        <div className="flex flex-col gap-3">
            {rows.length === 0 ? (
                <p className="rounded-sm border border-dashed border-line px-4 py-5 text-sm text-ink-muted">
                    {emptyNote}
                </p>
            ) : (
                <ol className="flex flex-col gap-3">
                    {rows.map((row, index) => (
                        <li
                            key={row.key}
                            className="rounded-lg border border-line bg-surface-alt/40 p-4"
                        >
                            {/*
                             * The row's identity on the wire. Rendered first so a
                             * truncated or aborted post can never carry a field
                             * whose row was not declared.
                             */}
                            <input type="hidden" name="row" value={row.key} readOnly />

                            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                                <div className="min-w-0">
                                    <p className="font-display text-sm font-medium text-ink">
                                        {title(row.entry, index) || `Entry ${index + 1}`}
                                    </p>
                                    {subtitle && (
                                        <p className="mt-0.5 text-xs text-ink-muted">
                                            {subtitle(row.entry, index)}
                                        </p>
                                    )}
                                </div>

                                <div className="flex shrink-0 gap-0.5">
                                    <RowButton
                                        label={`Move ${title(row.entry, index) || `entry ${index + 1}`} up`}
                                        onClick={() => move(index, -1)}
                                        disabled={disabled || index === 0}
                                        icon={ChevronUp}
                                    />
                                    <RowButton
                                        label={`Move ${title(row.entry, index) || `entry ${index + 1}`} down`}
                                        onClick={() => move(index, 1)}
                                        disabled={disabled || index === rows.length - 1}
                                        icon={ChevronDown}
                                    />
                                    <RowButton
                                        label={`Remove ${title(row.entry, index) || `entry ${index + 1}`}`}
                                        onClick={() => remove(row.key)}
                                        disabled={disabled}
                                        icon={Trash2}
                                        danger
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                {children({
                                    entry: row.entry,
                                    index,
                                    name: (field) => `${field}:${row.key}`,
                                    disabled,
                                })}
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <button
                type="button"
                onClick={add}
                disabled={disabled}
                className="bp-focus inline-flex w-fit items-center gap-1.5 rounded-sm border border-line-ui px-3 py-2 text-xs font-medium text-ink-muted transition-colors duration-fast ease-bp hover:border-accent hover:text-accent disabled:opacity-40"
            >
                <Plus size={14} aria-hidden="true" />
                {addLabel}
            </button>
        </div>
    );
}

function RowButton({
    label,
    onClick,
    disabled = false,
    danger = false,
    icon: Icon,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    icon: React.ComponentType<{ size?: number; "aria-hidden"?: "true" }>;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            /* The accessible name is the only name — the glyph is decorative. */
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
