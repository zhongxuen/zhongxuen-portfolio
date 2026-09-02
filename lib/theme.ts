/**
 * Theme plumbing shared by the server and the client.
 *
 * Deliberately has no `"use client"` directive and imports no React: the root
 * layout is a Server Component and needs `THEME_SCRIPT` and `THEME_COLORS` as
 * plain values, which it could not get across a client boundary.
 *
 * The runtime half lives in hooks/useTheme.tsx, the palette it selects in
 * app/globals.css, and the control in components/ui/ThemeToggle.tsx.
 */

/** What the visitor chose. `system` defers to the OS. */
export type ThemeMode = "system" | "light" | "dark";

/** What that choice resolves to right now — what `data-theme` actually holds. */
export type ResolvedTheme = "light" | "dark";

/** Cycle order for the toggle (docs/uiux.md §5.2). */
export const THEME_MODES = ["system", "light", "dark"] as const;

export const THEME_STORAGE_KEY = "bp-theme";

/** The one media query the whole feature is keyed off. */
export const LIGHT_MEDIA_QUERY = "(prefers-color-scheme: light)";

/**
 * Address-bar tint per resolved theme. Mirrors `--bp-void` in app/globals.css;
 * the meta tags are emitted at build time so they cannot read the token, and
 * hooks/useTheme.tsx repoints them when the choice changes.
 */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
    light: "#eef2f7",
    dark: "#070c14",
};

export function isThemeMode(value: unknown): value is ThemeMode {
    return value === "system" || value === "light" || value === "dark";
}

/**
 * Pre-paint theme resolution, inlined as the first node in `<body>` so it runs
 * while the parser is still ahead of every pixel of content. Nothing later —
 * hydration least of all — is early enough to avoid a flash of the wrong theme
 * on a hard reload.
 *
 * It writes two attributes on `<html>`:
 *   `data-theme`       the resolved theme; the palette keys off it.
 *   `data-theme-mode`  the stored preference; the toggle's icon and accessible
 *                      name key off it, which is what lets ThemeToggle render
 *                      the same markup on the server in all three modes.
 *
 * If storage is unavailable (partitioned or private contexts throw on read) it
 * writes nothing and the `prefers-color-scheme` branch in globals.css takes
 * over — the same path a visitor with JS disabled gets.
 *
 * Interpolated from the constants above rather than hardcoded, so the key and
 * the query cannot drift from the ones the React side uses.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,m=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
)});if(m!=="light"&&m!=="dark")m="system";d.dataset.theme=m==="system"?(window.matchMedia(${JSON.stringify(
    LIGHT_MEDIA_QUERY,
)}).matches?"light":"dark"):m;d.dataset.themeMode=m;}catch(e){}})();`;
