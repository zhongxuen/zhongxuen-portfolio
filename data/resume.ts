import type { ResumeConfig } from "@/types/resume";

/**
 * What goes on the résumé, and how much of it.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/resume). The object below is re-emitted in
 * full by lib/admin/serializeResumeConfig.ts on every save, so a comment placed
 * inside it will be deleted by the next one. Put notes in this header instead.
 *
 * These are the levers for the one-page target. `maxProjects`,
 * `maxBulletsPerRole` and `skillCategories` are what get pulled when the preview
 * reports two pages — not the type size, which is already at the floor of what
 * prints legibly.
 */
export const resumeConfig: ResumeConfig = {
    summary:
        "Final-semester Software Engineering student at Asia Pacific University, interning as a frontend developer. I build full-stack applications end to end, and care most about the parts usually skipped: enforced architectural boundaries, tested accessibility, and writing down what a project does not do.",
    maxProjects: 4,
    /*
     * Two of the three roles in data/experience.ts. The omitted one is the
     * 2022–2023 part-time pharmacy assistant job — real, dated work that belongs on
     * the site's timeline and not on a résumé for a software role.
     *
     * It also buys the layout its margin. Measured against A4's 841.89pt of page
     * height: at 2 roles the document needs 768pt, at 3 it needs 836pt. Three
     * roles technically fits, with six points to spare — one extra word in one
     * bullet and it is two pages. The console shows the real counts on
     * /admin/resume, so this is a stated omission rather than a hidden one.
     */
    maxRoles: 2,
    maxBulletsPerRole: 4,
    projectSummaryMaxChars: 130,
    /*
     * The four categories data/skills.ts actually populates, in rail order.
     * "Frontend" and "Backend" are in the SkillCategory union and have no members
     * — every React and Next.js entry is filed under Frameworks — so listing them
     * here printed two empty headings, which is how this list was first written and
     * why it is worth naming.
     */
    skillCategories: ["Programming Languages", "Frameworks", "Databases", "Developer Tools"],
    includeCertifications: true,
    includeQrCode: true,
};
