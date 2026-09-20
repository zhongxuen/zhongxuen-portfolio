import { describe, expect, it } from "vitest";
import { certifications } from "@/data/certifications";
import { education } from "@/data/education";
import { experience } from "@/data/experience";
import { projects } from "@/data/projects";
import { skills } from "@/data/skills";
import { socials } from "@/data/socials";
import { skillIconMap } from "@/components/cards/SkillCard";
import { socialIconMap } from "@/components/ui/SocialIcon";

/**
 * Guards the invariants that the type system cannot express and that fail
 * quietly in production rather than loudly at build time.
 */

describe("project slugs", () => {
    it("are unique", () => {
        const slugs = projects.map((project) => project.slug);

        expect(new Set(slugs).size).toBe(slugs.length);
    });

    it("are URL-safe (lowercase alphanumerics separated by single hyphens)", () => {
        projects.forEach((project) => {
            expect(project.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        });
    });

    it("survive URL encoding unchanged, so /projects/[slug] round-trips", () => {
        projects.forEach((project) => {
            expect(encodeURIComponent(project.slug)).toBe(project.slug);
        });
    });
});

describe("skill icons", () => {
    /*
     * SkillCard falls back to a generic Code2 glyph for an unmapped icon, so a
     * typo or a newly-added skill renders a placeholder instead of failing.
     * This is the check that would otherwise never happen.
     */
    it("all resolve in the SkillCard icon map", () => {
        const unmapped = skills
            .filter((skill) => !skillIconMap[skill.icon])
            .map((skill) => `${skill.id} -> "${skill.icon}"`);

        expect(unmapped).toEqual([]);
    });

    it("belong to skills with unique ids", () => {
        const ids = skills.map((skill) => skill.id);

        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe("social icons", () => {
    /*
     * SocialIcon renders the raw label when an icon string is unmapped — a
     * silent, easily-missed downgrade from an icon button to a text button,
     * in both the footer and the contact section.
     */
    it("all resolve in the shared social icon map", () => {
        const unmapped = socials
            .filter((social) => !socialIconMap[social.icon])
            .map((social) => `${social.id} -> "${social.icon}"`);

        expect(unmapped).toEqual([]);
    });

    it("belong to socials with unique ids and resolvable URLs", () => {
        const ids = socials.map((social) => social.id);

        expect(new Set(ids).size).toBe(ids.length);
        socials.forEach((social) => {
            expect(() => new URL(social.url)).not.toThrow();
        });
    });
});

/**
 * Ids across the four career files (docs/admin-plan.md §17.1).
 *
 * Every section keys its list on `id`, so a duplicate makes React reuse a DOM
 * node across two different entries — one entry's text rendering inside
 * another's card, on the live site, with nothing anywhere reporting it. The
 * console's own form checks this before a save; these files can also be edited
 * by hand and pushed, which is the path that has no form in it.
 */
describe("career ids", () => {
    const lists = [
        ["experience", experience],
        ["education", education],
        ["skills", skills],
        ["certifications", certifications],
    ] as const;

    it.each(lists)("%s ids are unique", (_name, entries) => {
        const ids = entries.map((entry) => entry.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(lists)("%s ids are lowercase and hyphenated", (_name, entries) => {
        entries.forEach((entry) => {
            expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        });
    });
});

/**
 * Dated entries, checked as ranges.
 *
 * `"Present"` is a value, not a missing end date: ExperienceSection derives
 * "current" from that exact string, so a fixed date — even one in the future —
 * renders a running role as finished history. A range that runs backwards is a
 * typo that renders as a nonsense duration rather than as an error.
 */
describe("career date ranges", () => {
    it.each([
        ["experience", experience],
        ["education", education],
    ] as const)("%s entries start before they end", (_name, entries) => {
        entries.forEach((entry) => {
            expect(entry.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

            if (entry.endDate && entry.endDate !== "Present") {
                expect(entry.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(entry.endDate >= entry.startDate).toBe(true);
            }
        });
    });
});
