/**
 * The typed printer shared by every module that writes a `data/*.ts` file back
 * out (docs/admin-plan.md §14, open question 1).
 *
 * **Why this exists now and not before.** `serializeSettings.ts` argued, when it
 * was the second caller, that "two callers with different shapes is not a
 * pattern" and put the threshold at the third. There are now six —
 * `data/projects.ts`, `data/now.ts`, and the four career files the console
 * gained alongside this module — so the primitives moved here and the callers
 * kept only what is genuinely theirs: a header comment and a field order.
 *
 * Nothing in here knows what a project or a skill is. It knows Prettier's
 * layout rules, and that is the entire job: every function below exists because
 * `npm run format:check` would fail without it, and because the byte-for-byte
 * serializer tests assert the output equals the file Prettier produced.
 *
 * **The constraint every caller inherits.** Output is re-emitted whole, so a
 * comment placed *inside* one of these array literals is destroyed by the next
 * save. Each caller's header says so in the file it writes. That is not a
 * limitation to be fixed later — it is the price of treating a TypeScript
 * literal as a database row, and the alternative (a comment-preserving printer)
 * is a fork of Prettier.
 */

/** Four spaces, matching `.prettierrc` and every file in this repository. */
export const INDENT = "    ";

/** Prettier's `printWidth`. */
export const PRINT_WIDTH = 100;

/**
 * Prettier's short-key rule, which is not optional if the output is to survive
 * `npm run format:check`.
 *
 * Prettier never moves a string value onto its own line when the property key is
 * narrower than `tabWidth + 3` — 7 columns here. So `description:` (11 columns)
 * breaks and overflows on the line below, while `detail:` (6) stays inline and
 * overflows in place, however long the string is. Both forms are in this
 * repository today — data/projects.ts and data/now.ts respectively — and a
 * printer that applied one rule to both would reformat half a file on its first
 * save.
 *
 * See `isObjectPropertyWithShortKey` in Prettier's `printAssignment`. The rule
 * covers string literals only; arrays break on width regardless of key, which is
 * why `arrayLines` does not consult it.
 */
export const NEVER_BREAK_KEY_WIDTH = 7;

/**
 * Chooses the quote character the way Prettier does: whichever produces fewer
 * escapes, with double quotes winning a tie because `singleQuote` is false in
 * `.prettierrc`.
 *
 * This is not a nicety. `data/projects.ts` already contains two entries whose
 * prose quotes a phrase — a free-form phrase like "last 90 days" — and Prettier
 * writes those in single quotes. A printer that always used double quotes would
 * emit the same text with escaped inner quotes, which is valid, differently
 * formatted, and would fail `format:check` on the next commit.
 */
export function quote(value: string): string {
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
 * Emits `key: value` at `depth`, breaking after the colon when the one-line form
 * would exceed 100 columns **and** the key is wide enough for Prettier to break
 * it.
 *
 * When it does break, the value moves to the next line at one extra indent level
 * and is *not* itself wrapped — string literals are atomic. A 400-character
 * description therefore overflows the print width on a line of its own, which is
 * exactly what data/projects.ts does today.
 */
export function scalarLine(key: string, literal: string, depth: number): string {
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
 * element is a number. Every array these callers emit is strings, so the broken
 * form is always one element per line.
 */
export function arrayLines(key: string, values: string[], depth: number): string {
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
 * True for a value that should be omitted rather than written.
 *
 * Empty arrays and empty strings are omitted, not emitted as `[]` or `""`, and
 * `undefined` is never written as the literal `undefined` — that is how these
 * files read today, and it is also the honest encoding: an optional field that
 * is absent means "there is nothing to say here", which several components check
 * for before rendering a whole block.
 *
 * `featured: false` and `order: 0` must survive this. A boolean false is not
 * empty — data/projects.ts carries three of them — and only undefined, blank
 * strings and empty arrays are caught here. Spelled out because "falsy" is the
 * bug this function exists to avoid.
 */
export function isEmpty(value: unknown): boolean {
    if (value === undefined || value === null) {
        return true;
    }

    if (typeof value === "string") {
        return value.trim().length === 0;
    }

    return Array.isArray(value) && value.length === 0;
}

/**
 * One field of an entry, named and optionally given a renderer.
 *
 * A fixed, declared order is what keeps an admin commit's diff small enough to
 * review: key-insertion order following whatever the form happened to produce
 * would rewrite every line of an entry on every save. The order of this array
 * *is* the order of the emitted keys.
 *
 * `custom` exists for the one shape that is not a scalar or a string array —
 * `Project.testCredentials`, a nested object. Anything else needing it should
 * probably be its own file rather than a nested literal, but the escape hatch
 * costs one branch.
 */
export interface FieldSpec<T> {
    key: keyof T & string;
    /** Emits the whole `key: …,` line(s) at `depth`. Only called when the value is not empty. */
    custom?: (value: unknown, depth: number) => string;
}

/**
 * Emits one `{ … }` entry at `depth`, following `fields` in order and skipping
 * anything `isEmpty` rejects.
 */
export function printEntry<T extends object>(
    entry: T,
    fields: readonly FieldSpec<T>[],
    depth: number,
): string {
    const pad = INDENT.repeat(depth);
    let out = `${pad}{\n`;

    for (const field of fields) {
        const value = entry[field.key];

        if (isEmpty(value)) {
            continue;
        }

        if (field.custom) {
            out += field.custom(value, depth + 1);
            continue;
        }

        if (Array.isArray(value)) {
            out += arrayLines(field.key, value as string[], depth + 1);
            continue;
        }

        if (typeof value === "string") {
            out += scalarLine(field.key, quote(value), depth + 1);
            continue;
        }

        // booleans and numbers — `featured`, `order`
        out += scalarLine(field.key, String(value), depth + 1);
    }

    return `${out}${pad}},\n`;
}

/**
 * Emits a complete module: a header, one group of lines per entry, and `];`.
 *
 * The header is the caller's, verbatim, and must end with the opening
 * `export const x: T[] = [` line and a newline — it carries both the import and
 * the file's documentation comment, neither of which this module can invent.
 */
export function printModule<T extends object>({
    header,
    entries,
    fields,
}: {
    header: string;
    entries: readonly T[];
    fields: readonly FieldSpec<T>[];
}): string {
    /*
     * An empty array collapses onto one line. Prettier writes `= [];`, never
     * `= [` followed by `];` — so emitting the open-and-close form would produce
     * a file that fails `npm run format:check` the moment the console removes
     * the last entry from a list. `data/certifications.ts` is empty today and
     * found this immediately.
     */
    if (entries.length === 0) {
        return `${header.replace(/\[\n$/, "[];\n")}`;
    }

    return header + entries.map((entry) => printEntry(entry, fields, 1)).join("") + "];\n";
}
