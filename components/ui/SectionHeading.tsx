import { HTMLAttributes } from "react";
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
 */
export function SectionHeading({
    index,
    eyebrow,
    title,
    description,
    headingId,
    as: Heading = "h2",
    className,
    ...props
}: SectionHeadingProps) {
    return (
        <div className={cn("flex flex-col gap-4", className)} {...props}>
            {(index !== undefined || eyebrow) && (
                <div className="flex items-center gap-3">
                    {index !== undefined && (
                        <span aria-hidden="true" className="bp-meta text-accent">
                            / {String(index).padStart(2, "0")}
                        </span>
                    )}
                    {eyebrow && (
                        <>
                            {index !== undefined && (
                                <span aria-hidden="true" className="bp-meta text-ink-faint">
                                    —
                                </span>
                            )}
                            <span className="bp-meta text-ink-muted">{eyebrow}</span>
                        </>
                    )}
                    <span
                        aria-hidden="true"
                        className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent"
                    />
                </div>
            )}

            <Heading
                id={headingId}
                className="font-display text-h2 font-bold text-balance text-ink"
            >
                {title}
            </Heading>

            {description && (
                <p className="max-w-2xl text-body-lg text-pretty text-ink-muted">
                    {description}
                </p>
            )}
        </div>
    );
}
