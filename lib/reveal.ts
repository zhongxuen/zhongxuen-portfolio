import type { CSSProperties } from "react";

/**
 * Server-safe helpers for the entrance system. Kept out of
 * components/motion/Reveal.tsx on purpose: that file is `"use client"`, and
 * these are called from Server Components that must not be pulled across the
 * boundary just to compute a delay.
 *
 * See the ENTRANCE CHOREOGRAPHY block in app/globals.css for the CSS side.
 */

/**
 * Cadence between consecutive items in a staggered group, in milliseconds.
 * Matches the `staggerChildren: 0.06` the Framer `staggerContainer` variant
 * used, so grids cascade at the same rate they always did.
 */
export const STAGGER_STEP = 60;

/**
 * Offset applied to the whole group before the first child moves. Mirrors the
 * old `delayChildren: 0.08`.
 */
export const STAGGER_LEAD = 80;

/** Tighter cadence for the per-word hero wipe (was `wordStagger`). */
export const WORD_STAGGER_STEP = 40;

/**
 * Inline style setting an element's entrance delay.
 *
 * `--reveal-delay` is read by the shared `[data-reveal]` transition, so a
 * staggered list is just `items.map((item, i) => <div {...} style={revealDelay(stagger(i))}>)`
 * — no per-item component, no client boundary, no orchestration at runtime.
 */
export function revealDelay(ms: number): CSSProperties {
    return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

/** Delay for the `index`-th child of a standard staggered group. */
export function stagger(index: number, step: number = STAGGER_STEP): number {
    return STAGGER_LEAD + index * step;
}

/**
 * Delays for the four parts of a SectionHeading, in the order they appear.
 *
 * Named rather than computed at each call site because every section on the
 * site shares this cadence, and a heading whose rule arrived a beat early on
 * one section and a beat late on another is exactly the kind of drift that
 * makes a page feel assembled rather than designed.
 *
 * The rule is offset furthest because it is the longest gesture — it draws on
 * `--bp-dur-slow` where the rest settle on `--bp-dur-base` — so starting it
 * with the marker beside it would have it still extending after the heading
 * below had finished.
 */
export const HEADING_DELAY = {
    marker: 0,
    rule: 40,
    title: 90,
    description: 170,
} as const;
