/**
 * Represents a single social/contact link (GitHub, LinkedIn, email, etc.).
 *
 * Used by:
 * - data/socials.ts (static social link entries)
 * - components/layout/Footer.tsx, contact/hero sections
 */

export interface Social {
    /** Unique identifier, e.g. "github", "linkedin", "email" */
    id: string;

    /** Display label, e.g. "GitHub" */
    label: string;

    /** Destination URL (or "mailto:" / "tel:" links) */
    url: string;

    /** Lucide icon name used to render this social link */
    icon: string;

    /** Whether this link should appear in primary/prominent placements (e.g. hero CTA) */
    featured?: boolean;
}