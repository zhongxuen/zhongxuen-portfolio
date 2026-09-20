import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { renderResume } from "@/lib/resume/render";

/**
 * A render smoke test for the résumé PDF.
 *
 * Deliberately dependency-free: it inspects the raw bytes rather than parsing
 * them, because adding a PDF parser to devDependencies to assert three
 * properties is a poor trade. Everything below is checkable on the byte stream.
 *
 * What it is actually guarding, all of which were real bugs found by extracting
 * the text of a rendered file:
 *
 *  - **One page.** The layout has about 70pt of headroom on A4 and no automatic
 *    defence: a longer summary or a third role spills silently onto page two, and
 *    nobody looks at a résumé's page count until someone else does.
 *  - **The fonts are embedded.** If `public/fonts/` is missing from the function
 *    bundle — the failure `outputFileTracingIncludes` exists to prevent —
 *    `@react-pdf` falls back to Helvetica without complaining.
 *  - **The metadata is set**, because some ATS parsers read it before the body.
 */
describe("renderResume", () => {
    it("renders a single-page PDF", async () => {
        const { bytes, pageCount } = await renderResume(projects);

        expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
        expect(pageCount).toBe(1);
    }, 60_000);

    it("embeds the site's three faces rather than falling back to Helvetica", async () => {
        const { bytes } = await renderResume(projects);
        const raw = Buffer.from(bytes).toString("latin1");

        for (const family of ["SpaceGrotesk", "Inter", "IBMPlexMono"]) {
            expect(raw).toContain(family);
        }

        /*
         * The tell for a failed font load. `@react-pdf` substitutes Helvetica
         * silently, so its absence is the only signal that registration worked.
         */
        expect(raw).not.toContain("/BaseFont /Helvetica");
    }, 60_000);

    it("sets document metadata", async () => {
        const { bytes } = await renderResume(projects);
        const raw = Buffer.from(bytes).toString("latin1");

        expect(raw).toContain("/Title");
        expect(raw).toContain("/Author");
        expect(raw).toContain("/Keywords");
    }, 60_000);

    it("stays under a size worth emailing", async () => {
        const { bytes } = await renderResume(projects);

        // Comfortably met today at ~55 KB; a tenfold jump means a raster crept in.
        expect(bytes.length).toBeLessThan(600 * 1024);
    }, 60_000);
});
