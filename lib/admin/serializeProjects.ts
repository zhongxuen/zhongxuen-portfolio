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
 * **Why hand-written and not Prettier at runtime.** Prettier is a
 * devDependency; importing it from a Server Action drags a whole formatter into
 * the function bundle to print 40 KB of object literals. The output shape here
 * is fully known, so this emits Prettier-compatible text directly — 4-space
 * indent, 100-column wrapping, double quotes, trailing commas, matching
 * `.prettierrc`. `npm run format:check` is the second opinion.
 *
 * **The constraint this imposes on data/projects.ts.** It works because that
 * file is a pure data literal: no comments inside the array, no computed values,
 * no imports beyond the type. That is now a *requirement*, not an observation —
 * a comment added inside the array is destroyed by the first admin save. The
 * file carries a header comment saying so, and the byte-for-byte test is what
 * makes the rule enforceable rather than hopeful.
 */

const INDENT = "    ";
const PRINT_WIDTH = 100;

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
 * reaching this function may well carry them (they come out of
 * `getProjects()`), their absence from this list is load-bearing, not tidy.
 */
const FIELD_ORDER = [
    "slug",
    "title",
    "description",
    "longDescription",
    "testCredentials",
    "role",
    "technologies",
    "githubUrl",
    "githubRepo",
    "liveUrl",
    "screenshots",
    "keyFeatures",
    "disclaimers",
    "challenges",
    "lessonsLearned",
    "futureImprovements",
    "featured",
    "order",
] as const satisfies readonly (keyof Project)[];

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

const FOOTER = "];\n";

/**
 * Chooses the quote character the way Prettier does: whichever produces fewer
 * escapes, with double quotes winning a tie because `singleQuote` is false in
 * `.prettierrc`.
 *
 * This is not a nicety. `data/projects.ts` already contains two entries whose
 * prose quotes a phrase — `'…a free-form phrase like "last 90 days"'` — and
 * Prettier writes those in single quotes. A serializer that always used double
 * quotes would emit `"…like \"last 90 days\""`, which is valid, differently
 * formatted, and would fail `format:check` on the next commit.
 */
function quote(value: string): string {
    const doubles = (value.match(/"/g) ?? []).length;
    const singles = (value.match(/'/g) ?? []).length;
    const q = doubles > singles ? "'" : '"';

    const escaped = value
        .replace(/\\/g, "\\\\")
        .replace(new RegExp(q, "g"), `\\${q}`)
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");

    return `${q}${escaped}${q}`;
}

/**
 * Prettier's short-key rule, which is not optional if the output is to survive
 * `npm run format:check`.
 *
 * Prettier never moves a string value onto its own line when the property key is
 * narrower than `tabWidth + 3` — 7 columns here. So `description:` (11 columns)
 * breaks and overflows on the line below, while `detail:` (6) stays inline and
 * overflows in place, however long the string is. Both forms are in this
 * repository today — data/projects.ts and data/now.ts respectively — and a
 * serializer that applied one rule to both would reformat half a file on its
 * first save.
 *
 * See `isObjectPropertyWithShortKey` in Prettier's `printAssignment`. The rule
 * covers string literals only; arrays break on width regardless of key, which is
 * why `arrayLines` below does not consult it.
 */
const NEVER_BREAK_KEY_WIDTH = 7;

/**
 * Emits `key: value` at `depth`, breaking after the colon when the one-line form
 * would exceed 100 columns **and** the key is wide enough for Prettier to break
 * it.
 *
 * When it does break, the value moves to the next line at one extra indent level
 * and is *not* itself wrapped — string literals are atomic. A 400-character
 * description therefore overflows the print width on a line of its own, which is
 * exactly what data/projects.ts does today.
 */
function scalarLine(key: string, literal: string, depth: number): string {
    const pad = INDENT.repeat(depth);
    const oneLine = `${pad}${key}: ${literal},`;

    if (oneLine.length <= PRINT_WIDTH || key.length < NEVER_BREAK_KEY_WIDTH) {
        return `${oneLine}\n`;
    }

    return `${pad}${key}:\n${INDENT.repeat(depth + 1)}${literal},\n`;
}

/**
 * Emits a string array, on one line when it fits and one element per line when
 * it does not.
 *
 * One per line rather than filled: Prettier only fills arrays whose every
 * element is a number. Every array in this file is strings, so the broken form
 * is always one element per line.
 */
function arrayLines(key: string, values: string[], depth: number): string {
    const pad = INDENT.repeat(depth);
    const literals = values.map(quote);
    const oneLine = `${pad}${key}: [${literals.join(", ")}],`;

    if (oneLine.length <= PRINT_WIDTH) {
        return `${oneLine}\n`;
    }

    const inner = INDENT.repeat(depth + 1);

    return `${pad}${key}: [\n${literals.map((literal) => `${inner}${literal},\n`).join("")}${pad}],\n`;
}

/**
 * Emits `testCredentials`.
 *
 * Always expanded across lines, never collapsed onto one even when it would
 * fit. Prettier preserves whatever the author chose for an object literal — it
 * breaks an object if the source had a newline after `{` — so "would it fit" is
 * not the rule for objects the way it is for arrays, and there is no source to
 * read a preference from when generating. Expanded matches the current file and
 * keeps a two-field diff two lines long.
 */
function credentialsLines(
    credentials: NonNullable<Project["testCredentials"]>,
    depth: number,
): string {
    const pad = INDENT.repeat(depth);

    return [
        `${pad}testCredentials: {\n`,
        scalarLine("password", quote(credentials.password), depth + 1),
        arrayLines("accounts", credentials.accounts, depth + 1),
        `${pad}},\n`,
    ].join("");
}

/**
 * True for a value that should be omitted rather than written.
 *
 * Empty arrays and empty strings are omitted, not emitted as `[]` or `""`, and
 * `undefined` is never written as the literal `undefined` — that is how the file
 * reads today, and it is also the honest encoding: an optional field that is
 * absent means "there is nothing to say here", which several components check
 * for before rendering a whole block.
 */
function isEmpty(value: unknown): boolean {
    if (value === undefined || value === null) {
        return true;
    }

    if (typeof value === "string") {
        return value.trim().length === 0;
    }

    return Array.isArray(value) && value.length === 0;
}

function serializeProject(project: Project, depth: number): string {
    const pad = INDENT.repeat(depth);
    let out = `${pad}{\n`;

    for (const key of FIELD_ORDER) {
        const value = project[key];

        if (isEmpty(value)) {
            /*
             * `featured: false` and `order: 0` must survive this. A boolean
             * false is not empty — data/projects.ts carries three of them — and
             * `isEmpty` only treats undefined, blank strings and empty arrays as
             * absent, so neither is caught here. Spelled out because "falsy" is
             * the bug this function exists to avoid.
             */
            continue;
        }

        if (key === "testCredentials") {
            out += credentialsLines(project.testCredentials!, depth + 1);
            continue;
        }

        if (Array.isArray(value)) {
            out += arrayLines(key, value as string[], depth + 1);
            continue;
        }

        if (typeof value === "string") {
            out += scalarLine(key, quote(value), depth + 1);
            continue;
        }

        // booleans and numbers — `featured` and `order`
        out += scalarLine(key, String(value), depth + 1);
    }

    return `${out}${pad}},\n`;
}

/** Serializes the whole list into the complete text of `data/projects.ts`. */
export function serializeProjects(projects: Project[]): string {
    return HEADER + projects.map((project) => serializeProject(project, 1)).join("") + FOOTER;
}
