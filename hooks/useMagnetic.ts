"use client";

import { useEffect, useRef } from "react";

/** Peak displacement, in px (docs/uiux.md §3.3). */
const MAX_OFFSET = 4;
/** Radius of influence, in px. Outside it the element sits at rest. */
const RADIUS = 90;

const COARSE = "(pointer: coarse)";
const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Every mounted magnetic element. One document-level listener serves all of
 * them rather than one listener each: the effect needs pointer positions from
 * *outside* the element's own box, so per-element `pointermove` would never
 * fire, and N document listeners for N buttons is N times the work for
 * identical data.
 */
const elements = new Set<HTMLElement>();

let listening = false;
let frame = 0;
let pointerX = 0;
let pointerY = 0;

function apply(): void {
    frame = 0;

    for (const element of elements) {
        // getBoundingClientRect is a forced layout read, but it happens once
        // per element per frame at most, after the pointer has already moved —
        // and the element's own translate is the only thing that changes, which
        // does not invalidate layout for the next read.
        const rect = element.getBoundingClientRect();
        const dx = pointerX - (rect.left + rect.width / 2);
        const dy = pointerY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);

        if (distance === 0 || distance >= RADIUS) {
            element.style.translate = "";
            continue;
        }

        /*
         * Direction unit vector, scaled by a falloff that reaches zero at both
         * ends of the range: no pull when the cursor is dead centre (there is
         * no direction to lean in) and none at the edge of the radius (so the
         * element eases out of the effect instead of snapping back when the
         * pointer crosses the boundary).
         */
        const pull = (MAX_OFFSET * (1 - distance / RADIUS)) / distance;

        element.style.translate = `${(dx * pull).toFixed(2)}px ${(dy * pull).toFixed(2)}px`;
    }
}

function onPointerMove(event: PointerEvent): void {
    pointerX = event.clientX;
    pointerY = event.clientY;

    if (frame === 0) {
        frame = requestAnimationFrame(apply);
    }
}

function release(): void {
    for (const element of elements) {
        element.style.translate = "";
    }
}

function setListening(next: boolean): void {
    if (next === listening) return;

    listening = next;

    if (next) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        return;
    }

    window.removeEventListener("pointermove", onPointerMove);

    if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
    }

    release();
}

/**
 * Magnetic hover (docs/uiux.md §3.3): the element leans up to 4px toward the
 * cursor while it is within 90px, and settles back when it leaves.
 *
 * Two hard opt-outs, both live rather than read once at mount — a laptop
 * gaining a mouse and a visitor turning on reduced motion mid-session are both
 * ordinary:
 *
 *   - `prefers-reduced-motion: reduce` — the effect is decoration, so it is off.
 *   - `pointer: coarse` — on a touch screen there is no hovering pointer to
 *     lean toward, and the only thing this would produce is a button that
 *     shifts 4px in the instant before it is tapped.
 *
 * Returns a ref to spread onto the element to magnetise. The settle is a CSS
 * transition on `translate` (see `.bp-magnetic` in globals.css), not a spring
 * integrator: §11.1.1 rules out an animation runtime, and over 4px the
 * difference between a spring and an eased tween is not observable.
 */
export function useMagnetic<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const coarse = window.matchMedia(COARSE);
        const reduced = window.matchMedia(REDUCED);

        function sync(): void {
            const node = ref.current;
            if (!node) return;

            if (coarse.matches || reduced.matches) {
                elements.delete(node);
                node.style.translate = "";
            } else {
                elements.add(node);
            }

            setListening(elements.size > 0);
        }

        sync();

        coarse.addEventListener("change", sync);
        reduced.addEventListener("change", sync);

        return () => {
            coarse.removeEventListener("change", sync);
            reduced.removeEventListener("change", sync);

            elements.delete(element);
            element.style.translate = "";
            setListening(elements.size > 0);
        };
    }, []);

    return ref;
}
