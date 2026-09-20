import { describe, expect, it } from "vitest";
import { certifications } from "@/data/certifications";
import { education } from "@/data/education";
import { experience } from "@/data/experience";
import { skills } from "@/data/skills";
import {
    parseCertifications,
    parseEducation,
    parseExperience,
    parseSkills,
} from "@/lib/admin/parseCareer";
import {
    serializeCertifications,
    serializeEducation,
    serializeExperience,
    serializeSkills,
} from "@/lib/admin/serializeCareer";
import { ModuleSourceError } from "@/lib/admin/parseModule";
import { readRepoFile } from "../support/readRepoFile";
import type { Certification } from "@/types/certification";
import type { Education } from "@/types/education";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";

/**
 * The four career files, held to the same standard as `data/projects.ts`.
 *
 * **The byte-for-byte assertion is the important one.** A serializer that is
 * merely close produces a file that still compiles and has quietly lost a
 * field — and unlike a broken build, nobody finds out. Serializing the live
 * array and comparing it to the file on disk covers key order, quote choice,
 * wrapping, escaping and omission in one assertion, and it fails the day any of
 * them drifts.
 *
 * The round trip is the second half: parse what was emitted and prove it equals
 * what went in. Together they are what `lib/admin/validate.ts` enforces at
 * runtime before every commit, checked here at build time against real data.
 */

/**
 * Each case is wrapped in a lambda rather than cast.
 *
 * A cast of the *function type* — `parseExperience as (s: string) => object[]` —
 * does not typecheck, because `Experience` has no index signature, and forcing
 * it through `unknown` would switch off exactly the checking this file exists to
 * provide. Wrapping keeps each call site correctly typed and makes the table
 * homogeneous at the boundary only.
 */
const CASES = [
    {
        file: "experience.ts",
        entries: experience as readonly object[],
        serialize: (entries: readonly object[]) => serializeExperience(entries as Experience[]),
        parse: (source: string): object[] => parseExperience(source),
    },
    {
        file: "education.ts",
        entries: education as readonly object[],
        serialize: (entries: readonly object[]) => serializeEducation(entries as Education[]),
        parse: (source: string): object[] => parseEducation(source),
    },
    {
        file: "skills.ts",
        entries: skills as readonly object[],
        serialize: (entries: readonly object[]) => serializeSkills(entries as Skill[]),
        parse: (source: string): object[] => parseSkills(source),
    },
    {
        file: "certifications.ts",
        entries: certifications as readonly object[],
        serialize: (entries: readonly object[]) =>
            serializeCertifications(entries as Certification[]),
        parse: (source: string): object[] => parseCertifications(source),
    },
] as const;

describe.each(CASES)("data/$file", ({ file, entries, serialize, parse }) => {
    it("serializes to exactly the file in the repository", () => {
        expect(serialize(entries)).toBe(readRepoFile("data", file));
    });

    it("parses the repository file back to the same data", () => {
        expect(parse(readRepoFile("data", file))).toEqual(entries);
    });

    it("round-trips its own output", () => {
        expect(parse(serialize(entries))).toEqual(entries);
    });

    /*
     * Prettier collapses an empty array onto one line. Emitting the open-and-
     * close form would produce a file that fails `npm run format:check` the
     * moment the console removes the last entry from a list — which
     * data/certifications.ts found immediately, being empty already.
     */
    it("collapses an empty list the way Prettier would", () => {
        const emptied = serialize([]);

        expect(emptied).toMatch(/= \[\];\n$/);
        expect(emptied).not.toContain("[\n]");
        expect(parse(emptied)).toEqual([]);
    });

    it("warns, in the file itself, that comments inside the array are destroyed", () => {
        expect(readRepoFile("data", file)).toContain("WRITTEN BY THE ADMIN CONSOLE");
    });
});

describe("the parser refuses what the serializer cannot have written", () => {
    /**
     * The failure this exists to make loud: a type grows a field, nobody teaches
     * the serializer about it, and the next save from the console deletes it from
     * every entry. Refusing to load is the only outcome that cannot lose data.
     */
    it("a field neither module knows about", () => {
        const source = wrapSkills(
            `{ id: "x", name: "X", category: "Frameworks", icon: "i", rank: 3 }`,
        );

        expect(() => parseSkills(source)).toThrow(/unrecognised field `rank`/);
    });

    it("a missing required field", () => {
        expect(() => parseSkills(wrapSkills(`{ id: "x", name: "X" }`))).toThrow(
            /missing `category`/,
        );
    });

    it("an identifier used as a value", () => {
        expect(() => parseSkills(wrapSkills(`{ id: SOME_CONST }`))).toThrow(ModuleSourceError);
    });

    it("a template literal", () => {
        expect(() => parseSkills(wrapSkills("{ id: `x` }"))).toThrow(ModuleSourceError);
    });

    it("an explicit undefined, which must be an omitted field instead", () => {
        const source = wrapSkills(
            `{ id: "x", name: "X", category: "Frameworks", icon: "i", featured: undefined }`,
        );

        expect(() => parseSkills(source)).toThrow(/omit the field instead/);
    });
});

describe("comments", () => {
    /*
     * Reading them has to work — data/skills.ts grouped its entries with `//`
     * lines and data/experience.ts carried a block comment about one date, and a
     * hand-edit is expected to add more. Keeping them through a save cannot
     * work, because the printer re-emits the array whole; that is what the header
     * warning above is for.
     */
    it("are skipped, not misread as data", () => {
        const source = wrapSkills(
            `// a heading\n    { id: "x", /* inline */ name: "X", category: "Frameworks", icon: "i" }`,
        );

        expect(parseSkills(source)).toEqual([
            { id: "x", name: "X", category: "Frameworks", icon: "i" },
        ]);
    });

    it("cannot be faked from inside a string", () => {
        const source = wrapSkills(
            `{ id: "x", name: "a // not a comment", category: "Frameworks", icon: "https://x.dev/i.svg" }`,
        );

        expect(parseSkills(source)[0]).toEqual({
            id: "x",
            name: "a // not a comment",
            category: "Frameworks",
            icon: "https://x.dev/i.svg",
        });
    });

    it("rejects an unterminated block comment rather than swallowing the file", () => {
        expect(() => parseSkills(wrapSkills(`/* never closed\n    { id: "x" }`))).toThrow(
            /unterminated block comment/,
        );
    });
});

/** Wraps entries in the declaration the skills parser anchors on. */
function wrapSkills(body: string): string {
    return `import { Skill } from "@/types/skill";\n\nexport const skills: Skill[] = [\n    ${body},\n];\n`;
}
