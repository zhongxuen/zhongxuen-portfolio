import { describe, expect, it } from "vitest";
import { buildMetadata } from "@/lib/metadata";
import { HOME_TITLE, SITE_NAME, SITE_URL } from "@/lib/constants";

/*
 * NEXT_PUBLIC_SITE_URL is pinned to https://example.test in vitest.config.ts,
 * so these assertions can name the exact strings the site would ship rather
 * than restating the constant they are meant to be checking.
 */
const ORIGIN = "https://example.test";

describe("buildMetadata — canonical URL", () => {
    it("resolves the pinned origin", () => {
        expect(SITE_URL).toBe(ORIGIN);
    });

    it("uses the bare origin when no path is given", () => {
        expect(buildMetadata().alternates?.canonical).toBe(ORIGIN);
    });

    it("appends the path to the origin", () => {
        expect(buildMetadata({ path: "/projects" }).alternates?.canonical).toBe(
            `${ORIGIN}/projects`,
        );
        expect(buildMetadata({ path: "/projects/jobnow" }).alternates?.canonical).toBe(
            `${ORIGIN}/projects/jobnow`,
        );
    });

    it("emits a canonical with no doubled slash after the origin", () => {
        const canonical = String(buildMetadata({ path: "/projects" }).alternates?.canonical);

        expect(canonical.slice(ORIGIN.length)).toBe("/projects");
    });

    it("sets metadataBase to the origin so relative asset URLs resolve", () => {
        expect(buildMetadata().metadataBase?.toString()).toBe(`${ORIGIN}/`);
    });

    it("points the OpenGraph url at the same URL as the canonical", () => {
        const metadata = buildMetadata({ path: "/projects/jobnow" });

        expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
    });
});

describe("buildMetadata — title", () => {
    it("uses HOME_TITLE for the home page when no title is passed", () => {
        expect(buildMetadata({ isHome: true }).title).toBe(HOME_TITLE);
    });

    it("uses an explicit home title verbatim, without the site-name suffix", () => {
        const metadata = buildMetadata({ isHome: true, title: "Custom Home" });

        expect(metadata.title).toBe("Custom Home");
        expect(metadata.title).not.toContain(SITE_NAME);
    });

    it("suffixes non-home titles with the site name", () => {
        expect(buildMetadata({ title: "Projects" }).title).toBe(`Projects | ${SITE_NAME}`);
    });

    it("falls back to the site name for a non-home page with no title", () => {
        expect(buildMetadata().title).toBe(SITE_NAME);
    });

    it("mirrors the resolved title into OpenGraph and Twitter", () => {
        const metadata = buildMetadata({ title: "Projects" });

        expect(metadata.openGraph?.title).toBe(`Projects | ${SITE_NAME}`);
        expect(metadata.twitter?.title).toBe(`Projects | ${SITE_NAME}`);
    });
});

describe("buildMetadata — keywords and type", () => {
    it("merges page keywords after the identity keywords, deduplicated", () => {
        const keywords = buildMetadata({ keywords: ["Next.js", "Portfolio"] }).keywords;

        expect(keywords).toEqual([
            "Goh Zhong Xuen",
            "Software Engineer",
            "Portfolio",
            "Malaysia",
            "Next.js",
        ]);
    });

    it("defaults to an og:type of website", () => {
        expect(buildMetadata().openGraph).toMatchObject({ type: "website" });
    });

    it("carries article dates and tags when type is article", () => {
        const metadata = buildMetadata({
            type: "article",
            path: "/projects/jobnow",
            publishedTime: "2024-01-01T00:00:00Z",
            modifiedTime: "2025-01-01T00:00:00Z",
            keywords: ["Next.js"],
        });

        expect(metadata.openGraph).toMatchObject({
            type: "article",
            publishedTime: "2024-01-01T00:00:00Z",
            modifiedTime: "2025-01-01T00:00:00Z",
            tags: ["Next.js"],
        });
    });
});
