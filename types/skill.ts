/**
 * Represents a single skill entry, grouped by category (not proficiency level).
 *
 * Used by:
 * - data/skills.ts (static skill entries)
 * - components/cards/SkillCard.tsx and components/sections/SkillsSection.tsx
 */

/**
 * Fixed set of skill categories per master_prompt.md.
 * Kept as a union (not a free string) so data/skills.ts stays consistent
 * and components can safely group/filter by category.
 */
export type SkillCategory =
    | "Frontend"
    | "Backend"
    | "Programming Languages"
    | "Databases"
    | "Frameworks"
    | "Developer Tools"
    | "Cloud & Deployment"
    | "Other Technologies";

export interface Skill {
    /** Unique identifier, e.g. "typescript" (used for keys, filtering) */
    id: string;

    /** Display name, e.g. "TypeScript" */
    name: string;

    /** Category this skill belongs to */
    category: SkillCategory;

    /**
     * Icon reference. Either:
     * - a Lucide icon name (string key resolved to a lucide-react component), or
     * - a path to a logo image in public/images/skills
     */
    icon: string;

    /** Optional: whether this skill should be highlighted in a "quick skills overview" (home page) */
    featured?: boolean;
}