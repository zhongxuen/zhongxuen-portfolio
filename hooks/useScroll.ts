"use client";

import { useEffect, useState } from "react";

type ScrollDirection = "up" | "down";

interface ScrollState {
    /** Current vertical scroll position in pixels */
    scrollY: number;

    /** Direction of the most recent scroll movement */
    direction: ScrollDirection;

    /** True once scrollY exceeds the given threshold (default 10px) */
    isScrolled: boolean;
}

/**
 * Tracks scroll position and direction, used for header show/hide-on-scroll
 * behavior and active-section highlighting in navigation.
 *
 * @param threshold - pixel offset before `isScrolled` becomes true (default: 10)
 */
export function useScroll(threshold = 10): ScrollState {
    const [scrollState, setScrollState] = useState<ScrollState>({
        scrollY: 0,
        direction: "up",
        isScrolled: false,
    });

    useEffect(() => {
        let lastScrollY = window.scrollY;

        function handleScroll(): void {
            const currentScrollY = window.scrollY;
            const direction: ScrollDirection =
                currentScrollY > lastScrollY ? "down" : "up";

            setScrollState({
                scrollY: currentScrollY,
                direction,
                isScrolled: currentScrollY > threshold,
            });

            lastScrollY = currentScrollY;
        }

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => window.removeEventListener("scroll", handleScroll);
    }, [threshold]);

    return scrollState;
}