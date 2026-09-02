/**
 * Route-aware resolution for the `#section` hrefs in data/navigation.ts.
 *
 * Those hrefs are written bare (`#about`) because the sections live on `/`.
 * Rendered as-is from a subpage they resolve against that page instead —
 * `/projects/foo#about` — and go nowhere. Both the navbar and the footer
 * render the same list, so the rule lives here rather than in either.
 */

/** True when `href` points at a section of the page already being rendered. */
export function isSamePageHash(href: string, isHome: boolean): boolean {
    return href.startsWith("#") && isHome;
}

/** Rewrites a bare `#section` href to `/#section` when off the home route. */
export function resolveNavHref(href: string, isHome: boolean): string {
    return href.startsWith("#") && !isHome ? `/${href}` : href;
}
