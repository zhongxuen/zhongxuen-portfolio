/**
 * Motion tokens for the Blueprint direction (docs/uiux.md §3.1).
 *
 * Every transition on the site resolves through EASE and DUR. Do not write an
 * inline duration or cubic-bezier in a component — if a value is missing here,
 * add it here. The same numbers are mirrored as `--bp-dur-*` / `--ease-bp` in
 * app/globals.css; keep the two in step.
 *
 * This file used to export Framer Motion `Variants` objects. The entrance
 * choreography they described now lives in CSS (the ENTRANCE CHOREOGRAPHY
 * block in app/globals.css, driven by components/motion/Reveal.tsx), so what
 * remains here are the raw tokens plus the one thing CSS cannot do for us:
 * sample the easing curve from JS, which the count-up readout needs.
 */

/** Tuple form of a cubic-bezier easing: the two control points. */
export type Bezier = [number, number, number, number];

export const EASE = {
    /** Primary — a decisive settle. Overshoot-free, fast out of the gate. */
    out: [0.16, 1, 0.3, 1] as Bezier,
    inOut: [0.65, 0, 0.35, 1] as Bezier,
};

/** Seconds — the unit the JS-driven tweens in this codebase work in. */
export const DUR = {
    fast: 0.18,
    base: 0.34,
    slow: 0.6,
    /** Reserved for the one-time hero SVG draw. Nothing else may use it. */
    draw: 1.1,
} as const;

/* ---------------------------------------------------------------------------
 * Easing sampler
 * ------------------------------------------------------------------------ */

/** One coordinate of the cubic Bézier with implicit endpoints at 0 and 1. */
function bezierAt(t: number, p1: number, p2: number): number {
    const inv = 1 - t;
    return 3 * inv * inv * t * p1 + 3 * inv * t * t * p2 + t * t * t;
}

/** d/dt of the above — used to Newton-step towards a target x. */
function bezierSlopeAt(t: number, p1: number, p2: number): number {
    const inv = 1 - t;
    return 3 * inv * inv * p1 + 6 * inv * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

/**
 * Turns one of the EASE tuples into the `progress -> eased progress` function
 * a JS tween needs, so a hand-rolled animation lands on exactly the same curve
 * as the CSS `cubic-bezier()` next to it. Without this, anything animated in
 * JS would drift onto some approximate easing of its own and the site would
 * have two subtly different motion characters.
 *
 * A cubic-bezier easing is a parametric curve, so eased(x) is not a direct
 * evaluation: we first solve for the `t` whose x-coordinate is the elapsed
 * fraction, then read that `t`'s y-coordinate. Newton-Raphson converges in a
 * handful of iterations for the well-behaved (monotonic-x) curves above.
 */
export function cubicBezier([x1, y1, x2, y2]: Bezier): (x: number) => number {
    return (x: number): number => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;

        let t = x;
        for (let i = 0; i < 8; i += 1) {
            const error = bezierAt(t, x1, x2) - x;
            if (Math.abs(error) < 1e-5) break;

            const slope = bezierSlopeAt(t, x1, x2);
            // A flat tangent would send the next step to infinity. The curves
            // in EASE never actually go flat mid-range, but bail rather than
            // emit NaN if one ever does.
            if (Math.abs(slope) < 1e-6) break;

            t -= error / slope;
        }

        return bezierAt(t, y1, y2);
    };
}
