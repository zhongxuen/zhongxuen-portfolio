"use client";

import { useEffect, useLayoutEffect } from "react";

/*
 * useLayoutEffect does nothing on the server and React says so, loudly, for
 * every client component that is prerendered — which both callers of this hook
 * are. `active` is false on the server anyway, so there is nothing to run
 * there; this just picks the hook that will not warn.
 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Freezes background scrolling while an overlay is open (mobile nav, the ⌘K
 * palette, and later the project gallery lightbox).
 *
 * Compensates for the removed scrollbar with matching padding so the page does
 * not shift sideways as the lock engages — on desktop that jump is the most
 * common tell of a naively implemented modal.
 *
 * A *layout* effect, not a passive one, and that is load-bearing. Both
 * overlays close by activating a link inside them, and a `#section` link's
 * scroll is the browser's default action, which runs the moment the click
 * handler returns. A passive effect would still be queued at that point, so
 * the body would still be `overflow: hidden` when the jump was attempted and
 * the jump would go nowhere. React flushes layout effects synchronously for
 * discrete events like a click, so the unlock lands first.
 */
export function useBodyScrollLock(active: boolean): void {
    useIsomorphicLayoutEffect(() => {
        if (!active) return;

        const { overflow, paddingRight } = document.body.style;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = "hidden";
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = overflow;
            document.body.style.paddingRight = paddingRight;
        };
    }, [active]);
}
