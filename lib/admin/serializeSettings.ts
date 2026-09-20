import type { NowEntry } from "@/types/now";

/**
 * Emitters for the three small things the settings page edits
 * (docs/admin-plan.md §7.6).
 *
 * Two different strategies here, deliberately:
 *
 *  - **`data/now.ts` is re-emitted whole**, the way `serializeProjects` handles
 *    `data/projects.ts`. It is a pure data literal with a header comment, so
 *    rewriting it is safe and the diff is exactly the content that changed.
 *  - **`lib/constants.ts` is patched in place.** That file is *not* a data
 *    literal — it holds `resolveSiteUrl()`, a throw, and several paragraphs of
 *    reasoning. Re-emitting it would mean carrying a copy of all of that in this
 *    module, where it would rot. So the two values that need editing were moved
 *    into small, fixed-shape declarations (§9.3) and are replaced by an anchored
 *    pattern instead.
 *
 * Every patch function **throws rather than returning the input unchanged** when
 * its anchor does not match. A settings save that silently wrote the file back
 * identical, reported success, and triggered a build would be the worst possible
 * failure here — it looks like it worked.
 */

/** Raised when a patch target is not where this module expects it. */
export class SettingsPatchError extends Error {
    constructor(what: string) {
        super(
            `Could not find ${what} in lib/constants.ts. It was edited into a shape the ` +
                "console does not recognise — fix it by hand, or update " +
                "lib/admin/serializeSettings.ts to match.",
        );
        this.name = "SettingsPatchError";
    }
}

/**
 * Escapes a string for a double-quoted TypeScript literal.
 *
 * Narrower than `serializeProjects`' `quote()`, which also chooses between quote
 * characters to minimise escapes. These three values are a short label and an ISO
 * date; a double quote in either is already unusual enough that escaping it is
 * the readable outcome.
 */
function quote(value: string): string {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/**
 * Rewrites the `AVAILABILITY` declaration.
 *
 * Anchored on the exact two-key, four-space-indented shape that
 * `lib/constants.ts` declares. Narrow on purpose: a permissive pattern that
 * matched "roughly an object after `AVAILABILITY =`" could swallow the next
 * declaration if the file were reformatted, and this function writes to a file
 * that, if corrupted, fails the build.
 */
export function writeAvailability(
    source: string,
    availability: { open: boolean; label: string },
): string {
    const pattern =
        /(export const AVAILABILITY = \{\n)(\s*open:\s*)(?:true|false)(,\n\s*label:\s*)"(?:[^"\\]|\\.)*"(,\n\};)/;

    if (!pattern.test(source)) {
        throw new SettingsPatchError("the AVAILABILITY declaration");
    }

    return source.replace(
        pattern,
        (_match, head, openKey, labelKey, tail) =>
            `${head}${openKey}${availability.open}${labelKey}${quote(availability.label)}${tail}`,
    );
}

/** Rewrites `SITE_LAST_MODIFIED`. The value is validated by the caller before it reaches here. */
export function writeLastModified(source: string, isoDate: string): string {
    const pattern = /(export const SITE_LAST_MODIFIED = )"(?:[^"\\]|\\.)*"(;)/;

    if (!pattern.test(source)) {
        throw new SettingsPatchError("the SITE_LAST_MODIFIED declaration");
    }

    return source.replace(pattern, (_match, head, tail) => `${head}${quote(isoDate)}${tail}`);
}

/**
 * Re-emits `data/now.ts` in full.
 *
 * Same contract as `serializeProjects`: Prettier-compatible output at four-space
 * indent, 100-column wrapping, trailing commas — and therefore the same
 * constraint, that a comment placed inside the array is destroyed by the next
 * save. The header says so.
 *
 * Not generalized with `serializeProjects` into a shared typed printer, and that
 * is a deliberate "not yet": two callers with different shapes is not a pattern.
 * The plan's own open question puts the threshold at the third caller
 * (docs/admin-plan.md §14) — and `data/resume.ts`, which would be that third one,
 * is still edited by hand.
 */
export function serializeNow(entries: NowEntry[]): string {
    const header = `import type { NowEntry } from "@/types/now";

/**
 * What is actually happening right now (docs/uiux.md §4.3).
 *
 * Every line here should be traceable to something else in the repo — the
 * internship to data/experience.ts, the diploma to data/education.ts, the
 * rebuild to this tree's own git history. Nothing aspirational goes in this
 * file: "learning Rust" with no Rust anywhere in data/projects.ts is the exact
 * claim a technical reader checks first.
 *
 * Maintenance: this is the one part of the site that dates itself out loud, so
 * review it whenever data/experience.ts changes. An entry that has ended is a
 * deletion, not an edit.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/settings). The array below is re-emitted
 * in full by lib/admin/serializeSettings.ts on every save, so a comment placed
 * inside it will be deleted by the next one. Put notes in this header instead.
 */
export const now: NowEntry[] = [
`;

    const body = entries
        .map((entry) => {
            const lines = (["id", "label", "detail", "since"] as const).map((key) => {
                const literal = quote(entry[key]);
                const oneLine = `        ${key}: ${literal},`;

                /*
                 * Every key here — id, label, detail, since — is under Prettier's
                 * seven-column short-key threshold, so none is ever moved onto its
                 * own line however long the value is. See `NEVER_BREAK_KEY_WIDTH`
                 * in lib/admin/serializeProjects.ts for what that rule is and why
                 * it matters. The branch stays rather than being hardcoded to
                 * "inline", because a fifth, longer key would quietly need it.
                 */
                return oneLine.length <= 100 || key.length < 7
                    ? `${oneLine}\n`
                    : `        ${key}:\n            ${literal},\n`;
            });

            return `    {\n${lines.join("")}    },\n`;
        })
        .join("");

    return `${header}${body}];\n`;
}
