"use client";

import { useActionState, useId, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, LoaderCircle, Plus, Save, X } from "lucide-react";
import { bumpLastModified, saveAvailability, saveNow } from "@/app/(admin)/actions/settings";
import { CheckboxField, Field, controlStyles } from "@/components/admin/Field";
import { DeployStatus } from "@/components/admin/DeployStatus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IDLE_ACTION } from "@/types/admin";
import type { NowEntry } from "@/types/now";
import { cn } from "@/lib/utils";

/**
 * The three settings panels (docs/admin-plan.md §7.6).
 *
 * One file, three exported components, because each is a small form over one
 * action and splitting them across three files would be three imports to say the
 * same thing. Each owns its own `useActionState` so one panel's result never
 * replaces another's.
 */

export function AvailabilityPanel({
    open,
    label,
    canWrite,
}: {
    open: boolean;
    label: string;
    canWrite: boolean;
}) {
    const [state, action, pending] = useActionState(saveAvailability, IDLE_ACTION);

    return (
        <Panel
            title="Availability"
            note="The navbar pill and the footer both read this. Off is the honest setting while the internship in data/experience.ts is running — a pill claiming availability two screens above a current role contradicts itself."
        >
            <form action={action} className="flex flex-col gap-4">
                <CheckboxField
                    name="open"
                    label="Open to opportunities"
                    defaultChecked={open}
                    disabled={pending || !canWrite}
                    hint="Unchecked, every surface that reads it stops claiming availability."
                />

                <Field
                    name="label"
                    label="Pill label"
                    required
                    maxLength={60}
                    defaultValue={label}
                    disabled={pending || !canWrite}
                    hint="Shown only while the switch above is on."
                />

                <Submit pending={pending} disabled={!canWrite} note="commits lib/constants.ts" />
            </form>

            <DeployStatus result={state} />
        </Panel>
    );
}

export function LastModifiedPanel({
    current,
    today,
    canWrite,
}: {
    current: string;
    /** Resolved on the server so the button's date is the deployment's, not the browser's timezone's. */
    today: string;
    canWrite: boolean;
}) {
    const [state, action, pending] = useActionState(bumpLastModified, IDLE_ACTION);

    return (
        <Panel
            title="Sitemap last-modified"
            note="app/sitemap.ts publishes this for the home and /projects pages. It is a constant rather than new Date() on purpose — a timestamp that says “modified today” on every build misleads crawlers — which is exactly why it needs a human, and why that human gets a button."
        >
            <form action={action} className="flex flex-col gap-4">
                <Field
                    name="date"
                    label="Date"
                    type="date"
                    mono
                    required
                    defaultValue={current}
                    disabled={pending || !canWrite}
                    hint={`Currently ${current}. Today is ${today}.`}
                />

                <Submit
                    pending={pending}
                    disabled={!canWrite}
                    note="commits lib/constants.ts"
                    icon={CalendarClock}
                    label="Save date"
                />
            </form>

            <DeployStatus result={state} />
        </Panel>
    );
}

export function NowPanel({ entries, canWrite }: { entries: NowEntry[]; canWrite: boolean }) {
    const [state, action, pending] = useActionState(saveNow, IDLE_ACTION);

    const seed = useId();
    const [rows, setRows] = useState(() =>
        entries.map((entry, index) => ({ key: `${seed}-${index}`, entry })),
    );
    const [nextKey, setNextKey] = useState(entries.length);

    const disabled = pending || !canWrite;

    function add() {
        setRows((current) => [
            ...current,
            {
                key: `${seed}-new-${nextKey}`,
                entry: {
                    id: "",
                    label: "",
                    detail: "",
                    since: new Date().toISOString().slice(0, 10),
                },
            },
        ]);
        setNextKey((n) => n + 1);
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
        <Panel
            title="NOW block"
            note="The About section's “what I'm doing now” list, in render order. Every line should trace to something else in the repo — the internship to data/experience.ts, the diploma to data/education.ts. Nothing aspirational: “learning Rust” with no Rust in data/projects.ts is the first claim a technical reader checks. An entry that has ended is a deletion, not an edit."
        >
            <form action={action} className="flex flex-col gap-4">
                <ul className="flex flex-col gap-4">
                    {rows.map((row, index) => (
                        <li
                            key={row.key}
                            className="flex flex-col gap-3 rounded-sm border border-line bg-surface-alt p-3.5"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-xs text-ink-muted">
                                    entry {index + 1}
                                </span>
                                <div className="flex gap-0.5">
                                    <RowButton
                                        label={`Move entry ${index + 1} up`}
                                        icon={ChevronUp}
                                        onClick={() => move(index, -1)}
                                        disabled={index === 0 || disabled}
                                    />
                                    <RowButton
                                        label={`Move entry ${index + 1} down`}
                                        icon={ChevronDown}
                                        onClick={() => move(index, 1)}
                                        disabled={index === rows.length - 1 || disabled}
                                    />
                                    <RowButton
                                        label={`Remove entry ${index + 1}`}
                                        icon={X}
                                        danger
                                        onClick={() =>
                                            setRows((current) =>
                                                current.filter((item) => item.key !== row.key),
                                            )
                                        }
                                        disabled={disabled}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <LabelledInput
                                    name="id"
                                    label="Id"
                                    mono
                                    defaultValue={row.entry.id}
                                    disabled={disabled}
                                    index={index}
                                />
                                <LabelledInput
                                    name="label"
                                    label="Verb"
                                    defaultValue={row.entry.label}
                                    disabled={disabled}
                                    index={index}
                                />
                                <LabelledInput
                                    name="since"
                                    label="Since"
                                    type="date"
                                    mono
                                    defaultValue={row.entry.since}
                                    disabled={disabled}
                                    index={index}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label
                                    htmlFor={`${row.key}-detail`}
                                    className="text-xs font-medium text-ink-muted"
                                >
                                    Detail
                                </label>
                                <textarea
                                    id={`${row.key}-detail`}
                                    name="detail"
                                    rows={2}
                                    defaultValue={row.entry.detail}
                                    disabled={disabled}
                                    className={cn(controlStyles, "resize-y")}
                                />
                            </div>
                        </li>
                    ))}
                </ul>

                <button
                    type="button"
                    onClick={add}
                    disabled={disabled}
                    className="bp-focus inline-flex w-fit items-center gap-1.5 rounded-sm border border-line-ui px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-fast ease-bp hover:border-accent hover:text-accent disabled:opacity-40"
                >
                    <Plus size={13} aria-hidden="true" />
                    Add entry
                </button>

                <Submit pending={pending} disabled={!canWrite} note="commits data/now.ts" />
            </form>

            <DeployStatus result={state} />
        </Panel>
    );
}

function Panel({
    title,
    note,
    children,
}: {
    title: string;
    note: string;
    children: React.ReactNode;
}) {
    return (
        <Card plain className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
                <h2 className="bp-meta text-ink-muted">{title}</h2>
                <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">{note}</p>
            </div>
            {children}
        </Card>
    );
}

function Submit({
    pending,
    disabled,
    note,
    label = "Save",
    icon: Icon = Save,
}: {
    pending: boolean;
    disabled: boolean;
    note: string;
    label?: string;
    icon?: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: "true" }>;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" size="sm" disabled={pending || disabled}>
                {pending ? (
                    <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />
                ) : (
                    <Icon size={15} aria-hidden="true" />
                )}
                {pending ? "Committing…" : label}
            </Button>
            <p className="font-mono text-xs text-ink-muted">{note}</p>
        </div>
    );
}

/**
 * A compact labelled input for the NOW rows.
 *
 * Its `id` is per-row so the label points at the right control, but its `name` is
 * shared across rows — the action reads the four fields with `getAll` and zips
 * them by index, which is why the row order in the DOM is the order that gets
 * committed.
 */
function LabelledInput({
    name,
    label,
    index,
    defaultValue,
    disabled,
    type = "text",
    mono = false,
}: {
    name: string;
    label: string;
    index: number;
    defaultValue: string;
    disabled: boolean;
    type?: string;
    mono?: boolean;
}) {
    const id = `now-${index}-${name}`;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-medium text-ink-muted">
                {label}
            </label>
            <input
                id={id}
                name={name}
                type={type}
                defaultValue={defaultValue}
                disabled={disabled}
                className={cn(controlStyles, mono && "font-mono")}
            />
        </div>
    );
}

function RowButton({
    label,
    icon: Icon,
    onClick,
    disabled,
    danger = false,
}: {
    label: string;
    icon: React.ComponentType<{ size?: number; "aria-hidden"?: "true" }>;
    onClick: () => void;
    disabled: boolean;
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
