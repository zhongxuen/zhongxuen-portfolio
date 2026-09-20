import { describe, expect, it } from "vitest";
import { screenshotHref, screenshotTarget } from "@/lib/admin/github";

/**
 * `screenshotTarget` — the inverse of `screenshotHref`, and the only place a
 * path from stored data reaches the GitHub write API.
 *
 * **Why that sentence is the whole test file.** The allowlist in
 * lib/admin/github.ts closes path traversal by *construction*: a caller cannot
 * express a path, only a key or a (slug, index, extension) triple, so there is
 * nothing to validate. Deletion broke that symmetry — it starts from a string
 * sitting in `data/projects.ts` — so the string has to be re-derived through the
 * same constructor rather than trusted.
 *
 * Null means "not mine to delete", which is the safe reading in both
 * directions: a hand-placed image is never destroyed by a form edit, and a
 * crafted path never becomes a write.
 */

describe("accepts what the uploader writes", () => {
    it("round-trips a path it produced", () => {
        const target = screenshotTarget("/images/projects/jobnow-2.png");

        expect(target).toEqual({
            kind: "screenshot",
            slug: "jobnow",
            index: 2,
            extension: "png",
        });
        expect(
            screenshotHref(target as Extract<typeof target, { kind: "screenshot" }> & object),
        ).toBe("/images/projects/jobnow-2.png");
    });

    it.each(["jpg", "png", "webp"])("accepts the %s extension", (extension) => {
        expect(screenshotTarget(`/images/projects/a-b-c-1.${extension}`)).not.toBeNull();
    });

    it("accepts a multi-hyphen slug", () => {
        expect(
            screenshotTarget("/images/projects/it-ticket-helpdesk-system-11.webp"),
        ).toMatchObject({ slug: "it-ticket-helpdesk-system", index: 11 });
    });
});

describe("refuses everything else", () => {
    const rejected = [
        // Traversal, in the two forms that matter.
        "/images/projects/../../../data/projects.ts",
        "/images/projects/nested/dir-1.png",
        // Not the managed directory at all.
        "/images/other/a-1.png",
        "/data/projects.ts",
        "images/projects/a-1.png",
        "https://example.com/images/projects/a-1.png",
        // Not the managed filename shape — a hand-placed file.
        "/images/projects/screenshot.png",
        "/images/projects/a-1.gif",
        "/images/projects/a-1.png.txt",
        "/images/projects/UPPER-1.png",
        // Indexes the uploader cannot produce: targetPath bounds them at 1..24.
        "/images/projects/a-0.png",
        "/images/projects/a-99.png",
        // Leading/trailing hyphens, which SLUG_PATTERN rejects.
        "/images/projects/-a-1.png",
        "",
    ];

    it.each(rejected)("refuses %j", (href) => {
        expect(screenshotTarget(href)).toBeNull();
    });
});
