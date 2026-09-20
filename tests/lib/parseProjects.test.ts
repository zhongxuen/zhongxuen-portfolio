import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { ProjectSourceError, parseProjects } from "@/lib/admin/parseProjects";
import { serializeProjects } from "@/lib/admin/serializeProjects";
import { readRepoFile } from "../support/readRepoFile";

const SOURCE = readRepoFile("data", "projects.ts");

describe("parseProjects", () => {
    /**
     * The pair of this and the byte-for-byte assertion in
     * serializeProjects.test.ts is what keeps the two modules honest inverses.
     * This one catches the parser falling behind; that one catches the emitter.
     */
    it("reads the real data/projects.ts back into the same data the module exports", () => {
        expect(parseProjects(SOURCE)).toEqual(projects);
    });

    it("round-trips through the serializer unchanged", () => {
        expect(serializeProjects(parseProjects(SOURCE))).toBe(SOURCE);
    });

    it("keeps `//` inside a URL out of the scanner's way", () => {
        const parsed = parseProjects(
            wrap(
                `{ slug: "s", title: "t", description: "d", technologies: [], githubUrl: "https://github.com/a/b" }`,
            ),
        );

        expect(parsed[0].githubUrl).toBe("https://github.com/a/b");
    });

    it("reads a single-quoted string, which the serializer emits for quoted prose", () => {
        const parsed = parseProjects(
            wrap(`{ slug: "s", title: 'He said "hi"', description: "d", technologies: [] }`),
        );

        expect(parsed[0].title).toBe('He said "hi"');
    });

    it("decodes escapes", () => {
        const parsed = parseProjects(
            wrap(`{ slug: "s", title: "t", description: "a\\\\b\\nc", technologies: [] }`),
        );

        expect(parsed[0].description).toBe("a\\b\nc");
    });

    it("keeps a comma inside a description out of the scanner's way", () => {
        const parsed = parseProjects(
            wrap(
                `{ slug: "s", title: "t", description: "one, two, three", technologies: ["a", "b"] }`,
            ),
        );

        expect(parsed[0].description).toBe("one, two, three");
        expect(parsed[0].technologies).toEqual(["a", "b"]);
    });

    it("reads the nested testCredentials group", () => {
        const parsed = parseProjects(
            wrap(
                `{ slug: "s", title: "t", description: "d", technologies: [], testCredentials: { password: "pw", accounts: ["a@b.c"] } }`,
            ),
        );

        expect(parsed[0].testCredentials).toEqual({ password: "pw", accounts: ["a@b.c"] });
    });

    describe("refuses anything that is not pure data", () => {
        it("a function call", () => {
            expect(() => parseProjects(wrap(`{ slug: resolve("x") }`))).toThrow(ProjectSourceError);
        });

        it("a template literal", () => {
            expect(() => parseProjects(wrap("{ slug: `x` }"))).toThrow(ProjectSourceError);
        });

        it("an identifier used as a value", () => {
            expect(() => parseProjects(wrap(`{ slug: SOME_CONSTANT }`))).toThrow(
                ProjectSourceError,
            );
        });

        it("an explicit undefined, which must be an omitted field instead", () => {
            expect(() =>
                parseProjects(
                    wrap(
                        `{ slug: "s", title: "t", description: "d", technologies: [], role: undefined }`,
                    ),
                ),
            ).toThrow(/omit the field instead/);
        });

        /**
         * The failure this parser exists to make loud: `types/project.ts` grows a
         * field, nobody teaches the serializer about it, and the next save from
         * the console deletes it from every entry. Refusing to load is the only
         * outcome that cannot lose data.
         */
        it("a field neither module knows about", () => {
            expect(() =>
                parseProjects(
                    wrap(
                        `{ slug: "s", title: "t", description: "d", technologies: [], awards: ["x"] }`,
                    ),
                ),
            ).toThrow(/unrecognised field `awards`/);
        });

        it("a missing required field", () => {
            expect(() => parseProjects(wrap(`{ slug: "s", technologies: [] }`))).toThrow(
                /missing `title`/,
            );
        });

        it("a file with no projects declaration", () => {
            expect(() => parseProjects("export const other = [];\n")).toThrow(
                /no .* declaration found/,
            );
        });
    });
});

/** Wraps one entry in the declaration the parser anchors on. */
function wrap(entry: string): string {
    return `import { Project } from "@/types/project";\n\nexport const projects: Project[] = [\n    ${entry},\n];\n`;
}
