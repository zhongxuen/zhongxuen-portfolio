"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "portfolio-theme";
const DEFAULT_THEME: Theme = "dark";

function isTheme(value: string | null): value is Theme {
    return value === "dark" || value === "light";
}

/**
 * Manages theme state with localStorage persistence.
 *
 * NOTE: The current design system (master_prompt.md) is dark-first only.
 * This hook exists for forward compatibility with the "Dark/Light themes"
 * item under Future Expansion, and is not currently wired to a visible
 * toggle in the UI. Applies/removes a "light" class on <html>; dark
 * remains the unstyled default per the existing Tailwind color tokens.
 */
export function useTheme() {
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const initial: Theme = isTheme(stored) ? stored : DEFAULT_THEME;

        setTheme(initial);
        document.documentElement.classList.toggle("light", initial === "light");
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next: Theme = prev === "dark" ? "light" : "dark";

            window.localStorage.setItem(STORAGE_KEY, next);
            document.documentElement.classList.toggle("light", next === "light");

            return next;
        });
    }, []);

    return { theme, toggleTheme };
}