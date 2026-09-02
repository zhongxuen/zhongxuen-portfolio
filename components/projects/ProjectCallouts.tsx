import { Reveal } from "@/components/motion/Reveal";
import { revealDelay, stagger } from "@/lib/reveal";

/**
 * Beat between a callout row arriving and its leader line drawing out of the
 * number. Mirrors the marker -> rule offset in `HEADING_DELAY`, so a leader
 * extends on the same lag everywhere the site draws one.
 */
const LEADER_LAG = 40;

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
 *
 * Entrance: the rows cascade in on the shared `[data-reveal]` choreography and
 * each leader *draws* rather than fades, on the `rule` variant that the section
 * markers and the "Now" plate already use. This is the one place on a case
 * study where the same component repeats up to four times down the page, so the
 * cadence matters more than usual — a block of rows appearing all at once, in
 * the middle of a page where every neighbouring band is staggered, was the one
 * part of the article that read as unstyled.
 *
 * Still a Server Component in every practical sense: `Reveal` is the only thing
 * that crosses the client boundary, and the rows themselves stay in the server
 * payload.
 */
export function ProjectCallouts({ title, headingId, items, description }: ProjectCalloutsProps) {
    return (
        <Reveal as="section" aria-labelledby={headingId} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <h2
                    id={headingId}
                    data-reveal="up"
                    className="font-display text-h3 font-medium text-ink"
                >
                    {title}
                </h2>
                {description && (
                    <p
                        data-reveal="up"
                        style={revealDelay(LEADER_LAG)}
                        className="text-sm text-ink-muted"
                    >
                        {description}
                    </p>
                )}
            </div>

            <ol className="flex flex-col">
                {items.map((item, index) => (
                    <li
                        key={item}
                        data-reveal="up"
                        style={revealDelay(stagger(index))}
                        className="grid grid-cols-[2.25rem_1fr] items-baseline gap-x-3 border-t border-line py-3 last:border-b"
                    >
                        <span className="bp-meta flex items-center gap-1.5 text-signal">
                            {String(index + 1).padStart(2, "0")}
                            <span
                                aria-hidden="true"
                                data-reveal="rule"
                                style={revealDelay(stagger(index) + LEADER_LAG)}
                                className="h-px flex-1 bg-line-strong"
                            />
                        </span>
                        <span className="text-sm leading-relaxed text-ink-muted">{item}</span>
                    </li>
                ))}
            </ol>
        </Reveal>
    );
}
