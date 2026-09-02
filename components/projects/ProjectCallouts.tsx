export interface ProjectCalloutsProps {
    /** Section heading, e.g. "What I built". */
    title: string;
    /** Anchors the section's aria-labelledby to its own heading. */
    headingId: string;
    items: string[];
    /** Optional lead-in above the list. */
    description?: string;
}

/**
 * Numbered blueprint callouts (docs/uiux.md §4.6).
 *
 * Replaces `<ul class="list-disc">`. Each entry is annotated `01`, `02`, … with
 * a hairline leader running from the number to its text, which is the drafting
 * convention the rest of the site is drawn in — and, unlike a bullet, gives the
 * reader a handle to refer to ("the third one").
 *
 * The numbers come from the ordered list itself rather than from generated
 * content, so they are real list semantics and are announced as such; the
 * leader line is the only decorative part and is hidden.
 */
export function ProjectCallouts({ title, headingId, items, description }: ProjectCalloutsProps) {
    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <h2 id={headingId} className="font-display text-h3 font-medium text-ink">
                    {title}
                </h2>
                {description && <p className="text-sm text-ink-muted">{description}</p>}
            </div>

            <ol className="flex flex-col">
                {items.map((item, index) => (
                    <li
                        key={item}
                        className="grid grid-cols-[2.25rem_1fr] items-baseline gap-x-3 border-t border-line py-3 last:border-b"
                    >
                        <span className="bp-meta flex items-center gap-1.5 text-signal">
                            {String(index + 1).padStart(2, "0")}
                            <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
                        </span>
                        <span className="text-sm leading-relaxed text-ink-muted">{item}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
