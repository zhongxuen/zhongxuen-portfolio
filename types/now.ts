/**
 * One line of the "NOW" block in the About section (docs/uiux.md §4.3).
 *
 * Used by:
 * - data/now.ts (the entries themselves)
 * - components/sections/AboutSection.tsx
 */

export interface NowEntry {
    /** Stable key, e.g. "ted-optimus-internship". */
    id: string;

    /** Mono verb rendered as the row's label, e.g. "Building". */
    label: string;

    /** One sentence on what is actually happening. No aspirations. */
    detail: string;

    /**
     * ISO date this became true, shown as the row's timestamp. Required rather
     * than optional: a "now" list with no dates has no way of telling a reader
     * — or its own author — that it has gone stale.
     */
    since: string;
}
