import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import {
    UnsafeWriteError,
    checkProjectInvariants,
    safeCareerSource,
    safeProjectsSource,
    verifyRoundTrip,
} from "@/lib/admin/validate";
import { serializeSkills } from "@/lib/admin/serializeCareer";
import { parseSkills } from "@/lib/admin/parseCareer";
import type { Project } from "@/types/project";

/**
 * The pre-commit gate (lib/admin/validate.ts).
 *
 * Under this console's central bet — GitHub is the database, there is no
 * staging, a save is a commit to `main` — a serializer bug does not produce an
 * error message, it produces a deploy. These tests are about the gate refusing
 * in exactly the cases that would otherwise reach `main` silently.
 */

const BASE: Project = {
    slug: "a-project",
    title: "A project",
    description: "Something short.",
    technologies: ["TypeScript"],
};

describe("safeProjectsSource", () => {
    it("passes the live file and returns its text", () => {
        const { source } = safeProjectsSource(projects);

        expect(source).toContain("export const projects: Project[] = [");
    });

    /*
     * The case the gate exists for. A blank optional is omitted by the printer
     * rather than written as `""`, so an input carrying one and a parse result
     * carrying nothing at all are the same file — and a gate that did not know
     * that would reject nearly every save made from a form.
     */
    it("does not mistake an omitted empty optional for data loss", () => {
        expect(() =>
            safeProjectsSource([{ ...BASE, role: "", keyFeatures: [], longDescription: "" }]),
        ).not.toThrow();
    });

    /*
     * The four GitHub-derived fields are overlaid at request time by
     * adapters/githubProjectAdapter.ts and must never be written to the file, so
     * their absence from the output is correct. Objects reaching a save often
     * carry them, because they came from `getProjects()`.
     */
    it("ignores the GitHub-derived fields the serializer deliberately drops", () => {
        const withOverlay = {
            ...BASE,
            stars: 12,
            language: "TypeScript",
            lastUpdated: "2026-01-01",
        } as Project;

        expect(() => safeProjectsSource([withOverlay])).not.toThrow();
    });

    it("preserves prose that would break a careless quoter", () => {
        const tricky: Project = {
            ...BASE,
            description: `A phrase like "last 90 days", and it's got an apostrophe.`,
            longDescription: "Line one.\nLine two.\tTabbed.\\Backslash.",
        };

        const { source } = safeProjectsSource([tricky]);

        expect(source).toBeTypeOf("string");
        expect(() => safeProjectsSource([tricky])).not.toThrow();
    });

    describe("refuses to commit", () => {
        it("a duplicate slug, which would make one project stop existing", () => {
            expect(() => safeProjectsSource([BASE, { ...BASE, title: "Another" }])).toThrow(
                UnsafeWriteError,
            );
        });

        it("a slug that is not URL-safe", () => {
            expect(() => safeProjectsSource([{ ...BASE, slug: "Not A Slug" }])).toThrow(
                /not URL-safe/,
            );
        });

        it("a screenshot outside /images/projects/", () => {
            expect(() =>
                safeProjectsSource([{ ...BASE, screenshots: ["/elsewhere/shot.png"] }]),
            ).toThrow(/outside \/images\/projects/);
        });

        it("an entry with no title", () => {
            expect(() => safeProjectsSource([{ ...BASE, title: "   " }])).toThrow(UnsafeWriteError);
        });
    });

    /*
     * A warning, not a refusal. Duplicate `order` values sort arbitrarily against
     * each other, which is a surprising card order rather than a broken page —
     * and refusing would make a hand-edited file with sparse orders uneditable
     * from the console until someone fixed it by hand.
     */
    it("warns about a duplicate order without blocking the save", () => {
        const { warnings } = safeProjectsSource([
            { ...BASE, order: 1 },
            { ...BASE, slug: "b-project", order: 1 },
        ]);

        expect(warnings.join(" ")).toMatch(/share an order value/);
    });

    it("names what came back wrong, so the failure is diagnosable", () => {
        try {
            safeProjectsSource([{ ...BASE, slug: "UPPERCASE" }]);
            expect.unreachable("should have thrown");
        } catch (error) {
            expect(error).toBeInstanceOf(UnsafeWriteError);
            expect((error as UnsafeWriteError).reasons.join(" ")).toContain("UPPERCASE");
        }
    });
});

describe("verifyRoundTrip", () => {
    /**
     * The whole point, simulated: a serializer that silently drops a field. Here
     * the "serializer" simply omits `description`, which is exactly the shape of
     * the `disclaimers` bug recorded in §16.2 of the plan — a field the type grew
     * that the serializer did not know about, which would have deleted four
     * entries' worth of prose on its first save.
     */
    it("catches a field that the serializer silently dropped", () => {
        interface Row {
            id: string;
            name: string;
            note?: string;
        }

        const reasons = verifyRoundTrip<Row>({
            file: "data/fake.ts",
            source: "",
            entries: [{ id: "a", name: "Kept", note: "Lost" }],
            // The "serializer" dropped `note`, exactly as a real one silently would.
            parse: () => [{ id: "a", name: "Kept" }],
            describe: (entry) => entry.id,
        });

        expect(reasons).toHaveLength(1);
        expect(reasons[0]).toContain("note");
        expect(reasons[0]).toContain('"a"');
    });

    it("catches an entry count that changed", () => {
        const reasons = verifyRoundTrip({
            file: "data/fake.ts",
            source: "",
            entries: [{ id: "a" }, { id: "b" }],
            parse: () => [{ id: "a" }],
            describe: (entry) => entry.id,
        });

        expect(reasons[0]).toMatch(/produced 1 entries from 2/);
    });

    it("reports output that does not parse at all", () => {
        const reasons = verifyRoundTrip({
            file: "data/fake.ts",
            source: "not typescript",
            entries: [{ id: "a" }],
            parse: () => {
                throw new Error("boom");
            },
            describe: () => "a",
        });

        expect(reasons[0]).toContain("did not parse after serialization");
    });

    /*
     * Key order is a formatting question the printer owns, not a data question.
     * A `JSON.stringify` comparison would be shorter and would reject every save,
     * since the parse result's key order is the file's and the input's is
     * whatever the form builder produced.
     */
    it("does not care about key order", () => {
        const reasons = verifyRoundTrip({
            file: "data/fake.ts",
            source: "",
            entries: [{ a: 1, b: 2 }],
            parse: () => [{ b: 2, a: 1 }],
            describe: () => "x",
        });

        expect(reasons).toEqual([]);
    });
});

describe("safeCareerSource", () => {
    it("returns the text for a list that survives its own parser", () => {
        const source = safeCareerSource({
            file: "data/skills.ts",
            entries: [
                {
                    id: "ts",
                    name: "TypeScript",
                    category: "Programming Languages" as const,
                    icon: "typescript",
                },
            ],
            serialize: serializeSkills,
            parse: parseSkills,
            describe: (entry) => entry.id,
        });

        expect(source).toContain('id: "ts"');
    });

    it("throws rather than committing text its parser rejects", () => {
        expect(() =>
            safeCareerSource({
                file: "data/skills.ts",
                entries: [
                    {
                        id: "ts",
                        name: "TypeScript",
                        category: "Programming Languages" as const,
                        icon: "x",
                    },
                ],
                serialize: () => "export const skills: Skill[] = [\n    { id: BROKEN },\n];\n",
                parse: parseSkills,
                describe: (entry) => entry.id,
            }),
        ).toThrow(UnsafeWriteError);
    });
});

describe("checkProjectInvariants mirrors tests/data/integrity.test.ts", () => {
    /*
     * The two must agree, and they import nothing from each other on purpose: a
     * mistake that disabled one should not quietly disable the other. The live
     * file passing both is the check that they have not drifted apart.
     */
    it("passes the live data, which the integrity suite also asserts", () => {
        const { errors } = checkProjectInvariants(projects);

        expect(errors).toEqual([]);
    });
});
