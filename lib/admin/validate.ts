import { ModuleSourceError } from "@/lib/admin/parseModule";
import { parseProjects } from "@/lib/admin/parseProjects";
import { isEmpty } from "@/lib/admin/printer";
import { serializeProjects } from "@/lib/admin/serializeProjects";
import type { Project } from "@/types/project";

/**
 * The gate every admin write passes through before it becomes a commit.
 *
 * **The hole this closes.** `serializeProjects` emits text and `commitFile`
 * pushes it; until this module existed, nothing read the emitted text back. Under
 * the plan's central bet — GitHub is the database, there is no staging
 * environment, a save is a commit to `main` (docs/admin-plan.md §2) — a
 * serializer bug does not produce an error message. It produces a deploy. The
 * recovery path is `git revert` from whatever device is to hand, which is a real
 * path but a bad one to discover at 11pm from a phone.
 *
 * So: emit, parse the emission back, and refuse the commit unless what comes
 * back is what went in. That single property catches the entire class —
 * a field the serializer does not know about and silently drops, a quote choice
 * that mangles an apostrophe, an escape that truncates a description, output
 * that is not valid TypeScript at all. None of those are hypothetical; §16.2 of
 * the plan records a `disclaimers` field that the serializer did not know about
 * and would have deleted from four entries on its first save.
 *
 * **Cost.** One extra parse of a 40 KB string per save, in a Server Action that
 * is already waiting on two GitHub round trips. It is not measurable.
 *
 * **What this is not.** It is not a linter and not a content review. It answers
 * one question — "does committing this text lose or corrupt data, or break the
 * build?" — and everything advisory belongs in `validateProject`, which runs
 * earlier and talks to the operator about their form.
 */

/** Raised when a serialized file fails the round trip or an invariant. Never reaches a client verbatim. */
export class UnsafeWriteError extends Error {
    readonly reasons: string[];

    constructor(file: string, reasons: string[]) {
        super(
            `Refusing to commit ${file}: the serialized output did not survive its own parser. ` +
                reasons.join(" "),
        );
        this.name = "UnsafeWriteError";
        this.reasons = reasons;
    }
}

/**
 * Strips a record down to what the printer will actually emit.
 *
 * The printer omits empty optionals rather than writing `""` or `[]`
 * (`isEmpty`), so an input carrying `role: ""` and a parse result carrying no
 * `role` at all are the *same file* and must compare equal. Without this the
 * gate would reject every save made from a form with a blank optional field,
 * which is most of them.
 */
function canonical<T extends object>(entry: T, ignore: readonly string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(entry)) {
        if (ignore.includes(key) || isEmpty(value)) {
            continue;
        }

        out[key] = value;
    }

    return out;
}

/**
 * Order-insensitive deep equality over the plain data these files hold —
 * strings, numbers, booleans, string arrays and one nested object.
 *
 * `JSON.stringify` comparison would be shorter and wrong: it is key-order
 * sensitive, and the parse result's key order is the file's while the input's is
 * whatever the form builder produced. Key *order* is a formatting question the
 * printer owns; this function is asking about values.
 */
function sameValue(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
        return (
            Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((item, index) => sameValue(item, b[index]))
        );
    }

    if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
        const left = a as Record<string, unknown>;
        const right = b as Record<string, unknown>;
        const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

        return [...keys].every((key) => sameValue(left[key], right[key]));
    }

    return false;
}

/**
 * The core check: parse the emitted source and prove it equals what was meant.
 *
 * `ignore` names keys the printer deliberately does not write — for projects,
 * the four GitHub-derived fields that `adapters/githubProjectAdapter.ts` overlays
 * at request time. Their absence from the output is correct, so comparing them
 * would fail every save made from `getProjects()` data.
 */
export function verifyRoundTrip<T extends object>({
    file,
    source,
    entries,
    parse,
    ignore = [],
    describe,
}: {
    file: string;
    source: string;
    entries: readonly T[];
    parse: (source: string) => T[];
    ignore?: readonly string[];
    /** Names one entry in a failure message — a slug or an id. */
    describe: (entry: T, index: number) => string;
}): string[] {
    let reparsed: T[];

    try {
        reparsed = parse(source);
    } catch (error) {
        /*
         * The parser's own message names a line and a reason, and it is the only
         * message that makes this fixable. It describes text this console just
         * generated, so it carries nothing user-supplied that was not already on
         * the operator's own screen.
         */
        return [
            error instanceof ModuleSourceError
                ? error.message
                : `${file} did not parse after serialization.`,
        ];
    }

    if (reparsed.length !== entries.length) {
        return [
            `Serializing produced ${reparsed.length} entries from ${entries.length}. Nothing was written.`,
        ];
    }

    const reasons: string[] = [];

    entries.forEach((entry, index) => {
        const before = canonical(entry, ignore);
        const after = canonical(reparsed[index], ignore);

        if (sameValue(before, after)) {
            return;
        }

        const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
            (key) => !sameValue(before[key], after[key]),
        );

        reasons.push(
            `Entry "${describe(entry, index)}" came back different in: ${changed.join(", ")}.`,
        );
    });

    return reasons;
}

/**
 * The slug rule, identical to the one `tests/data/integrity.test.ts` asserts and
 * to `SLUG_PATTERN` in `lib/admin/projectForm.ts`.
 *
 * Restated here rather than imported from either, because this module must hold
 * regardless of which path reached it — the form validator only sees a form, and
 * a sync apply or a hand-edited repo file never passes through one.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Invariants that the type system cannot express and that fail as a broken
 * deploy rather than as a build error.
 *
 * These mirror `tests/data/integrity.test.ts`, which is the right place for them
 * when the file is edited by hand and pushed — CI runs, CI fails, nothing
 * deploys. A save from this console does not pass through CI before it reaches
 * `main`, so the same assertions have to run here too. When one moves, both move;
 * the tests import nothing from this module on purpose, so a mistake that
 * disabled one would not quietly disable the other.
 */
export function checkProjectInvariants(projects: readonly Project[]): {
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    const slugs = projects.map((project) => project.slug);
    const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

    if (duplicates.length > 0) {
        /*
         * Two entries with one slug means `generateStaticParams` emits the same
         * route twice and `/projects/[slug]` renders whichever `find` reaches
         * first. The second project silently stops existing.
         */
        errors.push(`Duplicate slug(s): ${[...new Set(duplicates)].join(", ")}.`);
    }

    for (const project of projects) {
        if (!SLUG_PATTERN.test(project.slug)) {
            errors.push(`Slug "${project.slug}" is not URL-safe.`);
        } else if (encodeURIComponent(project.slug) !== project.slug) {
            errors.push(`Slug "${project.slug}" does not survive URL encoding.`);
        }

        for (const path of project.screenshots ?? []) {
            if (!path.startsWith("/images/projects/")) {
                errors.push(
                    `"${project.slug}" has a screenshot outside /images/projects/: ${path}`,
                );
            }
        }

        if (!project.title.trim() || !project.description.trim()) {
            errors.push(`"${project.slug}" is missing a title or a description.`);
        }
    }

    /*
     * A warning, not an error. Duplicate `order` values sort arbitrarily against
     * each other, which is a surprising card order rather than a broken page —
     * and blocking the save would make a hand-edited file with sparse orders
     * uneditable from the console until someone fixed it by hand.
     */
    const orders = projects.map((project) => project.order).filter((order) => order !== undefined);
    const orderDuplicates = orders.filter((order, index) => orders.indexOf(order) !== index);

    if (orderDuplicates.length > 0) {
        warnings.push(
            `Two or more projects share an order value (${[...new Set(orderDuplicates)].join(", ")}), so their relative position on /projects is arbitrary. Reordering the list from /admin/projects renumbers them.`,
        );
    }

    return { errors, warnings };
}

/** Throws `UnsafeWriteError` when `reasons` is non-empty. The one call site pattern for every gate. */
export function assertSafe(file: string, reasons: string[]): void {
    if (reasons.length > 0) {
        throw new UnsafeWriteError(file, reasons);
    }
}

/**
 * The only way `data/projects.ts` should ever be produced for a commit.
 *
 * Serialize, parse the result back, compare, check the invariants — then hand
 * over the bytes. Every project action calls this instead of `serializeProjects`
 * directly, so there is exactly one path from data to a commit and it is the
 * checked one. A call to the bare serializer in an action is now a review
 * finding.
 *
 * The four GitHub-derived fields are ignored in the comparison because the
 * serializer deliberately does not write them — see `FIELDS` in
 * lib/admin/serializeProjects.ts. Objects arriving from `getProjects()` carry
 * them; objects arriving from the editor do not; neither belongs in the file.
 */
export function safeProjectsSource(projects: readonly Project[]): {
    source: string;
    warnings: string[];
} {
    const source = serializeProjects(projects as Project[]);

    const reasons = verifyRoundTrip<Project>({
        file: "data/projects.ts",
        source,
        entries: projects,
        parse: parseProjects,
        ignore: ["language", "stars", "lastUpdated", "publishedAt"],
        describe: (project, index) => project.slug || `#${index + 1}`,
    });

    const { errors, warnings } = checkProjectInvariants(projects);

    assertSafe("data/projects.ts", [...reasons, ...errors]);

    return { source, warnings };
}

/**
 * The career files' equivalent of `safeProjectsSource`.
 *
 * Generic because the four differ only in their serializer, their parser and the
 * field that names an entry in a failure message — and because the one thing
 * that must not differ between them is whether the check runs at all.
 *
 * There is no invariants pass here to match `checkProjectInvariants`. The
 * project-specific ones are all about slugs becoming routes, and none of these
 * four files produces a route; everything else they need — unique ids, date
 * ranges, a category inside its union — is checked in `lib/admin/careerForm.ts`
 * against the form, where an error can be shown beside the field that caused it.
 * What remains, and what this covers, is the question no form can answer: did
 * the text we are about to commit survive its own parser.
 */
export function safeCareerSource<T extends object>({
    file,
    entries,
    serialize,
    parse,
    describe,
}: {
    file: string;
    entries: readonly T[];
    serialize: (entries: T[]) => string;
    parse: (source: string) => T[];
    describe: (entry: T, index: number) => string;
}): string {
    const source = serialize(entries as T[]);

    assertSafe(file, verifyRoundTrip<T>({ file, source, entries, parse, describe }));

    return source;
}
