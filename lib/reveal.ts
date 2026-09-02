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
