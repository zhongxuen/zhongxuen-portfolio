import type { Project } from "@/types/project";

/**
 * Reads the text of `data/projects.ts` back into `Project[]`.
 *
 * **Why this exists, since the plan does not name it.** docs/admin-plan.md §2
 * says GitHub is the database, but the console runs inside a build whose
 * `import { projects } from "@/data/projects"` was frozen when that build ran.
 * Editing two projects in a row would therefore mean the second save was
 * computed from the array *before* the first — silently reverting it — unless
 * the console reads the live file. So it reads the live file. Every admin page
 * loads `data/projects.ts` from the repo, and this turns that text back into
 * data.
 *
 * **Nothing is evaluated.** The obvious implementation — strip the import and
 * `new Function` the rest — would be executing source fetched over a network,
 * which is not a thing an admin console should do even with its own repository
 * on the other end. Instead this mechanically rewrites the literal into JSON and
 * hands it to `JSON.parse`, so the worst a corrupted file can do is fail to
 * parse.
 *
 * **The grammar it accepts is exactly what the serializer emits**: object
 * literals with bare identifier keys, single- or double-quoted strings, numbers,
 * booleans, arrays, and trailing commas. Anything else — a template literal, a
 * spread, a function call, an identifier used as a value — throws. That
 * strictness is the point: the two modules are inverses, and
 * tests/lib/parseProjects.test.ts asserts the round trip against the live file,
 * so neither can drift without the other failing.
 */

/** Raised when `data/projects.ts` is not the pure data literal both modules require. */
export class ProjectSourceError extends Error {
    constructor(message: string) {
        super(`data/projects.ts could not be read: ${message}`);
        this.name = "ProjectSourceError";
    }
}

const ARRAY_START = "export const projects: Project[] = [";

/**
 * Isolates the array literal.
 *
 * Anchored on the declaration and on the final `];`, so the header comment — and
 * any future one — is outside the parsed region. The closing marker is found
 * from the end rather than by matching brackets, because a `];` can never appear
 * inside a string in this file's data and searching backwards cannot be confused
 * by one in a description.
 */
function extractLiteral(source: string): string {
    const start = source.indexOf(ARRAY_START);

    if (start === -1) {
        throw new ProjectSourceError(`no "${ARRAY_START}" declaration found`);
    }

    const open = start + ARRAY_START.length - 1;
    const close = source.lastIndexOf("];");

    if (close <= open) {
        throw new ProjectSourceError("the array is not closed with `];`");
    }

    return source.slice(open, close + 1);
}

const IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const NUMBER = /-?\d+(?:\.\d+)?/y;

/**
 * Rewrites the literal as JSON.
 *
 * A hand-written scanner rather than a regex pass, because the two things that
 * must not be misread — a `//` inside a URL string and a `,` inside a
 * description — are exactly what a regex over the whole text gets wrong.
 * Position-tracked scanning knows whether it is inside a string.
 */
function toJson(literal: string): string {
    let index = 0;
    let out = "";
    /** True when the next identifier is a key rather than a value. */
    let expectKey = false;

    function fail(what: string): never {
        const line = literal.slice(0, index).split("\n").length;

        throw new ProjectSourceError(`${what} at line ${line} of the array`);
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
                 * The serializer never writes either — an absent optional field
                 * is omitted. Accepting them here would let a hand-edit smuggle
                 * a null into a field whose type says it cannot be one.
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
 * Parses `data/projects.ts` source into `Project[]`.
 *
 * The shape check afterwards is narrow on purpose: it verifies the three
 * required fields and rejects an unknown key. An unknown key is the interesting
 * failure — it means the type grew a field the serializer does not know about,
 * and silently dropping it on the next save is precisely the bug §5 of the plan
 * warns about. Better to refuse to load.
 */
export function parseProjects(source: string): Project[] {
    let parsed: unknown;

    try {
        parsed = JSON.parse(toJson(extractLiteral(source)));
    } catch (error) {
        if (error instanceof ProjectSourceError) {
            throw error;
        }

        throw new ProjectSourceError(
            error instanceof Error ? error.message : "the literal is not valid data",
        );
    }

    if (!Array.isArray(parsed)) {
        throw new ProjectSourceError("the declaration is not an array");
    }

    return parsed.map((entry, position) => checkShape(entry, position));
}

/**
 * Keys a `Project` may carry in the file.
 *
 * Restated rather than derived, because a type cannot be enumerated at runtime.
 * tests/lib/parseProjects.test.ts round-trips the real file through both
 * modules, which is what catches this list falling behind `types/project.ts`.
 */
const KNOWN_KEYS = new Set<string>([
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
]);

function checkShape(entry: unknown, position: number): Project {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        throw new ProjectSourceError(`entry ${position + 1} is not an object`);
    }

    const candidate = entry as Record<string, unknown>;

    for (const key of Object.keys(candidate)) {
        if (!KNOWN_KEYS.has(key)) {
            throw new ProjectSourceError(
                `entry ${position + 1} has an unrecognised field \`${key}\`. ` +
                    "Add it to lib/admin/parseProjects.ts and lib/admin/serializeProjects.ts, " +
                    "or the next save from the console would delete it.",
            );
        }
    }

    for (const key of ["slug", "title", "description"] as const) {
        if (typeof candidate[key] !== "string" || (candidate[key] as string).length === 0) {
            throw new ProjectSourceError(`entry ${position + 1} is missing \`${key}\``);
        }
    }

    if (!Array.isArray(candidate.technologies)) {
        throw new ProjectSourceError(`entry ${position + 1} is missing \`technologies\``);
    }

    return candidate as unknown as Project;
}
