"use client";

import { RefObject, useEffect } from "react";

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Confines keyboard focus to `containerRef` while `active`, closes on Escape,
 * and restores focus to whatever was focused before opening.
 *
 * Shared by the mobile nav panel and (from Phase 5) the command palette — the
 * same three rules are required of both, so they live here rather than being
 * written twice.
 *
 * `onEscape` is an effect dependency: pass a stable callback (useCallback).
 */
export function useFocusTrap(
    active: boolean,
    containerRef: RefObject<HTMLElement | null>,
    onEscape?: () => void
): void {
    useEffect(() => {
        if (!active) return;

        const container = containerRef.current;
        if (!container) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        function focusable(): HTMLElement[] {
            return Array.from(
                container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter((el) => el.getClientRects().length > 0);
        }

        // Only pull focus in if it is not already inside. Opening a menu from
        // its own toggle button leaves focus on that toggle, which is where the
        // user expects it — Tab then walks into the panel in DOM order.
        if (!container.contains(document.activeElement)) {
            focusable()[0]?.focus();
        }

        function handleKeyDown(event: KeyboardEvent): void {
            if (event.key === "Escape") {
                event.preventDefault();
                onEscape?.();
                return;
            }

            if (event.key !== "Tab") return;

            const items = focusable();
            if (items.length === 0) return;

            const first = items[0];
            const last = items[items.length - 1];
            const current = document.activeElement;

            if (event.shiftKey && (current === first || !container!.contains(current))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && current === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);

            // Only pull focus back if it is still inside the closing container.
            // Otherwise the user has already moved elsewhere and restoring
            // would yank them backwards.
            if (container.contains(document.activeElement)) {
                previouslyFocused?.focus();
            }
        };
    }, [active, containerRef, onEscape]);
}
