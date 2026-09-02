"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    LIGHT_MEDIA_QUERY,
    THEME_COLORS,
    THEME_MODES,
    THEME_STORAGE_KEY,
    isThemeMode,
    type ResolvedTheme,
    type ThemeMode,
} from "@/lib/theme";

interface ThemeContextValue {
    /** The stored preference, `system` included. */
    mode: ThemeMode;
    /** What that resolves to right now — never `system`. */
    resolvedTheme: ResolvedTheme;
    setMode: (mode: ThemeMode) => void;
    /** `system` → `light` → `dark` → `system`. */
    cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isThemeMode(stored) ? stored : "system";
    } catch {
        return "system";
    }
}

function readSystemTheme(): ResolvedTheme {
    return window.matchMedia(LIGHT_MEDIA_QUERY).matches ? "light" : "dark";
}

/**
 * Owns the theme choice after first paint; the inline script in lib/theme.ts
 * owns it before. Renders nothing of its own.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    /*
     * Seeded during the first client render rather than in an effect. An effect
     * runs after paint, so it would spend a frame re-asserting the "system"
     * default over the attribute the inline script had already resolved
     * correctly — a flash, which is the one thing this feature must not do.
     *
     * That makes the client's initial state differ from the server's, which is
     * safe here *only* because nothing beneath renders differently per mode:
     * ThemeToggle switches its icon in CSS off `data-theme-mode` for exactly
     * this reason. A future consumer that renders `mode` into markup must gate
     * on mount, or it will hydrate against the wrong branch.
     */
    const [mode, setModeState] = useState<ThemeMode>(() =>
        typeof window === "undefined" ? "system" : readStoredMode(),
    );
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
        typeof window === "undefined" ? "dark" : readSystemTheme(),
    );

    const resolvedTheme: ResolvedTheme = mode === "system" ? systemTheme : mode;

    /*
     * Track the OS preference even while an explicit choice is in force, so
     * returning to `system` is instant instead of a frame behind. `sync()` runs
     * once on mount too: the media query can have flipped between the inline
     * script and hydration.
     */
    useEffect(() => {
        const query = window.matchMedia(LIGHT_MEDIA_QUERY);
        const sync = () => setSystemTheme(query.matches ? "light" : "dark");

        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    /*
     * Cross-tab sync (docs/uiux.md §5.2). `storage` only fires on *other*
     * documents, so this never echoes back into the tab that made the change.
     */
    useEffect(() => {
        function handleStorage(event: StorageEvent): void {
            if (event.key !== THEME_STORAGE_KEY) return;
            setModeState(isThemeMode(event.newValue) ? event.newValue : "system");
        }

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = resolvedTheme;
        root.dataset.themeMode = mode;

        /*
         * Pin the address-bar tint to the *chosen* theme. Both media-scoped
         * `theme-color` tags from app/layout.tsx get the same value, so a light
         * choice on an OS set to dark no longer leaves the browser chrome
         * mismatched. Under `system` the resolved theme already equals the OS
         * preference, so pinning both is still correct there.
         */
        document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
            meta.setAttribute("content", THEME_COLORS[resolvedTheme]);
        });
    }, [mode, resolvedTheme]);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        try {
            // `system` is stored explicitly rather than by removing the key, so
            // the storage event above carries a value other tabs can act on.
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            // Storage denied. The choice still applies for this page view.
        }
    }, []);

    const cycleMode = useCallback(() => {
        setMode(THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]);
    }, [mode, setMode]);

    const value = useMemo(
        () => ({ mode, resolvedTheme, setMode, cycleMode }),
        [mode, resolvedTheme, setMode, cycleMode],
    );

    return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
    const value = useContext(ThemeContext);

    if (value === null) {
        throw new Error("useTheme must be used inside <ThemeProvider>.");
    }

    return value;
}
