import { HTMLAttributes } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { HEADING_DELAY, revealDelay } from "@/lib/reveal";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Section number shown in the marker, 1-based. Rendered zero-padded
     * (`/ 01`). Omit only for headings that are not top-level sections.
     */
    index?: number;
    eyebrow?: string;
    title: string;
    description?: string;
    /**
     * id applied to the <h2>. Point the owning <section>'s aria-labelledby at
     * this so the landmark is named by its own heading (docs/uiux.md §5.3).
     */
    headingId?: string;
    /**
     * Heading level. Defaults to h2 (a section inside a page that already has
     * an h1). Standalone routes whose SectionHeading *is* the page title pass
     * "h1" so the document keeps a single, unskipped heading order.
     */
    as?: "h1" | "h2";
    /**
     * Reveal on parse rather than on scroll. For a heading that is already on
     * screen at load — the /projects page title — where waiting on an
     * intersection callback only delays the paint.
     */
    immediate?: boolean;
}

/**
 * Section marker + heading (docs/uiux.md §2.4.3).
 *
 *   / 01 — ABOUT ─────────────────────────────
 *   Who I am
 *
 * The number and rule are decorative chrome and are hidden from assistive
 * tech; the eyebrow stays readable because it is the only place the section's
 * short label appears.
 *
 * The whole lockup is its own reveal root, and this is the single highest-
 * leverage piece of motion on the site — it fires seven times on the homepage
 * alone, so every section announces itself the same way rather than the page
 * animating in patches. The parts arrive in reading order: marker, then the
 * rule drawing out from it, then the heading pulling into focus, then the
 * description.
 *
 * The h2 takes `blur` rather than `up`. It is the only element on a section
 * large enough for a focus pull to read as intentional rather than as a
 * rendering fault, and it is what gives each section a beat of its own instead
 * of a uniform slide. Everything else here stays on translate and opacity.
 *
 * Still a Server Component in every practical sense: `Reveal` is the only
 * client boundary and it renders nothing but a wrapper, so the markup below is
 * server-rendered and carries only attributes.
 */
export function SectionHeading({
    index,
    eyebrow,
    title,
    description,
    headingId,
    as: Heading = "h2",
    immediate = false,
    className,
    ...props
}: SectionHeadingProps) {
    return (
        <Reveal
            as="div"
            immediate={immediate}
            className={cn("flex flex-col gap-4", className)}
            {...props}
        >
            {(index !== undefined || eyebrow) && (
                <div className="flex items-center gap-3">
                    {index !== undefined && (
                        <span
                            aria-hidden="true"
                            data-reveal="up"
                            style={revealDelay(HEADING_DELAY.marker)}
                            className="bp-meta text-accent"
                        >
                            / {String(index).padStart(2, "0")}
                        </span>
                    )}
                    {eyebrow && (
                        <>
                            {index !== undefined && (
                                <span
                                    aria-hidden="true"
                                    data-reveal="up"
                                    style={revealDelay(HEADING_DELAY.marker)}
                                    className="bp-meta text-ink-faint"
                                >
                                    —
                                </span>
                            )}
                            <span
                                data-reveal="up"
                                style={revealDelay(HEADING_DELAY.marker)}
                                className="bp-meta text-ink-muted"
                            >
                                {eyebrow}
                            </span>
                        </>
                    )}
                    <span
                        aria-hidden="true"
                        data-reveal="rule"
                        style={revealDelay(HEADING_DELAY.rule)}
                        className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent"
                    />
                </div>
            )}

            <Heading
                id={headingId}
                data-reveal="blur"
                style={revealDelay(HEADING_DELAY.title)}
                className="font-display text-h2 font-bold text-balance text-ink"
            >
                {title}
            </Heading>

            {description && (
                <p
                    data-reveal="up"
                    style={revealDelay(HEADING_DELAY.description)}
                    className="max-w-2xl text-body-lg text-pretty text-ink-muted"
                >
                    {description}
                </p>
            )}
        </Reveal>
    );
}
