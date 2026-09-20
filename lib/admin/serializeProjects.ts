import { arrayLines, printModule, quote, scalarLine, type FieldSpec } from "@/lib/admin/printer";
import type { Project } from "@/types/project";

/**
 * Turns `Project[]` back into the text of `data/projects.ts`.
 *
 * This is the hardest correctness problem in the admin console — harder than
 * auth — because a serializer that is merely *close* produces a file that still
 * compiles and has quietly lost a field. The guard is
 * tests/lib/serializeProjects.test.ts, which serializes the live array and
 * asserts the output equals the current file byte for byte. That single
 * assertion covers key order, quote choice, wrapping, escaping and omission at
 * once, and it fails the day any of them drifts.
 *
 * The layout rules moved to `lib/admin/printer.ts` when the career files became
 * the third caller (docs/admin-plan.md §14). What is left here is what is
 * genuinely about projects: the field order, the header, and the one nested
 * shape.
 *
 * **Why hand-written and not Prettier at runtime.** Prettier is a
 * devDependency; importing it from a Server Action drags a whole formatter into
 * the function bundle to print 40 KB of object literals. The output shape here
 * is fully known, so this emits Prettier-compatible text directly.
 *
 * **The constraint this imposes on data/projects.ts.** It works because that
 * file is a pure data literal: no comments inside the array, no computed values,
 * no imports beyond the type. That is now a *requirement*, not an observation —
 * a comment added inside the array is destroyed by the first admin save. The
 * file carries a header comment saying so, and the byte-for-byte test is what
 * makes the rule enforceable rather than hopeful.
 */

/**
 * Emits `testCredentials`.
 *
 * Always expanded across lines, never collapsed onto one even when it would fit.
 * Prettier preserves whatever the author chose for an object literal — it breaks
 * an object if the source had a newline after `{` — so "would it fit" is not the
 * rule for objects the way it is for arrays, and there is no source to read a
 * preference from when generating. Expanded matches the current file and keeps a
 * two-field diff two lines long.
 */
function credentialsLines(value: unknown, depth: number): string {
    const credentials = value as NonNullable<Project["testCredentials"]>;
    const pad = "    ".repeat(depth);

    return [
        `${pad}testCredentials: {\n`,
        scalarLine("password", quote(credentials.password), depth + 1),
        arrayLines("accounts", credentials.accounts, depth + 1),
        `${pad}},\n`,
    ].join("");
}

/**
 * Field order, read off `types/project.ts`.
 *
 * A fixed order is what keeps an admin commit's diff small enough to review: a
 * key-insertion order that follows whatever the form happened to produce would
 * rewrite every line of an entry on every save.
 *
 * The four GitHub-derived fields — `language`, `stars`, `lastUpdated`,
 * `publishedAt` — are deliberately absent. `adapters/githubProjectAdapter.ts`
 * overlays them at request time; writing them here would freeze a snapshot into
 * the repo and start lying the next time a repo is pushed to. Since the objects
 * reaching this function may well carry them (they come out of `getProjects()`),
 * their absence from this list is load-bearing, not tidy.
 */
const FIELDS: readonly FieldSpec<Project>[] = [
    { key: "slug" },
    { key: "title" },
    { key: "description" },
    { key: "longDescription" },
    { key: "testCredentials", custom: credentialsLines },
    { key: "role" },
    { key: "technologies" },
    { key: "githubUrl" },
    { key: "githubRepo" },
    { key: "liveUrl" },
    { key: "screenshots" },
    { key: "keyFeatures" },
    { key: "disclaimers" },
    { key: "challenges" },
    { key: "lessonsLearned" },
    { key: "futureImprovements" },
    { key: "featured" },
    { key: "order" },
];

/**
 * Header written above the array.
 *
 * The warning is not decoration. Anyone editing this file by hand needs to know
 * that a comment placed inside the array below will not survive, and the place
 * they will be standing when they need to know it is this file.
 */
const HEADER = `import { Project } from "@/types/project";

/**
 * Portfolio projects — the single source of truth for which projects exist and
 * for all of their narrative content.
 *
 * WRITTEN BY THE ADMIN CONSOLE. Editing by hand is fine and expected, but the
 * array below is re-emitted in full by lib/admin/serializeProjects.ts on every
 * save from /admin, so **a comment placed inside the array will be deleted by
 * the next one**. Put notes in this header instead. GitHub-derived fields
 * (language, stars, lastUpdated, publishedAt) are overlaid at request time by
 * adapters/githubProjectAdapter.ts and must not be written here.
 */
export const projects: Project[] = [
`;

/** Serializes the whole list into the complete text of `data/projects.ts`. */
export function serializeProjects(projects: Project[]): string {
    return printModule({ header: HEADER, entries: projects, fields: FIELDS });
}
