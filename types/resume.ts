import type { SkillCategory } from "@/types/skill";

/**
 * Curation settings for the generated résumé PDF (docs/admin-plan.md §8.1).
 *
 * Used by:
 * - data/resume.ts (the values themselves, editable from /admin/resume)
 * - lib/resume/model.ts (which applies them)
 *
 * A résumé is a *curated* view of the site, not a dump of it: twelve projects
 * and eight skill categories do not fit on one page. Making that curation data
 * rather than code is what lets the console adjust it without anyone touching
 * the renderer.
 */
export interface ResumeConfig {
    /**
     * The one paragraph a résumé needs and the site does not.
     *
     * Nothing else in `data/` is a summary — the hero is a role line and
     * `data/now.ts` is three dated facts — so this is written here rather than
     * assembled, and it is the only prose in the PDF with no counterpart on the
     * site.
     */
    summary: string;

    /** How many projects make the page. Featured first, then by `order`. */
    maxProjects: number;

    /**
     * How many experience entries make the page, newest first.
     *
     * A curation decision, not a space-saving trick — though it is both.
     * `data/experience.ts` carries three roles and the oldest is a 2022–2023
     * part-time pharmacy assistant job, which belongs on the site's timeline
     * (it is real, dated work) and not on a résumé for a software role.
     */
    maxRoles: number;

    /** Bullets kept per experience entry, from the top of `responsibilities`. */
    maxBulletsPerRole: number;

    /**
     * Character budget for a project's one-line summary.
     *
     * The single most effective lever on the one-page target, and the reason it
     * exists: `Project.description` is card copy written for a 380px card, and the
     * four entries that make the résumé run 218–240 characters each — four printed
     * lines apiece, which alone is half the main column. `buildResumeModel` cuts
     * at a clause or word boundary inside this budget (see `trimSummary`), so
     * lowering it shortens every project line at once rather than asking anyone to
     * maintain a second set of descriptions.
     */
    projectSummaryMaxChars: number;

    /**
     * Which of the eight skill categories appear, in this order.
     *
     * Order is the rail's order, so it is a layout decision as much as a content
     * one — the first category is the one a reader's eye lands on.
     */
    skillCategories: SkillCategory[];

    /** Include the certifications block. Renders nothing while `data/certifications.ts` is empty. */
    includeCertifications: boolean;

    /**
     * Draw the footer QR code (§8.3).
     *
     * Settled 2026-09-20: in. It earns its 14 mm on a printed copy, where the
     * footer URL is otherwise something to retype. It is drawn as vector rects
     * rather than a raster image, and the URL it encodes is printed as text
     * beside it — so an ATS that ignores the image loses nothing.
     */
    includeQrCode: boolean;
}
