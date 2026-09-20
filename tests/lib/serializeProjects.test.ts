import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { serializeProjects } from "@/lib/admin/serializeProjects";
import { readRepoFile } from "../support/readRepoFile";
import type { Project } from "@/types/project";

const SOURCE = readRepoFile("data", "projects.ts");

describe("serializeProjects", () => {
    /**
     * The important one.
     *
     * Serializing the live array and comparing to the real file guards key
     * order, quote choice, 100-column wrapping, escaping, field omission and the
     * "no comments inside the array" constraint — all of it, in one assertion,
     * against the only reference that cannot go stale.
     *
     * When this fails after an intentional formatting change, the fix is to make
     * the serializer emit the new shape and let `npm run format` normalise the
     * data file; it is never to loosen this assertion.
     */
    it("reproduces data/projects.ts byte for byte", () => {
        expect(serializeProjects(projects)).toBe(SOURCE);
    });

    it("round-trips: the emitted text parses back to the same data", async () => {
        /*
         * Evaluated rather than written to a temp file and imported: the emitted
         * source's only import is `@/types/project`, which is types-only and
         * erased at runtime, so stripping the import and the `export const`
         * leaves a plain array literal. That avoids a temp-file fixture and a
         * second module resolver in the test environment.
         */
        const source = serializeProjects(projects)
            .replace(/^import[^\n]*\n/, "")
            .replace(/\/\*\*[\s\S]*?\*\/\n/, "")
            .replace("export const projects: Project[] = ", "return ");

        const parsed = new Function(source)() as Project[];

        expect(parsed).toEqual(stripGitHubFields(projects));
    });

    it("omits GitHub-derived fields even when the input carries them", () => {
        const enriched: Project = {
            ...projects[0],
            language: "TypeScript",
            stars: 12,
            lastUpdated: "2026-09-01T00:00:00Z",
            publishedAt: "2026-01-01T00:00:00Z",
        };

        const output = serializeProjects([enriched]);

        expect(output).not.toContain("language:");
        expect(output).not.toContain("stars:");
        expect(output).not.toContain("lastUpdated:");
        expect(output).not.toContain("publishedAt:");
    });

    it("escapes backslashes and newlines, and picks the quote that escapes less", () => {
        const output = serializeProjects([
            {
                slug: "escapes",
                title: 'He said "hello"',
                description: "A back\\slash and a\nnewline.",
                technologies: ["a'b"],
            },
        ]);

        // More double quotes than single → Prettier writes the string in single quotes.
        expect(output).toContain("title: 'He said \"hello\"',");
        expect(output).toContain('description: "A back\\\\slash and a\\nnewline.",');
        // More single quotes than double → double-quoted, unescaped.
        expect(output).toContain('technologies: ["a\'b"],');
    });

    it("keeps `featured: false` and `order: 0`, which are falsy but not absent", () => {
        const output = serializeProjects([
            {
                slug: "falsy",
                title: "Falsy",
                description: "Present.",
                technologies: ["x"],
                featured: false,
                order: 0,
            },
        ]);

        expect(output).toContain("featured: false,");
        expect(output).toContain("order: 0,");
    });

    it("omits empty optional fields rather than writing undefined or []", () => {
        const output = serializeProjects([
            {
                slug: "sparse",
                title: "Sparse",
                description: "Present.",
                technologies: ["x"],
                longDescription: "",
                keyFeatures: [],
                role: undefined,
            },
        ]);

        expect(output).not.toContain("undefined");
        expect(output).not.toContain("longDescription");
        expect(output).not.toContain("keyFeatures");
        expect(output).not.toContain("role");
    });
});

/** The four fields the serializer refuses to write, dropped so the round-trip can compare. */
function stripGitHubFields(list: Project[]): Project[] {
    return list.map((project) => {
        const copy = { ...project };

        delete copy.language;
        delete copy.stars;
        delete copy.lastUpdated;
        delete copy.publishedAt;

        return copy;
    });
}
