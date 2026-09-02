import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion/Reveal";
import { revealDelay, stagger } from "@/lib/reveal";
import { cn } from "@/lib/utils";

export interface TimelineNode {
    id: string;
    /** Formatted date range, e.g. "Jul 2026 – Oct 2026". */
    period: string;
    /** Role, or degree. */
    title: string;
    /** Company, or institution. */
    subtitle: string;
    subtitleUrl?: string;
    /** Short mono facts — location, employment type, GPA. Falsy entries drop. */
    meta?: (string | undefined)[];
    description?: string;
    /** Responsibilities, or honours. */
    points?: string[];
    /** Technologies, or relevant coursework. */
    tags?: string[];
    tagVariant?: "default" | "outline";
    /** Marks the node as ongoing: a success-coloured dot with one settle. */
    current?: boolean;
}

export interface TimelineProps {
    nodes: TimelineNode[];
    className?: string;
}

/**
 * The shared timeline behind both Experience and Education (docs/uiux.md §4.7).
 *
 * It replaces ExperienceCard and EducationCard, which were two components
 * rendering the same shape — a dated plate with a heading pair, a meta row,
 * bullets and tags — and drifting apart at the details. One node shape means
 * the two sections finally read as one history rather than two lists.
 *
 * The spine is an SVG path carrying `pathLength="1"`, and it draws in two
 * ways. `data-reveal="draw"` is the floor: one shot off the shared CSS
 * choreography in app/globals.css when the section enters view. `bp-spine` is
 * the enhancement: where `animation-timeline` is supported the line is instead
 * scrubbed by scroll position, so it extends *as the reader descends the
 * history* rather than completing in six-tenths of a second while four fifths
 * of it are still below the fold. An animation beats a transition on the same
 * property, so the two need no coordination — the better one simply wins where
 * it exists. Neither involves an animation runtime, per §11.1.1.
 *
 * `preserveAspectRatio="none"` lets a one-unit-wide viewBox stretch to
 * whatever height the list turns out to be; the dash normalisation is immune to
 * that stretch because `pathLength` measures the path as 1 regardless.
 *
 * Nodes alternate sides from lg up and stack in one column below it, which is
 * also the reading order in the DOM — the alternation is placement only, so the
 * sequence a screen reader hears is the sequence on the page.
 */
export function Timeline({ nodes, className }: TimelineProps) {
    return (
        <Reveal className={cn("relative", className)}>
            {/*
             * The spine sits at the dots' centre: 7px in on mobile (half of the
             * 14px dot pinned to the left edge), dead centre from lg.
             */}
            <svg
                aria-hidden="true"
                role="presentation"
                viewBox="0 0 1 1000"
                preserveAspectRatio="none"
                fill="none"
                className="bp-spine-track pointer-events-none absolute inset-y-0 left-[7px] w-px -translate-x-1/2 lg:left-1/2"
            >
                <path
                    d="M0.5 0V1000"
                    pathLength={1}
                    data-reveal="draw"
                    className="bp-spine stroke-line-strong"
                    strokeWidth={1}
                />
            </svg>

            <ol className="flex flex-col gap-8">
                {nodes.map((node, index) => {
                    const meta = (node.meta ?? []).filter(Boolean) as string[];

                    return (
                        <li
                            key={node.id}
                            /*
                             * Nodes enter from the side they land on, so the
                             * alternation reads as two columns filling in
                             * rather than one list sliding up past a spine.
                             * Below lg every node sits in one column on the
                             * left, and the horizontal variants are as correct
                             * there — they converge on the spine either way.
                             */
                            data-reveal={index % 2 === 0 ? "right" : "left"}
                            style={revealDelay(stagger(index))}
                            className="relative pl-10 lg:grid lg:grid-cols-2 lg:gap-x-16 lg:pl-0"
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "absolute top-6 left-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border bg-canvas lg:left-1/2 lg:-translate-x-1/2",
                                    node.current
                                        ? "bp-node-live border-success"
                                        : "border-line-strong",
                                )}
                            >
                                <span
                                    className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        node.current ? "bg-success" : "bg-line-strong",
                                    )}
                                />
                            </span>

                            <div
                                data-fx="spotlight"
                                className={cn(
                                    "bp-ticks bp-ticks-live bp-lift isolate flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 md:p-6",
                                    index % 2 === 0 ? "lg:col-start-1" : "lg:col-start-2",
                                )}
                            >
                                <span aria-hidden="true" className="bp-spotlight" />

                                <div className="flex flex-col gap-1.5">
                                    <p className="bp-meta flex items-center gap-2 text-ink-muted">
                                        {node.period}
                                        {node.current && (
                                            <span className="text-success">· Current</span>
                                        )}
                                    </p>

                                    <h3 className="font-display text-h3 font-medium text-balance text-ink">
                                        {node.title}
                                    </h3>

                                    {node.subtitleUrl ? (
                                        <a
                                            href={node.subtitleUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bp-focus w-fit text-sm font-medium text-accent hover:underline"
                                        >
                                            {node.subtitle}
                                        </a>
                                    ) : (
                                        <p className="text-sm font-medium text-accent">
                                            {node.subtitle}
                                        </p>
                                    )}
                                </div>

                                {meta.length > 0 && (
                                    <p className="bp-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
                                        {meta.map((entry, metaIndex) => (
                                            <span
                                                key={entry}
                                                className="inline-flex items-center gap-2"
                                            >
                                                {metaIndex > 0 && (
                                                    <span
                                                        aria-hidden="true"
                                                        className="text-ink-faint"
                                                    >
                                                        ·
                                                    </span>
                                                )}
                                                {entry}
                                            </span>
                                        ))}
                                    </p>
                                )}

                                {node.description && (
                                    <p className="text-sm leading-relaxed text-ink-muted">
                                        {node.description}
                                    </p>
                                )}

                                {node.points && node.points.length > 0 && (
                                    <ul className="flex flex-col gap-1.5 text-sm text-ink-muted">
                                        {node.points.map((point) => (
                                            <li key={point} className="flex gap-2.5">
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-2 h-px w-2.5 shrink-0 bg-line-strong"
                                                />
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {node.tags && node.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {node.tags.map((tag) => (
                                            <Badge key={tag} variant={node.tagVariant}>
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </Reveal>
    );
}
