"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const ICON_SIZE = 20;

/**
 * Cycles `system` → `light` → `dark`, per docs/uiux.md §5.2.
 *
 * Which icon — and which accessible name — is shown is decided in CSS from the
 * `data-theme-mode` attribute on `<html>` (see the THEME TOGGLE block in
 * app/globals.css). All three are always in the markup. That keeps the server
 * render mode-independent, so there is no `mounted` gate, no hydration
 * mismatch, and the right icon is on screen in the first frame instead of
 * popping in after hydration.
 *
 * The button is therefore inert but present without JS. That is the same deal
 * as the mobile menu trigger, and the underlying preference is still honoured
 * there by the `prefers-color-scheme` branch of the palette.
 *
 * The rotation on hover is on the button, not on the icons: only one of the
 * three is displayed at a time and which one is a CSS decision this file
 * cannot see, so turning the container is the only way to move whichever is
 * actually on screen.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { cycleMode } = useTheme();

    return (
        <button
            type="button"
            onClick={cycleMode}
            className={cn(
                "bp-focus inline-flex items-center justify-center rounded-sm p-2 text-ink-muted transition-[color,background-color,rotate] duration-base ease-bp hover:rotate-[18deg] hover:bg-surface hover:text-ink",
                className,
            )}
        >
            <Monitor size={ICON_SIZE} aria-hidden="true" data-theme-icon="system" />
            <Sun size={ICON_SIZE} aria-hidden="true" data-theme-icon="light" />
            <Moon size={ICON_SIZE} aria-hidden="true" data-theme-icon="dark" />

            {/* The button's accessible name, switched by the same CSS so it
                always describes the state the icon is showing. */}
            <span className="sr-only" data-theme-icon="system">
                Theme: system. Switch to light.
            </span>
            <span className="sr-only" data-theme-icon="light">
                Theme: light. Switch to dark.
            </span>
            <span className="sr-only" data-theme-icon="dark">
                Theme: dark. Switch to system.
            </span>
        </button>
    );
}
