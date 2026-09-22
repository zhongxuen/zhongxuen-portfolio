import type { SkillCategory } from "@/types/skill";

/**
 * Curation settings for the generated résumé PDF (docs/admin-plan.md §8.1).
 *
 * Used by:
 * - data/resume.ts (the values themselves, editable from /admin/resume)
 * - lib/resume/model.ts (which applies them)
 *
 * A résumé is a *curated* view of the site, not a dump of it. Making that
 * curation data rather than code is what lets the console adjust it without
 * anyone touching the renderer.
 *
 * Two kinds of field live here: **levers** (how much of the site's data makes
 * the page) and **résumé-only facts** (summary, highlights, soft skills,
 * languages, interests, availability) — the things an employer expects on a CV
 * that the site has no other home for.
 */
export interface ResumeConfig {
    /**
     * The opening paragraph, two or three sentences.
     *
     * Nothing else in `data/` is a summary — the hero is a role line and
     * `data/now.ts` is three dated facts — so this is written here rather than
     * assembled.
     */
    summary: string;

    /**
     * Three to five bullets under the summary: the reasons to keep reading.
     *
     * Each one should be traceable to something elsewhere in `data/` — a role, a
     * project's key features, the CGPA. They are the résumé's pitch, and a pitch
     * a reader can verify on the linked site is the only kind worth making.
     */
    highlights: string[];

    /**
     * The page budget. The admin console warns, and the render test fails, when
     * the document runs longer. Two is the right number for this much work: one
     * page forced every project down to a single trimmed line.
     */
    maxPages: number;

    /** How many projects get a full entry. Featured first, then by `order`. */
    maxProjects: number;

    /**
     * Key-feature bullets per project, from the top of `keyFeatures`.
     *
     * The description says what a project is; these say what was hard about it,
     * which is what an engineer reading the résumé is actually looking for.
     */
    maxFeaturesPerProject: number;

    /**
     * Character budget for one key-feature bullet. `keyFeatures` is written for
     * the case-study page and some entries run past 200 characters; they are cut
     * at a clause boundary by `trimSummary`.
     */
    featureMaxChars: number;

    /**
     * Character budget for a project's summary line. Card descriptions run
     * 120–240 characters; at 2 pages the full text fits, so this is set high and
     * only guards against a future essay.
     */
    projectSummaryMaxChars: number;

    /**
     * Name every project past `maxProjects` in one closing line, so nothing on the
     * site is invisible on the résumé — a reader sees the full breadth and where
     * to find the case studies.
     */
    listRemainingProjects: boolean;

    /** How many experience entries make the page, newest first. */
    maxRoles: number;

    /** Bullets kept per experience entry, from the top of `responsibilities`. */
    maxBulletsPerRole: number;

    /**
     * Which skill categories appear, in this order. A category with no members in
     * `data/skills.ts` is dropped rather than printed empty.
     */
    skillCategories: SkillCategory[];

    /**
     * Print names for categories whose site name reads badly on a CV — "Other
     * Technologies" is a bucket on the site and "Digital Forensics" on paper.
     */
    skillCategoryLabels: Partial<Record<SkillCategory, string>>;

    /** Printed as the last row of the skills table. Empty hides the row. */
    softSkills: string[];

    /** e.g. "English (Fluent)". Empty hides the row. */
    languages: string[];

    /** Empty hides the row. */
    interests: string[];

    /** One line on when and for what, printed at the foot of the summary. Empty hides it. */
    availability: string;

    /** Include the certifications block. Renders nothing while `data/certifications.ts` is empty. */
    includeCertifications: boolean;

    /**
     * Draw the header QR code (§8.3).
     *
     * Drawn as vector rects rather than a raster image, and the URL it encodes is
     * printed as text in the contact row — so an ATS that ignores it loses nothing.
     */
    includeQrCode: boolean;
}
