import type { CSSProperties } from "react";
import { verticalMeasurePath } from "@/components/ui/MeasureLine";
import { revealDelay } from "@/lib/reveal";
import { cn } from "@/lib/utils";

/**
 * The hero's visual anchor (docs/uiux.md §4.2): a three-tier system diagram
 * that draws itself once on mount.
 *
 * Hand-authored inline SVG — no canvas, no WebGL, no animation dependency, per
 * the §5.4 performance guardrails. It costs nothing but the markup below.
 *
 * This is a Server Component. The self-draw is CSS: each stroked path carries
 * `data-reveal="draw"` plus the native `pathLength={1}` attribute, which
 * normalises its geometry so one `stroke-dasharray: 1` works for every path
 * regardless of real length. That normalisation is the only reason this used
 * to need Framer Motion — it was doing the same trick behind its `pathLength`
 * animation, at the cost of pulling the whole runtime and this file's markup
 * into the client bundle.
 *
 * Every rectangle is expressed as a <path> rather than a <rect> because
 * browser support for stroke-dasharray on <rect> is not uniform; an explicit
 * path is portable.
 *
 * The reveal is triggered by the ancestor <Reveal immediate> in HeroSection,
 * which sets the `data-visible` the `[data-reveal]` rules key off. Reduced
 * motion is handled entirely in app/globals.css — the hidden state is scoped
 * to `prefers-reduced-motion: no-preference`, so a reduced-motion visitor is
 * served the finished drawing with no JS involved at all.
 *
 * Once the drawing has finished arriving it keeps running: a packet travels
 * down each connector, and a survey line passes across the plate every nine
 * seconds. These are the only looping animations on the site outside the ⌘K
 * caret, and they are the difference between a picture of a system and a
 * picture of a system that is working — which is the claim the hero is making.
 * Both are defined in the SCHEMATIC AMBIENCE block of app/globals.css and are
 * scoped to `prefers-reduced-motion: no-preference` there.
 *
 * Entirely decorative — the tiers restate the layered architecture the copy
 * already describes — so the whole graphic is aria-hidden.
 */

/** Rectangle as a closed path, drawn clockwise from the top-left corner. */
function rect(x: number, y: number, w: number, h: number): string {
    return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
}

interface Tier {
    label: string;
    detail: string;
    /** Path data for the tier plate. */
    d: string;
    /** Baseline of the label text. */
    labelY: number;
    /** Baseline of the detail text. */
    detailY: number;
}

const TIERS: Tier[] = [
    {
        label: "CLIENT",
        detail: "UI · COMPONENTS · STATE",
        d: rect(76, 44, 208, 62),
        labelY: 74,
        detailY: 91,
    },
    {
        label: "SERVICE",
        detail: "ROUTES · AUTH · LOGIC",
        d: rect(46, 179, 268, 62),
        labelY: 209,
        detailY: 226,
    },
    {
        label: "DATA",
        detail: "SCHEMA · QUERIES · STORAGE",
        d: rect(76, 314, 208, 62),
        labelY: 344,
        detailY: 361,
    },
];

/** Vertical connectors between the tiers, with their edge annotations. */
const LINKS = [
    { d: "M180 106V179", arrow: "M175 172l5 7 5-7", label: "REQUEST", y: 147 },
    { d: "M180 241V314", arrow: "M175 307l5 7 5-7", label: "QUERY", y: 282 },
];

/** L-shaped registration marks at the four corners of the drawing frame. */
const CORNER_TICKS = ["M14 34V14h20", "M326 14h20v20", "M346 386v20h-20", "M34 406H14v-20"];

/**
 * Cadence between successive strokes, in milliseconds — the `staggerChildren`
 * of the variant this replaced.
 */
const DRAW_STEP = 50;

/**
 * Text holds until the strokes are better than half drawn, so the labels land
 * inside plates that already read as plates.
 */
const TEXT_DELAY = 605;

/**
 * Position of each group in the cascade, derived from the array lengths above
 * rather than hand-numbered. The strokes fire in document order, and there are
 * about twenty of them -- written out as literals, inserting a single tick
 * would silently reshuffle every delay after it.
 */
const ORDER = {
    frame: 0,
    cornerTicks: 1,
    dimension: 1 + CORNER_TICKS.length,
    /** Two strokes per link: the connector, then its arrowhead. */
    links: 2 + CORNER_TICKS.length,
    tiers: 2 + CORNER_TICKS.length + LINKS.length * 2,
    titleBlock: 2 + CORNER_TICKS.length + LINKS.length * 2 + TIERS.length,
} as const;

/** Entrance delay for the `n`-th stroke in the cascade. */
function drawDelay(n: number) {
    return revealDelay(n * DRAW_STEP);
}

export function BlueprintSchematic({ className }: { className?: string }) {
    const text = revealDelay(TEXT_DELAY);

    return (
        <svg
            viewBox="0 0 360 420"
            fill="none"
            role="presentation"
            aria-hidden="true"
            className={cn("h-auto w-full max-w-[24rem]", className)}
        >
            {/*
             * The frame fades rather than draws. A self-draw works by animating
             * stroke-dasharray, which would have to overwrite the "4 6" dash
             * pattern that makes this frame read as a drafting guide — the
             * Framer version did exactly that and silently rendered the frame
             * solid. Fading keeps it dotted.
             */}
            <path
                d={rect(14, 14, 332, 392)}
                data-reveal="fade"
                style={drawDelay(ORDER.frame)}
                className="stroke-line"
                strokeWidth={1}
                strokeDasharray="4 6"
            />

            {CORNER_TICKS.map((d, index) => (
                <path
                    key={d}
                    d={d}
                    pathLength={1}
                    data-reveal="draw"
                    style={drawDelay(ORDER.cornerTicks + index)}
                    className="stroke-line-strong"
                    strokeWidth={1.5}
                />
            ))}

            {/*
             * Left dimension line — decorative measure annotation (§2.4.4).
             * Geometry comes from the shared helper so this line and the one
             * framing the About portrait keep the same cap width.
             */}
            <path
                d={verticalMeasurePath(32, 44, 376)}
                pathLength={1}
                data-reveal="draw"
                style={drawDelay(ORDER.dimension)}
                className="stroke-line-strong"
                strokeWidth={1}
            />
            <text
                data-reveal="fade"
                style={text}
                x={0}
                y={0}
                transform="rotate(-90 32 210) translate(32 206)"
                textAnchor="middle"
                className="fill-ink-faint font-mono"
                fontSize={9}
                letterSpacing="0.24em"
            >
                3-TIER
            </text>

            {LINKS.map((link, index) => (
                <g key={link.label}>
                    <path
                        d={link.d}
                        pathLength={1}
                        data-reveal="draw"
                        style={drawDelay(ORDER.links + index * 2)}
                        className="stroke-line-strong"
                        strokeWidth={1.5}
                    />
                    <path
                        d={link.arrow}
                        pathLength={1}
                        data-reveal="draw"
                        style={drawDelay(ORDER.links + index * 2 + 1)}
                        className="stroke-accent"
                        strokeWidth={1.5}
                        strokeLinecap="square"
                    />
                    {/*
                     * The travelling packet is a second path laid over the
                     * connector rather than a class on the connector itself:
                     * that path is mid-self-draw off `data-reveal="draw"`,
                     * which owns its stroke-dasharray, and a loop sharing the
                     * property would fight the entrance for it.
                     *
                     * Staggered so the two wires do not fire in lockstep — the
                     * offset is what makes it read as traffic rather than as a
                     * metronome.
                     */}
                    <path
                        d={link.d}
                        pathLength={1}
                        style={{ "--bp-delay": `${TEXT_DELAY + index * 900}ms` } as CSSProperties}
                        className="bp-wire-pulse stroke-accent"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                    />
                    <text
                        data-reveal="fade"
                        style={text}
                        x={192}
                        y={link.y}
                        className="fill-ink-faint font-mono"
                        fontSize={9}
                        letterSpacing="0.2em"
                    >
                        {link.label}
                    </text>
                </g>
            ))}

            {TIERS.map((tier, index) => (
                <g key={tier.label}>
                    <path
                        d={tier.d}
                        pathLength={1}
                        data-reveal="draw"
                        style={drawDelay(ORDER.tiers + index)}
                        className="fill-surface/60 stroke-line-strong"
                        strokeWidth={1.25}
                    />
                    <text
                        data-reveal="fade"
                        style={text}
                        x={180}
                        y={tier.labelY}
                        textAnchor="middle"
                        className="fill-ink font-mono"
                        fontSize={14}
                        fontWeight={500}
                        letterSpacing="0.18em"
                    >
                        {tier.label}
                    </text>
                    <text
                        data-reveal="fade"
                        style={text}
                        x={180}
                        y={tier.detailY}
                        textAnchor="middle"
                        className="fill-ink-muted font-mono"
                        fontSize={8.5}
                        letterSpacing="0.14em"
                    >
                        {tier.detail}
                    </text>
                </g>
            ))}

            {/* Drafting title block */}
            <path
                d={rect(196, 386, 150, 20)}
                pathLength={1}
                data-reveal="draw"
                style={drawDelay(ORDER.titleBlock)}
                className="stroke-line"
                strokeWidth={1}
            />
            <text
                data-reveal="fade"
                style={text}
                x={204}
                y={400}
                className="fill-ink-faint font-mono"
                fontSize={8.5}
                letterSpacing="0.18em"
            >
                FIG.01 — SYSTEM VIEW
            </text>

            {/*
             * Survey line. Declared last so it passes over the drawing rather
             * than under it, and translated in the drawing's own user units —
             * the keyframes travel 362, which is the frame's inner height.
             */}
            <line
                x1={14}
                x2={346}
                y1={22}
                y2={22}
                className="bp-scan stroke-accent"
                strokeWidth={1}
                opacity={0}
            />
        </svg>
    );
}
