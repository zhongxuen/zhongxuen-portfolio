/**
 * Represents a single navigation item used in header/footer navigation.
 *
 * Used by:
 * - data/navigation.ts (static nav entries)
 * - components/layout/Header.tsx, components/navigation/*
 */

export interface NavItem {
    /** Unique identifier, e.g. "about", "projects" */
    id: string;

    /** Display label, e.g. "About" */
    label: string;

    /** Destination path or anchor, e.g. "/about" or "#projects" */
    href: string;

    /** Whether this link points to an external site (opens in new tab) */
    external?: boolean;

    /** Optional nested items, e.g. for a dropdown menu */
    children?: NavItem[];
}