import { describe, expect, it } from "vitest";
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
