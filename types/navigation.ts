/**
 * Represents a single navigation item used in header/footer navigation.
 *
 * Used by:
 * - data/navigation.ts (static nav entries)
 * - components/layout/Header.tsx, components/navigation/*
 */

export interface NavigationItem {
    id: string;
    label: string;
    href: string;
    external?: boolean;
    children?: NavigationItem[];
}

export type NavItem = NavigationItem;