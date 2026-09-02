import type { ReactNode } from "react";
import { MeasureLine } from "@/components/ui/MeasureLine";
import { cn } from "@/lib/utils";

export interface BlueprintFrameProps {
    children: ReactNode;
    /** Mono caption under the frame, e.g. "FIG.00 — THE AUTHOR". */
    caption?: string;
    /** Annotation set along the measure line down the left edge. */
    measure?: string;
    className?: string;
    /** Applied to the framed box itself, not the outer column. */
    frameClassName?: string;
}

/**
 * A drafting frame around an image (docs/uiux.md §2.4.2, §2.4.4): registration
 * ticks at two corners, a dimension line down the left edge, and a mono caption
 * beneath.
 *
 * All three are chrome and are hidden from assistive tech — the caption
 * included, since it names the drawing rather than the subject and the image
 * inside carries its own alt text.
 *
 * A Server Component: the duotone-to-colour resolve is a CSS `filter`
 * transition on hover/focus rather than a scripted effect, which also means the
 * `prefers-reduced-motion` backstop in app/globals.css disables it for free.
 * The grayscale itself is not disabled under reduced motion, only its
 * transition — the resting look is a design choice, not an animation.
 */
export function BlueprintFrame({
    children,
    caption,
    measure,
    className,
    frameClassName,
}: BlueprintFrameProps) {
    return (
        <figure className={cn("group/frame flex flex-col gap-3", className)}>
            <div className="relative pl-6">
                <MeasureLine label={measure} className="absolute inset-y-2 left-0" />

                {/*
                 * Duotone at rest, resolving to full colour on hover or when
                 * anything inside takes focus. Two halves: `saturate` pulls the
                 * image most of the way down — chosen over a flat `grayscale`
                 * so skin tones do not go dead — and the accent wash below
                 * tints what is left towards the blueprint's own blue.
                 */}
                <div
                    className={cn(
                        "bp-ticks bp-ticks-live relative overflow-hidden rounded-lg border border-line bg-surface saturate-50 transition-[filter] duration-slow ease-bp group-hover/frame:saturate-100 group-focus-within/frame:saturate-100",
                        frameClassName,
                    )}
                >
                    {children}

                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-accent/12 transition-opacity duration-slow ease-bp group-hover/frame:opacity-0 group-focus-within/frame:opacity-0"
                    />
                </div>
            </div>

            {caption && (
                <figcaption aria-hidden="true" className="bp-meta pl-6 text-ink-faint">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
