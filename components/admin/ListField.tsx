"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { controlStyles } from "@/components/admin/Field";
import { cn } from "@/lib/utils";

/**
 * A repeatable list of text values — `technologies`, `keyFeatures`,
 * `disclaimers`, `challenges`, `lessonsLearned`, `futureImprovements`,
 * `screenshots`.
 *
 * Every row posts under the same `name`, so the Server Action reads the list
 * with `formData.getAll(name)` and the DOM order *is* the array order. That is
 * why reordering is real state here rather than an index field: `getAll`
 * preserves document order, so moving a row up moves the value up.
 *
 * Why this and not a comma-separated textarea: the data model is arrays, and
 * every one of these fields routinely contains commas, em dashes and quoted
 * phrases. A separator the user has to avoid is a serialization the user has to
 * get right, and the first `keyFeatures` entry in data/projects.ts would break
 * it. The cost is a client component; the alternative is silent data loss.
 *
 * Empty rows are dropped server-side rather than blocked here, so adding a row
 * and changing your mind is not an error state.
 */
export function ListField({
    name,
    label,
    hint,
    values,
    placeholder,
    multiline = false,
    mono = false,
    disabled = false,
}: {
    name: string;
    label: string;
    hint?: string;
    /** Initial rows. An empty array renders the empty state and one starter row is added on demand. */
    values: string[];
    placeholder?: string;
    /** Textareas rather than inputs, for the prose lists (features, disclaimers, challenges). */
    multiline?: boolean;
    mono?: boolean;
    disabled?: boolean;
}) {
    /*
     * Rows carry a generated key rather than using the array index. An index key
     * makes React reuse the wrong DOM node when a row is removed from the middle
     * — the removed row's text appears to jump into its neighbour, and an
     * uncontrolled input keeps the stale value because its `defaultValue` no
     * longer re-runs.
     */
    const seed = useId();
    const [rows, setRows] = useState(() =>
        values.map((value, index) => ({ key: `${seed}-${index}`, value })),
    );
    const [nextKey, setNextKey] = useState(values.length);

    const hintId = `${name}-hint`;

    function add() {
        setRows((current) => [...current, { key: `${seed}-new-${nextKey}`, value: "" }]);
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
        <fieldset className="flex min-w-0 flex-col gap-2" disabled={disabled}>
            <legend className="text-sm font-medium text-ink">
                {label}
                <span className="ml-2 font-mono text-xs font-normal text-ink-muted">
                    {rows.length} {rows.length === 1 ? "entry" : "entries"}
                </span>
            </legend>

            {hint && (
                <p id={hintId} className="text-xs leading-relaxed text-ink-muted">
                    {hint}
                </p>
            )}

            {rows.length === 0 ? (
                <p className="rounded-sm border border-dashed border-line px-3 py-3 text-xs text-ink-muted">
                    Empty — this field is omitted from the saved file entirely.
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {rows.map((row, index) => (
                        <li key={row.key} className="flex items-start gap-1.5">
                            {multiline ? (
                                <textarea
                                    name={name}
                                    rows={2}
                                    defaultValue={row.value}
                                    placeholder={placeholder}
                                    aria-label={`${label}, entry ${index + 1}`}
                                    aria-describedby={hint ? hintId : undefined}
                                    className={cn(controlStyles, "resize-y", mono && "font-mono")}
                                />
                            ) : (
                                <input
                                    name={name}
                                    type="text"
                                    defaultValue={row.value}
                                    placeholder={placeholder}
                                    aria-label={`${label}, entry ${index + 1}`}
                                    aria-describedby={hint ? hintId : undefined}
                                    className={cn(controlStyles, mono && "font-mono")}
                                />
                            )}

                            <div className="flex shrink-0 gap-0.5 pt-1">
                                <RowButton
                                    label={`Move ${label} entry ${index + 1} up`}
                                    onClick={() => move(index, -1)}
                                    disabled={index === 0}
                                    icon={ChevronUp}
                                />
                                <RowButton
                                    label={`Move ${label} entry ${index + 1} down`}
                                    onClick={() => move(index, 1)}
                                    disabled={index === rows.length - 1}
                                    icon={ChevronDown}
                                />
                                <RowButton
                                    label={`Remove ${label} entry ${index + 1}`}
                                    onClick={() => remove(row.key)}
                                    icon={X}
                                    danger
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <button
                type="button"
                onClick={add}
                className="bp-focus mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-sm border border-line-ui px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-fast ease-bp hover:border-accent hover:text-accent"
            >
                <Plus size={13} aria-hidden="true" />
                Add entry
            </button>
        </fieldset>
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
