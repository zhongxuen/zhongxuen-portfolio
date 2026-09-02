import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import {
    PATTERN_HEIGHT,
    PATTERN_WIDTH,
    buildBlueprintPattern,
    hashSlug,
} from "@/lib/projectPattern";

/**
 * The fallback artwork is the default path for card imagery, not an error
 * state, so its two contracts are load-bearing:
 *
 *   1. Determinism — the same slug must draw the same picture on every render
 *      and every machine, or a static build is not reproducible and a card
 *      would flicker between shapes on navigation.
 *   2. Distinctness — a grid of nine identical drawings would be worse than no
 *      drawing at all.
 */

describe("buildBlueprintPattern", () => {
    it("is deterministic for a given slug", () => {
        const first = buildBlueprintPattern("jobnow");
        const second = buildBlueprintPattern("jobnow");

        expect(second).toEqual(first);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });

    it("produces different geometry for different slugs", () => {
        const a = JSON.stringify(buildBlueprintPattern("jobnow"));
        const b = JSON.stringify(buildBlueprintPattern("ecoquest"));

        expect(a).not.toBe(b);
    });

    it("separates slugs that differ by a single character", () => {
        const a = JSON.stringify(buildBlueprintPattern("ecoquest"));
        const b = JSON.stringify(buildBlueprintPattern("ecoquests"));

        expect(a).not.toBe(b);
    });

    it("gives every real project its own drawing", () => {
        const drawings = projects.map((project) =>
            JSON.stringify(buildBlueprintPattern(project.slug)),
        );

        expect(new Set(drawings).size).toBe(drawings.length);
    });

    it("keeps every plate inside the viewBox", () => {
        for (const project of projects) {
            const { plates } = buildBlueprintPattern(project.slug);

            expect(plates.length).toBeGreaterThanOrEqual(3);

            for (const plate of plates) {
                expect(plate.x).toBeGreaterThanOrEqual(0);
                expect(plate.y).toBeGreaterThanOrEqual(0);
                expect(plate.x + plate.width).toBeLessThanOrEqual(PATTERN_WIDTH);
                expect(plate.y + plate.height).toBeLessThanOrEqual(PATTERN_HEIGHT);
            }
        }
    });

    it("labels every drawing with a two-digit figure number", () => {
        for (const project of projects) {
            expect(buildBlueprintPattern(project.slug).label).toMatch(/^FIG\.\d{2}$/);
        }
    });
});

describe("hashSlug", () => {
    it("returns an unsigned 32-bit integer", () => {
        for (const slug of ["", "a", "jobnow", "a-very-long-project-slug-indeed"]) {
            const hash = hashSlug(slug);

            expect(Number.isInteger(hash)).toBe(true);
            expect(hash).toBeGreaterThanOrEqual(0);
            expect(hash).toBeLessThan(2 ** 32);
        }
    });
});
