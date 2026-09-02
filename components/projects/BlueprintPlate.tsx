import { PATTERN_HEIGHT, PATTERN_WIDTH, buildBlueprintPattern } from "@/lib/projectPattern";
import { cn } from "@/lib/utils";

export interface BlueprintPlateProps {
    /** Project slug — the whole drawing is derived from it. */
    slug: string;
    className?: string;
}

/**
 * The stand-in visual for a project with no screenshot (docs/uiux.md §4.5).
 *
 * Geometry comes from lib/projectPattern.ts, so this file is only the rendering
 * half: a Server Component, no client JS, no image request. The viewBox is 16:10
 * like the box it fills, so the default `preserveAspectRatio` maps it exactly
 * and nothing is letterboxed.
 *
 * Purely decorative — it depicts nothing about the project beyond "this is a
 * system" — so it is hidden from assistive tech outright. The card's own title
 * and description carry the meaning.
 */
export function BlueprintPlate({ slug, className }: BlueprintPlateProps) {
    const pattern = buildBlueprintPattern(slug);

    return (
        <svg
            viewBox={`0 0 ${PATTERN_WIDTH} ${PATTERN_HEIGHT}`}
            fill="none"
            role="presentation"
            aria-hidden="true"
            className={cn("h-full w-full bg-surface-alt", className)}
        >
            <path d={pattern.hatch} className="stroke-line" strokeWidth={0.5} />

            {pattern.links.map((d) => (
                <path key={d} d={d} className="stroke-line" strokeWidth={0.75} />
            ))}

            {pattern.plates.map((plate) => (
                <rect
                    key={`${plate.x}-${plate.y}`}
                    x={plate.x}
                    y={plate.y}
                    width={plate.width}
                    height={plate.height}
                    className="fill-surface/70 stroke-line-strong"
                    strokeWidth={0.75}
                />
            ))}

            {pattern.nodes.map((node) => (
                <circle
                    key={`${node.cx}-${node.cy}`}
                    cx={node.cx}
                    cy={node.cy}
                    r={1.1}
                    className="fill-line-strong"
                />
            ))}

            <text
                x={PATTERN_WIDTH - 6}
                y={PATTERN_HEIGHT - 5}
                textAnchor="end"
                className="fill-ink-faint font-mono"
                fontSize={5}
                letterSpacing="0.18em"
            >
                {pattern.label}
            </text>
        </svg>
    );
}
