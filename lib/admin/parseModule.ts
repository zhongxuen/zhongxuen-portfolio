/**
 * Reads a `data/*.ts` array literal back into data, without evaluating it.
 *
 * The inverse of `lib/admin/printer.ts`, and generalized out of
 * `parseProjects.ts` for the same reason the printer was: six files now need it.
 *
 * **Why this exists at all.** docs/admin-plan.md §2 says GitHub is the database,
 * but the console runs inside a build whose `import { projects }` was frozen
 * when that build ran. Editing two entries in a row would mean the second save
 * was computed from the array *before* the first — silently reverting it —
 * unless the console reads the live file. So it reads the live file, and this
 * turns that text back into data.
 *
 * **Nothing is evaluated.** The obvious implementation — strip the import and
 * `new Function` the rest — would be executing source fetched over a network,
 * which is not a thing an admin console should do even with its own repository
 * on the other end. Instead this mechanically rewrites the literal into JSON and
 * hands it to `JSON.parse`, so the worst a corrupted file can do is fail to
 * parse.
 *
 * **The grammar it accepts is exactly what the printer emits**: object literals
 * with bare identifier keys, single- or double-quoted strings, numbers,
 * booleans, arrays, trailing commas, and comments. Anything else — a template
 * literal, a spread, a function call, an identifier used as a value — throws.
 * That strictness is the point: the two modules are inverses, and each caller's
 * round-trip test asserts it against the live file, so neither can drift without
 * the other failing.
 *
 * **Comments are skipped, not preserved.** `data/skills.ts` groups its entries
 * with `// Programming Languages` lines and `data/experience.ts` carries a block
 * comment explaining one date. Reading them has to succeed; *keeping* them
 * through a save cannot, because the printer re-emits the array whole. Each
 * written file's header says so, which is the only honest place to say it.
 */

/** Raised when a data file is not the pure literal both modules require. */
export class ModuleSourceError extends Error {
    constructor(file: string, message: string) {
        super(`${file} could not be read: ${message}`);
        this.name = "ModuleSourceError";
    }
}

/**
 * Isolates the array literal.
 *
 * Anchored on the declaration and on the final `];`, so the header comment — and
 * any future one — is outside the parsed region. The closing marker is found
 * from the end rather than by matching brackets, because a `];` can never appear
 * inside a string in this data and searching backwards cannot be confused by one
 * in a description.
 */
function extractLiteral(source: string, file: string, declaration: string): string {
    const start = source.indexOf(declaration);

    if (start === -1) {
        throw new ModuleSourceError(file, `no "${declaration}" declaration found`);
    }

    const open = start + declaration.length - 1;
    const close = source.lastIndexOf("];");

    if (close <= open) {
        throw new ModuleSourceError(file, "the array is not closed with `];`");
    }

    return source.slice(open, close + 1);
}

const IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const NUMBER = /-?\d+(?:\.\d+)?/y;

/**
 * Rewrites the literal as JSON.
 *
 * A hand-written scanner rather than a regex pass, because the three things that
 * must not be misread — a `//` inside a URL string, a `,` inside a description,
 * and a `"` inside a comment — are exactly what a regex over the whole text gets
 * wrong. Position-tracked scanning knows whether it is inside a string.
 */
function toJson(literal: string, file: string): string {
    let index = 0;
    let out = "";
    /** True when the next identifier is a key rather than a value. */
    let expectKey = false;

    function fail(what: string): never {
        const line = literal.slice(0, index).split("\n").length;

        throw new ModuleSourceError(file, `${what} at line ${line} of the array`);
    }

    /** Reads a quoted string and returns its decoded value. */
    function readString(quoteChar: string): string {
        index += 1;
        let value = "";

        while (index < literal.length) {
            const char = literal[index];

            if (char === "\\") {
                const next = literal[index + 1];

                switch (next) {
                    case "n":
                        value += "\n";
                        break;
                    case "r":
                        value += "\r";
                        break;
                    case "t":
                        value += "\t";
                        break;
                    case "\\":
                    case '"':
                    case "'":
                        value += next;
                        break;
                    case "\n":
                        // A line continuation inside a string; contributes nothing.
                        break;
                    default:
                        fail(`unsupported escape \\${next}`);
                }

                index += 2;
                continue;
            }

            if (char === quoteChar) {
                index += 1;
                return value;
            }

            if (char === "\n") {
                fail("unterminated string");
            }

            value += char;
            index += 1;
        }

        fail("unterminated string");
    }

    /** Drops a trailing comma that JSON does not allow, by trimming what was already written. */
    function dropTrailingComma(): void {
        const trimmed = out.replace(/\s+$/, "");

        if (trimmed.endsWith(",")) {
            out = trimmed.slice(0, -1);
        }
    }

    while (index < literal.length) {
        const char = literal[index];

        if (char === " " || char === "\n" || char === "\r" || char === "\t") {
            index += 1;
            continue;
        }

        /*
         * Comments are skipped here rather than stripped in a pre-pass, because
         * a pre-pass cannot tell a `//` that opens a comment from the one in
         * "https://example.com" — and both appear in these files. Reaching this
         * branch means the scanner is between values, where a `/` can only start
         * a comment.
         */
        if (char === "/") {
            const next = literal[index + 1];

            if (next === "/") {
                const end = literal.indexOf("\n", index);
                index = end === -1 ? literal.length : end;
                continue;
            }

            if (next === "*") {
                const end = literal.indexOf("*/", index + 2);

                if (end === -1) {
                    fail("unterminated block comment");
                }

                index = end + 2;
                continue;
            }

            fail("unexpected `/`");
        }

        if (char === '"' || char === "'") {
            out += JSON.stringify(readString(char));
            continue;
        }

        if (char === "{") {
            out += "{";
            expectKey = true;
            index += 1;
            continue;
        }

        if (char === "}") {
            dropTrailingComma();
            out += "}";
            expectKey = false;
            index += 1;
            continue;
        }

        if (char === "[") {
            out += "[";
            expectKey = false;
            index += 1;
            continue;
        }

        if (char === "]") {
            dropTrailingComma();
            out += "]";
            index += 1;
            continue;
        }

        if (char === ":") {
            out += ":";
            expectKey = false;
            index += 1;
            continue;
        }

        if (char === ",") {
            out += ",";
            /*
             * Inside an object a comma is followed by the next key; inside an
             * array by the next value. `expectKey` is only ever consulted for a
             * bare identifier, and an array of bare identifiers is rejected
             * either way, so tracking the enclosing bracket type is unnecessary:
             * a comma always precedes a key when one is legal at all.
             */
            expectKey = true;
            index += 1;
            continue;
        }

        NUMBER.lastIndex = index;
        const number = NUMBER.exec(literal);

        if (number && number.index === index) {
            out += number[0];
            index += number[0].length;
            continue;
        }

        IDENTIFIER.lastIndex = index;
        const identifier = IDENTIFIER.exec(literal);

        if (identifier && identifier.index === index) {
            const word = identifier[0];
            index += word.length;

            if (word === "true" || word === "false") {
                out += word;
                continue;
            }

            if (word === "null" || word === "undefined") {
                /*
                 * The printer never writes either — an absent optional field is
                 * omitted. Accepting them here would let a hand-edit smuggle a
                 * null into a field whose type says it cannot be one.
                 */
                fail(`\`${word}\` is not allowed; omit the field instead`);
            }

            if (!expectKey) {
                fail(`identifier \`${word}\` used as a value`);
            }

            out += JSON.stringify(word);
            continue;
        }

        fail(`unexpected character \`${char}\``);
    }

    return out;
}

/**
 * What a caller must state about the file it is reading.
 *
 * `known` is restated rather than derived from the type, because a TypeScript
 * type cannot be enumerated at runtime. Each caller's round-trip test is what
 * catches the list falling behind its `types/*.ts` — and an unknown key is the
 * interesting failure, since silently dropping it on the next save is precisely
 * the bug §5 of the plan warns about. Better to refuse to load.
 */
export interface ModuleShape<T> {
    /** Path used in error messages, e.g. `"data/skills.ts"`. */
    file: string;
    /** The exact declaration line opening the array, up to and including `[`. */
    declaration: string;
    /** Every key an entry may carry. */
    known: readonly string[];
    /** Keys that must be present and be non-empty strings. */
    required: readonly (keyof T & string)[];
    /**
     * Keys that must be present and be arrays, empty or not.
     *
     * Separate from `required` because emptiness means the opposite thing here:
     * a blank `title` is a broken entry, while `technologies: []` is a project
     * that lists no technologies, which several components render as such.
     */
    requiredArrays?: readonly (keyof T & string)[];
}

/**
 * Parses a data module's source into `T[]`.
 *
 * The shape check afterwards is narrow on purpose: it verifies the required
 * fields and rejects an unknown key, and leaves everything else to the caller's
 * own validation. This function's job is "is this the file both modules agreed
 * on", not "is this good data".
 */
export function parseModule<T>(source: string, shape: ModuleShape<T>): T[] {
    let parsed: unknown;

    try {
        parsed = JSON.parse(
            toJson(extractLiteral(source, shape.file, shape.declaration), shape.file),
        );
    } catch (error) {
        if (error instanceof ModuleSourceError) {
            throw error;
        }

        throw new ModuleSourceError(
            shape.file,
            error instanceof Error ? error.message : "the literal is not valid data",
        );
    }

    if (!Array.isArray(parsed)) {
        throw new ModuleSourceError(shape.file, "the declaration is not an array");
    }

    const known = new Set<string>(shape.known);

    return parsed.map((entry, position) => {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
            throw new ModuleSourceError(shape.file, `entry ${position + 1} is not an object`);
        }

        const candidate = entry as Record<string, unknown>;

        for (const key of Object.keys(candidate)) {
            if (!known.has(key)) {
                throw new ModuleSourceError(
                    shape.file,
                    `entry ${position + 1} has an unrecognised field \`${key}\`. ` +
                        "Add it to this file's parser and serializer, " +
                        "or the next save from the console would delete it.",
                );
            }
        }

        for (const key of shape.required) {
            if (typeof candidate[key] !== "string" || (candidate[key] as string).length === 0) {
                throw new ModuleSourceError(
                    shape.file,
                    `entry ${position + 1} is missing \`${key}\``,
                );
            }
        }

        for (const key of shape.requiredArrays ?? []) {
            if (!Array.isArray(candidate[key])) {
                throw new ModuleSourceError(
                    shape.file,
                    `entry ${position + 1} is missing \`${key}\``,
                );
            }
        }

        return candidate as T;
    });
}
