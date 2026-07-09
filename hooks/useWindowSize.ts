"use client";

import { useEffect, useState } from "react";

/**
 * Tracks current window dimensions.
 *
 * Returns { width: undefined, height: undefined } during SSR and before
 * first paint to avoid hydration mismatches — consumers should treat
 * undefined as "not yet known" rather than 0.
 */
interface WindowSize {
    width: number | undefined;
    height: number | undefined;
}

export function useWindowSize(): WindowSize {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        function handleResize(): void {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        handleResize();

        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
}