"use client";

import { RefObject, useEffect } from "react";

/**
 * Calls `onOutside` when a pointer press lands outside `containerRef` while
 * `active`.
 *
 * Listens for `pointerdown` rather than `click` so a press that begins outside
 * still dismisses even if it ends elsewhere — a drag, or a release over an
 * element that has since unmounted, never produces a document-level `click`.
 *
 * `onOutside` is an effect dependency: pass a stable callback (useCallback).
 */
export function useOutsideClick(
    active: boolean,
    containerRef: RefObject<HTMLElement | null>,
    onOutside: () => void
): void {
    useEffect(() => {
        if (!active) return;

        function handlePointerDown(event: PointerEvent): void {
            const container = containerRef.current;

            if (container && !container.contains(event.target as Node)) {
                onOutside();
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [active, containerRef, onOutside]);
}
