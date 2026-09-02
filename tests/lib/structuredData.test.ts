import { describe, expect, it } from "vitest";
import {
    PERSON_ID,
    WEBSITE_ID,
    buildBreadcrumbStructuredData,
    buildPersonStructuredData,
    buildProjectListStructuredData,
    buildProjectStructuredData,
    buildWebsiteStructuredData,
    serializeJsonLd,
} from "@/lib/structuredData";
import type { Project } from "@/types/project";

const ORIGIN = "https://example.test";

const fullProject: Project = {
    slug: "example-project",
    title: "Example Project",
    description: "A worked example.",
    technologies: ["Next.js", "TypeScript"],
    githubUrl: "https://github.com/zhongxuen/example-project",
    screenshots: ["/images/projects/example/cover.png"],
    publishedAt: "2024-01-01T00:00:00Z",
    lastUpdated: "2025-01-01T00:00:00Z",
};

const minimalProject: Project = {
    slug: "minimal-project",
    title: "Minimal Project",
    description: "No repo, no screenshots, no dates.",
    technologies: ["Java"],
};

/**
 * A JSON-LD node is only useful to a crawler if it survives serialization
 * intact: every builder output must round-trip through JSON with nothing
 * dropped (an `undefined` value) and no `null` holes, and must carry the
 * @context/@type pair that identifies it as schema.org data.
 */
function expectValidJsonLd(node: object) {
    expect(node).toMatchObject({ "@context": "https://schema.org" });
    expect(typeof (node as Record<string, unknown>)["@type"]).toBe("string");

    const roundTripped = JSON.parse(JSON.stringify(node));

    // toStrictEqual — unlike toEqual — fails on keys whose value is
    // `undefined`, which JSON.stringify would silently drop.
    expect(roundTripped).toStrictEqual(node);
    expect(JSON.stringify(node)).not.toContain(":null");
}

describe("serializeJsonLd", () => {
    it("produces parseable JSON", () => {
        expect(JSON.parse(serializeJsonLd({ a: 1, b: "two" }))).toEqual({ a: 1, b: "two" });
    });

    it("escapes the characters that could break out of a script tag", () => {
        const serialized = serializeJsonLd({ description: "</script><img src=x> & more" });

        expect(serialized).not.toContain("<");
        expect(serialized).not.toContain(">");
        expect(serialized).not.toContain("&");
    });

    it("leaves the escaped payload semantically identical", () => {
        const data = { description: "</script> & <b>bold</b>" };

        expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
    });
});

describe("buildProjectStructuredData", () => {
    it("is valid JSON-LD", () => {
        expectValidJsonLd(buildProjectStructuredData(fullProject));
    });

    it("describes the project as SoftwareSourceCode anchored to its detail URL", () => {
        expect(buildProjectStructuredData(fullProject)).toMatchObject({
            "@type": "SoftwareSourceCode",
            "@id": `${ORIGIN}/projects/example-project#project`,
            url: `${ORIGIN}/projects/example-project`,
            name: "Example Project",
            description: "A worked example.",
            codeRepository: "https://github.com/zhongxuen/example-project",
            programmingLanguage: ["Next.js", "TypeScript"],
            keywords: "Next.js, TypeScript",
            datePublished: "2024-01-01T00:00:00Z",
            dateModified: "2025-01-01T00:00:00Z",
        });
    });

    it("references the shared Person and WebSite nodes instead of restating them", () => {
        expect(buildProjectStructuredData(fullProject)).toMatchObject({
            author: { "@type": "Person", "@id": PERSON_ID },
            isPartOf: { "@id": WEBSITE_ID },
        });
    });

    it("absolutizes the first screenshot as the image", () => {
        expect(buildProjectStructuredData(fullProject).image).toBe(
            `${ORIGIN}/images/projects/example/cover.png`,
        );
    });

    it("falls back to the generated OG image when there is no screenshot", () => {
        expect(buildProjectStructuredData(minimalProject).image).toBe(
            `${ORIGIN}/projects/minimal-project/opengraph-image`,
        );
    });

    it("omits optional keys rather than serializing them as null", () => {
        const serialized = JSON.parse(serializeJsonLd(buildProjectStructuredData(minimalProject)));

        expect(serialized).not.toHaveProperty("codeRepository");
        expect(serialized).not.toHaveProperty("datePublished");
        expect(serialized).not.toHaveProperty("dateModified");
    });
});

describe("buildProjectListStructuredData", () => {
    const list = buildProjectListStructuredData([fullProject, minimalProject]);

    it("is valid JSON-LD", () => {
        expectValidJsonLd(list);
    });

    it("is an ItemList whose count matches its elements", () => {
        expect(list["@type"]).toBe("ItemList");
        expect(list.numberOfItems).toBe(2);
        expect(list.itemListElement).toHaveLength(2);
    });

    it("numbers positions from 1 in the given order", () => {
        expect(list.itemListElement).toEqual([
            {
                "@type": "ListItem",
                position: 1,
                name: "Example Project",
                url: `${ORIGIN}/projects/example-project`,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "Minimal Project",
                url: `${ORIGIN}/projects/minimal-project`,
            },
        ]);
    });

    it("stays valid for an empty list", () => {
        const empty = buildProjectListStructuredData([]);

        expectValidJsonLd(empty);
        expect(empty.numberOfItems).toBe(0);
        expect(empty.itemListElement).toEqual([]);
    });
});

describe("buildWebsiteStructuredData", () => {
    const website = buildWebsiteStructuredData();

    it("is valid JSON-LD", () => {
        expectValidJsonLd(website);
    });

    it("is a WebSite at the stable @id, pointing at the Person node", () => {
        expect(website).toMatchObject({
            "@type": "WebSite",
            "@id": `${ORIGIN}/#website`,
            url: ORIGIN,
            inLanguage: "en-MY",
            publisher: { "@type": "Person", "@id": PERSON_ID },
            about: { "@id": PERSON_ID },
        });
    });
});

describe("buildPersonStructuredData", () => {
    const person = buildPersonStructuredData();

    it("is valid JSON-LD", () => {
        expectValidJsonLd(person);
    });

    it("is a Person at the stable @id with an absolute image and mailto email", () => {
        expect(person).toMatchObject({
            "@type": "Person",
            "@id": `${ORIGIN}/#person`,
            url: ORIGIN,
        });
        expect(person.image.startsWith(`${ORIGIN}/`)).toBe(true);
        expect(person.email.startsWith("mailto:")).toBe(true);
    });

    it("derives alumniOf from education data, deduplicated by institution", () => {
        const names = person.alumniOf.map((entry) => entry.name);

        expect(names.length).toBeGreaterThan(0);
        expect(new Set(names).size).toBe(names.length);
        person.alumniOf.forEach((entry) => {
            expect(entry["@type"]).toBe("EducationalOrganization");
        });
    });

    it("derives knowsAbout from skills data, deduplicated", () => {
        expect(person.knowsAbout.length).toBeGreaterThan(0);
        expect(new Set(person.knowsAbout).size).toBe(person.knowsAbout.length);
    });

    it("lists only absolute profile URLs in sameAs", () => {
        person.sameAs.forEach((url) => {
            expect(() => new URL(url)).not.toThrow();
        });
    });
});

describe("buildBreadcrumbStructuredData", () => {
    const breadcrumb = buildBreadcrumbStructuredData([
        { name: "Home", url: ORIGIN },
        { name: "Projects", url: `${ORIGIN}/projects` },
        { name: "Example Project", url: `${ORIGIN}/projects/example-project` },
    ]);

    it("is valid JSON-LD", () => {
        expectValidJsonLd(breadcrumb);
    });

    it("is a BreadcrumbList numbered from 1 in trail order", () => {
        expect(breadcrumb["@type"]).toBe("BreadcrumbList");
        expect(breadcrumb.itemListElement).toEqual([
            { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN },
            {
                "@type": "ListItem",
                position: 2,
                name: "Projects",
                item: `${ORIGIN}/projects`,
            },
            {
                "@type": "ListItem",
                position: 3,
                name: "Example Project",
                item: `${ORIGIN}/projects/example-project`,
            },
        ]);
    });
});
