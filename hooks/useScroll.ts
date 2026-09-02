"use client";

import { useEffect, useState } from "react";

interface ScrollState {
    /** True once scrollY exceeds the given threshold (default 10px) */
    isScrolled: boolean;
}

/**
 * Reports whether the page has been scrolled past `threshold`, for the navbar's
 * scrolled treatment (backdrop, slimmer bar).
 *
 * Scroll fires per frame or faster, so the reads are coalesced into one
 * requestAnimationFrame callback, and the state is a boolean the setter bails
 * out of when unchanged — otherwise every consumer re-renders for the whole
 * length of a scroll, having derived the same value each time.
 *
 * Deliberately narrow: raw `scrollY` and scroll direction were exposed here and
 * used by nobody, and both re-render on every frame by nature. Active-section
 * tracking lives in useActiveSection (IntersectionObserver, no scroll handler)
 * and the progress bar (components/ui/ScrollProgress.tsx) writes its scale
 * straight onto the DOM node from its own rAF loop, so it never re-renders.
 *
 * @param threshold - pixel offset before `isScrolled` becomes true (default: 10)
 */
export function useScroll(threshold = 10): ScrollState {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        let frame = 0;

        function read(): void {
            frame = 0;

            const next = window.scrollY > threshold;
            // Returning the previous value is React's bail-out signal, so an
            // unchanged threshold crossing costs nothing beyond this compare.
            setIsScrolled((prev) => (prev === next ? prev : next));
        }

        function handleScroll(): void {
            if (frame !== 0) return;
            frame = requestAnimationFrame(read);
        }

        // Seed from the current position: a page restored mid-scroll, or loaded
        // at a #hash, is already past the threshold before any event fires.
        read();

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (frame !== 0) cancelAnimationFrame(frame);
        };
    }, [threshold]);

    return { isScrolled };
}
