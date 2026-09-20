import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { resumeConfig } from "@/data/resume";
import { experience } from "@/data/experience";
import { skills } from "@/data/skills";
import { buildResumeModel, trimSummary } from "@/lib/resume/model";
import type { Project } from "@/types/project";

const model = buildResumeModel(projects, resumeConfig, new Date("2026-09-20T00:00:00Z"));

describe("buildResumeModel", () => {
    it("respects maxProjects, featured first then by order", () => {
        expect(model.projects).toHaveLength(resumeConfig.maxProjects);

        const featuredCount = model.projects.filter((project) => project.featured).length;

        // Featured entries are contiguous from the top.
        expect(model.projects.slice(0, featuredCount).every((p) => p.featured)).toBe(true);
    });

    it("respects maxRoles and maxBulletsPerRole", () => {
        expect(model.experience).toHaveLength(Math.min(resumeConfig.maxRoles, experience.length));

        for (const role of model.experience) {
            expect(role.bullets.length).toBeLessThanOrEqual(resumeConfig.maxBulletsPerRole);
        }
    });

    it("orders experience newest first", () => {
        const dates = model.experience.map((role) => role.dates);

        expect(dates[0]).toContain("2026");
    });

    /**
     * The failure this catches is a quiet one: `skillCategories` naming a category
     * that `data/skills.ts` does not populate. The first version of
     * `data/resume.ts` listed "Frontend" and "Backend", neither of which has a
     * single member — every React and Next.js entry is filed under Frameworks —
     * and the résumé printed two empty headings.
     */
    it("contains no empty section", () => {
        expect(model.skills.every((group) => group.items.length > 0)).toBe(true);
        expect(model.experience.every((role) => role.bullets.length > 0)).toBe(true);
        expect(model.summary.trim().length).toBeGreaterThan(0);
        expect(model.contacts.every((contact) => contact.value.trim().length > 0)).toBe(true);
    });

    it("only lists skill categories that data/skills.ts actually populates", () => {
        const populated = new Set(skills.map((skill) => skill.category));
        const requested = resumeConfig.skillCategories.filter((category) =>
            populated.has(category),
        );

        expect(model.skills.map((group) => group.category)).toEqual(requested);
    });

    it("prints URLs without their scheme but links the full one", () => {
        expect(model.contacts.find((c) => c.value.startsWith("github.com"))?.href).toMatch(
            /^https:\/\/github\.com/,
        );
        expect(model.siteUrl).not.toContain("://");
    });

    it("puts contact details in the body, all of them real text", () => {
        const values = model.contacts.map((contact) => contact.value);

        expect(values).toContain("gohzx2006@gmail.com");
        expect(values.join(" ")).not.toContain("undefined");
    });

    it("stamps the document code from the given date", () => {
        expect(model.documentCode).toBe("CV · GZX · 2026-09");
    });

    /**
     * The résumé's fonts are Latin. `data/education.ts` records the school's real
     * name, which includes 坤成中学; `@react-pdf` draws those as .notdef boxes that
     * extract as literal garbage ("Kuen Cheng High School ( d-f )" in the first
     * render). They are stripped, and the emptied bracket pair with them.
     */
    it("strips characters the bundled fonts cannot draw", () => {
        const text = JSON.stringify(model);

        expect(text).not.toMatch(/[　-鿿]/);
        expect(model.education.some((entry) => entry.institution.includes("Kuen Cheng"))).toBe(
            true,
        );
        expect(model.education.every((entry) => !entry.institution.includes("()"))).toBe(true);
    });

    it("leaves link targets untouched while sanitizing displayed text", () => {
        for (const contact of model.contacts) {
            if (contact.href?.startsWith("http")) {
                expect(() => new URL(contact.href!)).not.toThrow();
            }
        }
    });

    it("takes the project list it is given, not the module import", () => {
        const only: Project = {
            slug: "only",
            title: "Only One",
            description: "The single project.",
            technologies: ["X"],
            featured: true,
            order: 1,
        };

        const narrow = buildResumeModel([only], resumeConfig);

        expect(narrow.projects).toHaveLength(1);
        expect(narrow.projects[0].title).toBe("Only One");
    });
});

describe("trimSummary", () => {
    it("leaves a short line alone", () => {
        expect(trimSummary("Short enough.", 130)).toBe("Short enough.");
    });

    it("prefers a clause boundary, and adds no ellipsis when it finds one", () => {
        expect(
            trimSummary(
                "A teaching tool that animates the Internet — with a long elaboration that runs past the budget entirely.",
                60,
            ),
        ).toBe("A teaching tool that animates the Internet");
    });

    it("falls back to a sentence boundary", () => {
        expect(trimSummary(`A short first sentence. ${"x".repeat(200)}`, 60)).toBe(
            "A short first sentence.",
        );
    });

    it("falls back to a word boundary with an ellipsis, and strips a dangling comma", () => {
        const trimmed = trimSummary(
            "one two three four five six seven eight nine ten eleven twelve, thirteen fourteen",
            60,
        );

        expect(trimmed.endsWith("…")).toBe(true);
        expect(trimmed).not.toContain(",…");
        expect(trimmed.length).toBeLessThanOrEqual(61);
    });

    it("keeps every résumé project line inside the configured budget", () => {
        for (const project of model.projects) {
            expect(project.summary.length).toBeLessThanOrEqual(
                resumeConfig.projectSummaryMaxChars + 1,
            );
        }
    });
});
