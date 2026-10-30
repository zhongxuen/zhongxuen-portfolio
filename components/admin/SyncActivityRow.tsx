"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, GitCommitHorizontal, LoaderCircle, Sparkles } from "lucide-react";
import { draftUpdate } from "@/app/(admin)/actions/sync";
import { controlStyles } from "@/components/admin/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AUTHOR } from "@/lib/constants";
import {
    NARRATIVE_FIELDS,
    NARRATIVE_LIST_FIELDS,
    draftFieldName,
    syncEntryId,
    type NarrativeDraft,
    type NarrativeField,
    type SyncActivity,
    type SyncCommit,
} from "@/types/admin";

/**
 * One "New work" entry on the sync page: a repo pushed since its entry's copy was
 * last reviewed.
 *
 * Ticking the row alone marks the entry reviewed (stamps `syncedAt`). "Draft
 * update" asks a model for copy changes from the README and these commits; each
 * proposed field arrives as an editable textarea with its own keep box, and only
 * kept fields are submitted — an unticked field's textarea is disabled, and the
 * browser does not post disabled controls.
 */
export function SyncActivityRow({
    entry,
    commits,
    disabled,
}: {
    entry: SyncActivity;
    commits: SyncCommit[];
    disabled: boolean;
}) {
    const [checked, setChecked] = useState(false);
    const [draft, setDraft] = useState<NarrativeDraft | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const id = syncEntryId(entry);
    const repoUrl = `https://github.com/${AUTHOR.githubUsername}/${entry.githubRepo}`;

    const requestDraft = () => {
        setError(null);

        startTransition(async () => {
            const result = await draftUpdate(entry.slug);

            if (result.status === "success") {
                setDraft(result.draft);
                setChecked(true);
            } else {
                setError(result.message);
            }
        });
    };

    const proposed = draft
        ? NARRATIVE_FIELDS.filter((field) => draft.fields[field] !== undefined)
        : [];

    return (
        <li className="px-4 py-3">
            <div className="flex items-start gap-3">
                <input
                    id={id}
                    type="checkbox"
                    name="entry"
                    value={id}
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                    disabled={disabled}
                    className="bp-focus mt-0.5 size-4 shrink-0 rounded-xs border border-line-ui accent-accent"
                />
                <div className="min-w-0 flex-1">
                    <label htmlFor={id} className="cursor-pointer text-sm font-medium text-ink">
                        {entry.title}
                    </label>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-muted">
                        <span>
                            {entry.since
                                ? `reviewed ${entry.since.slice(0, 10)} · pushed ${entry.pushedAt.slice(0, 10)}`
                                : `never reviewed · pushed ${entry.pushedAt.slice(0, 10)}`}
                        </span>
                        <a
                            href={`${repoUrl}#readme`}
                            target="_blank"
                            rel="noreferrer"
                            className="bp-focus inline-flex items-center gap-1 rounded-sm hover:text-accent"
                        >
                            README <ExternalLink size={11} aria-hidden="true" />
                        </a>
                        <Link
                            href={`/admin/projects/${entry.slug}`}
                            className="bp-focus rounded-sm hover:text-accent"
                        >
                            edit entry
                        </Link>
                    </p>

                    {commits.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1">
                            {commits.map((commit) => (
                                <li
                                    key={commit.sha}
                                    className="flex min-w-0 items-baseline gap-2 text-xs text-ink-muted"
                                >
                                    <GitCommitHorizontal
                                        size={12}
                                        aria-hidden="true"
                                        className="shrink-0 self-center"
                                    />
                                    <span className="shrink-0 font-mono">{commit.date.slice(0, 10)}</span>
                                    <a
                                        href={commit.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bp-focus truncate rounded-sm hover:text-accent"
                                    >
                                        {commit.message}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={requestDraft}
                            disabled={pending || disabled}
                        >
                            {pending ? (
                                <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
                            ) : (
                                <Sparkles size={14} aria-hidden="true" />
                            )}
                            {pending ? "Reading the README…" : draft ? "Redraft" : "Draft update from README"}
                        </Button>
                        {error && (
                            <p role="alert" className="text-xs text-danger">
                                {error}
                            </p>
                        )}
                    </div>

                    {draft && (
                        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-line bg-surface-alt/50 p-3">
                            <p className="text-sm leading-relaxed text-ink">{draft.summary}</p>
                            {proposed.length === 0 ? (
                                <p className="text-xs text-ink-muted">
                                    No copy changes proposed — the entry already matches the repo.
                                    Tick the row to mark it reviewed.
                                </p>
                            ) : (
                                proposed.map((field) => (
                                    <DraftField
                                        key={field}
                                        slug={entry.slug}
                                        field={field}
                                        value={draft.fields[field]!}
                                        disabled={disabled || !checked}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}

/** One proposed field: a keep box and the editable text. Lists are one item per line. */
function DraftField({
    slug,
    field,
    value,
    disabled,
}: {
    slug: string;
    field: NarrativeField;
    value: string | string[];
    disabled: boolean;
}) {
    const [keep, setKeep] = useState(true);
    const name = draftFieldName(slug, field);
    const isList = NARRATIVE_LIST_FIELDS.includes(field);
    const text = Array.isArray(value) ? value.join("\n") : value;

    return (
        <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                    type="checkbox"
                    checked={keep}
                    onChange={(event) => setKeep(event.target.checked)}
                    disabled={disabled}
                    className="bp-focus size-3.5 rounded-xs accent-accent"
                />
                <Badge>{field}</Badge>
                <span className="text-ink-muted">
                    {isList ? "replaces the list · one item per line" : "replaces the text"}
                </span>
            </label>
            <textarea
                name={name}
                aria-label={`${field} for ${slug}`}
                defaultValue={text}
                disabled={disabled || !keep}
                rows={Math.min(14, Math.max(2, Math.ceil(text.length / 110) + (isList ? text.split("\n").length : 0)))}
                className={`${controlStyles} resize-y leading-relaxed`}
            />
        </div>
    );
}
