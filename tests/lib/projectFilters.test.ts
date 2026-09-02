import { describe, expect, it } from "vitest";
import type { Project } from "@/types/project";
import {
    PROJECTS_PATH,
    buildProjectsHref,
    buildSortHref,
    buildTechHref,
    matchesQuery,
    parseQuery,
    parseSort,
    resolveProjects,
    searchProjects,
    sortProjects,
    type ProjectsQuery,
} from "@/lib/projectFilters";

/** Minimal fixture — only the fields the search and sort paths actually read. */
function project(overrides: Partial<Project> & Pick<Project, "slug">): Project {
    return {
        title: "Untitled",
        description: "",
        technologies: [],
        ...overrides,
    };
}

const query = (overrides: Partial<ProjectsQuery> = {}): ProjectsQuery => ({
    tech: [],
    q: "",
    sort: "curated",
    ...overrides,
});

describe("matchesQuery", () => {
    const jobnow = project({
        slug: "jobnow",
        title: "JobNow – Job Listing Application",
        description: "A swipe-based mobile job-search app for Android.",
        technologies: ["React Native", "Expo", "TypeScript"],
    });

    it("matches an empty query against everything", () => {
        expect(matchesQuery(jobnow, "")).toBe(true);
    });

    it("matches on the title", () => {
        expect(matchesQuery(jobnow, "listing")).toBe(true);
    });

    it("matches on the description", () => {
        expect(matchesQuery(jobnow, "android")).toBe(true);
    });

    it("matches on a technology", () => {
        expect(matchesQuery(jobnow, "expo")).toBe(true);
    });

    it("is case-insensitive and matches inside a word", () => {
        expect(matchesQuery(jobnow, "TYPE")).toBe(true);
    });

    it("requires every term, so more words narrow the result", () => {
        expect(matchesQuery(jobnow, "swipe expo")).toBe(true);
        expect(matchesQuery(jobnow, "swipe django")).toBe(false);
    });

    it("rejects a term that appears nowhere", () => {
        expect(matchesQuery(jobnow, "kubernetes")).toBe(false);
    });

    it("ignores the fields search is not meant to reach", () => {
        const hidden = project({
            slug: "hidden",
            title: "Untitled",
            longDescription: "mentions kubernetes at length",
        });

        expect(matchesQuery(hidden, "kubernetes")).toBe(false);
    });
});

describe("parseQuery", () => {
    it("collapses whitespace and trims", () => {
        expect(parseQuery("  next   js ")).toBe("next js");
    });

    it("treats a missing param as no query", () => {
        expect(parseQuery(undefined)).toBe("");
    });

    it("takes the first value of a repeated param", () => {
        expect(parseQuery(["first", "second"])).toBe("first");
    });

    it("caps the length so the value cannot be echoed unbounded", () => {
        expect(parseQuery("x".repeat(500))).toHaveLength(100);
    });
});

describe("parseSort", () => {
    it("accepts the three known orders", () => {
        expect(parseSort("curated")).toBe("curated");
        expect(parseSort("updated")).toBe("updated");
        expect(parseSort("stars")).toBe("stars");
    });

    it("falls back to curated for anything else", () => {
        expect(parseSort("popularity")).toBe("curated");
        expect(parseSort(undefined)).toBe("curated");
    });
});

describe("sortProjects", () => {
    const catalogue = [
        project({ slug: "a", stars: 3, lastUpdated: "2026-01-01T00:00:00Z" }),
        project({ slug: "b" }),
        project({ slug: "c", stars: 11, lastUpdated: "2025-06-01T00:00:00Z" }),
        project({ slug: "d", stars: 11, lastUpdated: "2026-08-01T00:00:00Z" }),
    ];

    const order = (sort: Parameters<typeof sortProjects>[1]) =>
        sortProjects(catalogue, sort).map((entry) => entry.slug);

    it("leaves curated order untouched", () => {
        expect(order("curated")).toEqual(["a", "b", "c", "d"]);
        expect(sortProjects(catalogue, "curated")).toBe(catalogue);
    });

    it("sorts by stars descending", () => {
        expect(order("stars").slice(0, 3)).toEqual(["c", "d", "a"]);
    });

    it("sorts by last updated, newest first", () => {
        expect(order("updated").slice(0, 3)).toEqual(["d", "a", "c"]);
    });

    it("keeps entries with no data last in both orders", () => {
        expect(order("stars").at(-1)).toBe("b");
        expect(order("updated").at(-1)).toBe("b");
    });

    it("breaks ties by curated position, so the order is total", () => {
        // c and d both have 11 stars; c comes first in the data.
        expect(order("stars").slice(0, 2)).toEqual(["c", "d"]);
    });

    it("does not mutate the input", () => {
        const input = [...catalogue];
        sortProjects(input, "stars");

        expect(input.map((entry) => entry.slug)).toEqual(["a", "b", "c", "d"]);
    });
});

describe("searchProjects", () => {
    const catalogue = [
        project({ slug: "a", title: "Helpdesk", technologies: ["Next.js"] }),
        project({ slug: "b", title: "Visualizer", technologies: ["React Flow"] }),
    ];

    it("returns the input untouched for an empty query", () => {
        expect(searchProjects(catalogue, "")).toBe(catalogue);
    });

    it("narrows to the matching entries", () => {
        expect(searchProjects(catalogue, "flow").map((entry) => entry.slug)).toEqual(["b"]);
    });
});

describe("buildProjectsHref", () => {
    it("omits every default, so the unfiltered catalogue is exactly /projects", () => {
        expect(buildProjectsHref(query())).toBe(PROJECTS_PATH);
        expect(buildProjectsHref()).toBe(PROJECTS_PATH);
    });

    it("serialises q, sort and tech in a fixed order", () => {
        expect(buildProjectsHref({ q: "swipe", sort: "stars", tech: ["Next.js"] })).toBe(
            "/projects?q=swipe&sort=stars&tech=Next.js",
        );
    });

    it("sorts the tech selection so one result set has one URL", () => {
        expect(buildProjectsHref({ tech: ["Supabase", "Next.js"] })).toBe(
            buildProjectsHref({ tech: ["Next.js", "Supabase"] }),
        );
    });
});

describe("buildTechHref", () => {
    it("adds a facet while preserving the search and sort", () => {
        expect(buildTechHref(query({ q: "app", sort: "updated" }), "Next.js")).toBe(
            "/projects?q=app&sort=updated&tech=Next.js",
        );
    });

    it("removes a facet that is already selected", () => {
        expect(buildTechHref(query({ tech: ["Next.js", "Supabase"] }), "Next.js")).toBe(
            "/projects?tech=Supabase",
        );
    });

    it("clears only the technology selection when given no facet", () => {
        expect(buildTechHref(query({ tech: ["Next.js"], q: "app" }))).toBe("/projects?q=app");
    });
});

describe("buildSortHref", () => {
    it("drops the parameter entirely for the default order", () => {
        expect(buildSortHref(query({ sort: "stars" }), "curated")).toBe(PROJECTS_PATH);
    });
});

describe("resolveProjects", () => {
    const catalogue = [
        project({ slug: "a", title: "Helpdesk", technologies: ["Next.js"], stars: 1 }),
        project({ slug: "b", title: "Helpdesk CLI", technologies: ["Java"], stars: 9 }),
        project({ slug: "c", title: "Visualizer", technologies: ["Next.js"], stars: 5 }),
    ];

    it("applies filter, then search, then sort", () => {
        const result = resolveProjects(
            catalogue,
            query({ tech: ["Next.js"], q: "help", sort: "stars" }),
        );

        expect(result.map((entry) => entry.slug)).toEqual(["a"]);
    });

    it("sorts the narrowed set, not the whole catalogue", () => {
        const result = resolveProjects(catalogue, query({ tech: ["Next.js"], sort: "stars" }));

        expect(result.map((entry) => entry.slug)).toEqual(["c", "a"]);
    });
});
