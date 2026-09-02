"use client";

import { useEffect, useRef } from "react";

/**
 * 2px reading-progress bar pinned to the bottom edge of the navbar
 * (docs/uiux.md §3.3).
 *
 * Driven straight off scroll position with no spring: the bar is a readout of
 * where the reader is, not an animation, so smoothing it would make it lie.
 * That also makes it inherently safe under prefers-reduced-motion — there is
 * no motion here that the scroll itself did not already cause, which is why
 * this component does not consult the preference.
 *
 * The scale is written to the DOM node directly rather than held in state:
 * this updates on every scroll frame, and routing it through React would
 * re-render the whole navbar subtree dozens of times a second for a number
 * that only ever lands in one style property. The listener is passive and
 * coalesced to one rAF, so it never blocks the scroll it is measuring.
 */
export function ScrollProgress() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frame = 0;

        function update(): void {
            frame = 0;

            const node = ref.current;
            if (!node) return;

            const scrollable = document.documentElement.scrollHeight - window.innerHeight;

            // A page shorter than the viewport has no progress to report;
            // dividing by zero would otherwise leave the bar at NaN, which
            // renders as a full bar on an unscrollable page.
            const progress = scrollable > 0 ? window.scrollY / scrollable : 0;

            node.style.scale = `${Math.min(Math.max(progress, 0), 1)} 1`;
        }

        function onScroll(): void {
            frame ||= requestAnimationFrame(update);
        }

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div
            ref={ref}
            aria-hidden="true"
            style={{ scale: "0 1" }}
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent"
        />
    );
}
