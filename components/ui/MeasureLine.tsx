import { cn } from "@/lib/utils";

/**
 * Dimension lines (docs/uiux.md §2.4.4) — a hairline with end-caps annotating
 * one measurement, exactly as a drafting sheet marks a span.
 *
 * Two forms, one convention. Inside an SVG the line has to be path data in the
 * drawing's own user units (`verticalMeasurePath`, used by
 * components/hero/BlueprintSchematic.tsx); in ordinary layout it has to stretch
 * with the box it annotates, which only CSS can do (`MeasureLine`, used by
 * components/ui/BlueprintFrame.tsx). Keeping both here is what stops the two
 * from drifting into different cap widths and different stroke weights.
 *
 * Always decorative: the figure it annotates is stated in the copy nearby, and
 * both forms are hidden from assistive tech.
 */

/** Total width of the end-caps, in whatever units the caller is drawing in. */
export const MEASURE_CAP = 10;

/**
 * Path data for a vertical dimension line from `top` to `bottom` at `x`, with a
 * cap centred on each end.
 */
export function verticalMeasurePath(
    x: number,
    top: number,
    bottom: number,
    cap: number = MEASURE_CAP,
): string {
    const half = cap / 2;

    return `M${x} ${top}V${bottom}M${x - half} ${top}h${cap}M${x - half} ${bottom}h${cap}`;
}

export interface MeasureLineProps {
    /** Mono annotation set along the line, e.g. "1:1". */
    label?: string;
    className?: string;
}

/**
 * The layout form: a full-height hairline with caps, plus an upright-rotated
 * label. Give it a positioned parent and place it with `className`
 * (`absolute inset-y-4 left-2`, say).
 */
export function MeasureLine({ label, className }: MeasureLineProps) {
    return (
        <span aria-hidden="true" className={cn("pointer-events-none flex w-3", className)}>
            <span className="relative block w-full">
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-strong" />
                <span className="absolute top-0 left-0 h-px w-full bg-line-strong" />
                <span className="absolute bottom-0 left-0 h-px w-full bg-line-strong" />

                {label && (
                    <span className="bp-meta absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-180 bg-canvas px-0.5 py-1 text-[0.5625rem] text-ink-faint [writing-mode:vertical-rl]">
                        {label}
                    </span>
                )}
            </span>
        </span>
    );
}
