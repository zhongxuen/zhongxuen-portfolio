import { describe, expect, it } from "vitest";
import { now } from "@/data/now";
import { AVAILABILITY, SITE_LAST_MODIFIED } from "@/lib/constants";
import {
    SettingsPatchError,
    serializeNow,
    writeAvailability,
    writeLastModified,
} from "@/lib/admin/serializeSettings";
import { readRepoFile } from "../support/readRepoFile";

const CONSTANTS = readRepoFile("lib", "constants.ts");
const NOW_SOURCE = readRepoFile("data", "now.ts");

describe("serializeNow", () => {
    /**
     * The same byte-for-byte guard `serializeProjects` gets, and for the same
     * reason: it is the only assertion that covers key order, wrapping, escaping
     * and the header all at once, against a reference that cannot go stale.
     */
    it("reproduces data/now.ts byte for byte", () => {
        expect(serializeNow(now)).toBe(NOW_SOURCE);
    });

    /**
     * The inverse of what you would expect, and it is Prettier that expects it:
     * `detail` is six columns, under the seven-column short-key threshold, so the
     * value stays inline and overflows the print width in place rather than
     * moving to its own line. data/now.ts is formatted exactly this way today —
     * see `NEVER_BREAK_KEY_WIDTH` in lib/admin/serializeProjects.ts.
     */
    it("leaves a long detail inline, because its key is short", () => {
        const output = serializeNow([
            { id: "x", label: "Building", detail: "d".repeat(120), since: "2026-01-01" },
        ]);

        expect(output).toContain(`        detail: "${"d".repeat(120)}",`);
    });

    /**
     * Single quotes, not escaped double ones — which is a behaviour change, and
     * the change is the fix. `serializeNow` used to carry its own narrow escaper
     * that always emitted double quotes; Prettier picks whichever character
     * produces fewer escapes, so that output would have been reformatted by the
     * next `npm run format:check` and the byte-for-byte assertion above would
     * have started failing after an admin save. Moving onto the shared printer
     * (lib/admin/printer.ts) took `serializeProjects`' rule, which was always the
     * correct one.
     */
    it("quotes the way Prettier does, minimising escapes", () => {
        const output = serializeNow([
            { id: "x", label: "L", detail: 'He said "hi"', since: "2026-01-01" },
        ]);

        expect(output).toContain(`detail: 'He said "hi"',`);
    });

    /**
     * And when both characters appear, the rule still applies: two doubles beat
     * one single, so the literal is single-quoted and the apostrophe is the one
     * that gets escaped. Fewer escapes, which is the whole rule.
     */
    it("escapes only the quote character it chose", () => {
        const output = serializeNow([
            { id: "x", label: "L", detail: `it's "both"`, since: "2026-01-01" },
        ]);

        // String.raw, so the backslash in the expected literal stays a backslash.
        expect(output).toContain(String.raw`detail: 'it\'s "both"',`);
    });
});

describe("writeAvailability", () => {
    it("finds the real declaration in lib/constants.ts", () => {
        const patched = writeAvailability(CONSTANTS, { open: true, label: "Open to work" });

        expect(patched).toContain('    open: true,\n    label: "Open to work",');
        expect(patched).not.toBe(CONSTANTS);
    });

    it("writes the current values back unchanged", () => {
        expect(writeAvailability(CONSTANTS, AVAILABILITY)).toBe(CONSTANTS);
    });

    it("leaves the rest of the file alone", () => {
        const patched = writeAvailability(CONSTANTS, { open: true, label: "x" });

        // The function below it, and the constant above it, are untouched.
        expect(patched).toContain("function resolveSiteUrl(): string {");
        expect(patched).toContain("export const AUTHOR = {");
        expect(patched.split("\n").length).toBe(CONSTANTS.split("\n").length);
    });

    /**
     * The failure mode this guards is the quiet one: a no-op patch that reports
     * success, writes an identical file, and triggers a build for nothing.
     */
    it("throws rather than silently doing nothing when the anchor is gone", () => {
        expect(() => writeAvailability("export const OTHER = {};\n", AVAILABILITY)).toThrow(
            SettingsPatchError,
        );
    });
});

describe("writeLastModified", () => {
    it("rewrites the date", () => {
        expect(writeLastModified(CONSTANTS, "2026-12-25")).toContain(
            'export const SITE_LAST_MODIFIED = "2026-12-25";',
        );
    });

    it("writes the current value back unchanged", () => {
        expect(writeLastModified(CONSTANTS, SITE_LAST_MODIFIED)).toBe(CONSTANTS);
    });

    it("throws when the anchor is gone", () => {
        expect(() => writeLastModified("const x = 1;\n", "2026-01-01")).toThrow(SettingsPatchError);
    });
});
