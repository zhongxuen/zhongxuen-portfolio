import { describe, expect, it } from "vitest";
import { mergeProjectWithRepo, mergeProjectsWithRepos } from "@/adapters/githubProjectAdapter";
import { projects as localProjects } from "@/data/projects";
import type { GitHubRepo } from "@/lib/github";
import type { Project } from "@/types/project";

/** Builds a GitHubRepo with realistic defaults; override only what a test asserts on. */
function makeRepo(overrides: Partial<GitHubRepo> & Pick<GitHubRepo, "name">): GitHubRepo {
    const name = overrides.name;

    return {
        id: 1,
        full_name: `zhongxuen/${name}`,
        html_url: `https://github.com/zhongxuen/${name}`,
        description: null,
        language: "TypeScript",
        stargazers_count: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
        pushed_at: "2024-06-01T00:00:00Z",
        fork: false,
        archived: false,
        homepage: null,
        ...overrides,
    };
}

function makeProject(overrides: Partial<Project> & Pick<Project, "slug">): Project {
    return {
        title: "Example",
        description: "An example project.",
        technologies: ["TypeScript"],
        ...overrides,
    };
}

describe("mergeProjectsWithRepos — cardinality (Wave 1 regression)", () => {
    it("returns exactly one entry per local project, whatever GitHub returns", () => {
        const repos = [
            makeRepo({ name: "ai-code-visualizer" }),
            makeRepo({ name: "some-unrelated-fork" }),
            makeRepo({ name: "dotfiles" }),
        ];

        expect(mergeProjectsWithRepos(localProjects, repos)).toHaveLength(localProjects.length);
    });

    it("returns the full local list when GitHub returns nothing", () => {
        expect(mergeProjectsWithRepos(localProjects, [])).toHaveLength(localProjects.length);
        expect(mergeProjectsWithRepos(localProjects, [])).toEqual(localProjects);
    });

    it("never appends a repo that has no local counterpart", () => {
        const merged = mergeProjectsWithRepos(localProjects, [
            makeRepo({ name: "repo-with-no-local-entry" }),
        ]);

        expect(merged.map((project) => project.slug)).toEqual(
            localProjects.map((project) => project.slug),
        );
    });

    it("keeps the closed slug set stable across an empty and a full repo response", () => {
        const allRepos = localProjects
            .map((project) => project.githubRepo)
            .filter((repo): repo is string => Boolean(repo))
            .map((name) => makeRepo({ name }));

        expect(mergeProjectsWithRepos(localProjects, allRepos).map((p) => p.slug)).toEqual(
            mergeProjectsWithRepos(localProjects, []).map((p) => p.slug),
        );
    });
});

describe("mergeProjectsWithRepos — matching", () => {
    it("matches on githubRepo", () => {
        const project = makeProject({ slug: "example", githubRepo: "example-repo" });
        const repo = makeRepo({ name: "example-repo", stargazers_count: 7 });

        expect(mergeProjectsWithRepos([project], [repo])[0].stars).toBe(7);
    });

    it("matches githubRepo regardless of casing and separators", () => {
        const project = makeProject({ slug: "helpdesk", githubRepo: "IT-ticket-helpdesk-system" });
        const repo = makeRepo({ name: "it_ticket_helpdesk_system", stargazers_count: 3 });

        expect(mergeProjectsWithRepos([project], [repo])[0].stars).toBe(3);
    });

    it("matches on the owner-qualified full_name", () => {
        const project = makeProject({ slug: "example", githubRepo: "zhongxuen/example-repo" });
        const repo = makeRepo({ name: "example-repo", stargazers_count: 4 });

        expect(mergeProjectsWithRepos([project], [repo])[0].stars).toBe(4);
    });

    it("falls back to the repo segment of githubUrl when githubRepo is absent", () => {
        const project = makeProject({
            slug: "example",
            githubUrl: "https://github.com/zhongxuen/url-only-repo",
        });
        const repo = makeRepo({ name: "url-only-repo", stargazers_count: 5 });

        expect(mergeProjectsWithRepos([project], [repo])[0].stars).toBe(5);
    });

    it("does not match on the slug", () => {
        const project = makeProject({ slug: "example-repo" });
        const repo = makeRepo({ name: "example-repo", stargazers_count: 9 });

        expect(mergeProjectsWithRepos([project], [repo])[0]).toEqual(project);
    });

    it("leaves a project whose repo is missing from GitHub untouched", () => {
        const project = makeProject({ slug: "no-repo", githubRepo: "missing-from-github" });

        expect(
            mergeProjectsWithRepos([project], [makeRepo({ name: "something-else" })])[0],
        ).toEqual(project);
    });

    it("lets at most one project claim a given repo", () => {
        const repo = makeRepo({ name: "shared-repo", stargazers_count: 11 });
        const merged = mergeProjectsWithRepos(
            [
                makeProject({ slug: "first", githubRepo: "shared-repo" }),
                makeProject({ slug: "second", githubRepo: "shared_repo" }),
            ],
            [repo],
        );

        expect(merged[0].stars).toBe(11);
        expect(merged[1].stars).toBeUndefined();
    });
});

describe("mergeProjectWithRepo — field precedence", () => {
    it("overlays GitHub stats onto the local project", () => {
        const merged = mergeProjectWithRepo(
            makeProject({ slug: "example", githubRepo: "example-repo" }),
            makeRepo({
                name: "example-repo",
                language: "Python",
                stargazers_count: 12,
                pushed_at: "2025-02-03T10:00:00Z",
                created_at: "2023-04-05T10:00:00Z",
            }),
        );

        expect(merged).toMatchObject({
            githubUrl: "https://github.com/zhongxuen/example-repo",
            language: "Python",
            stars: 12,
            lastUpdated: "2025-02-03T10:00:00Z",
            publishedAt: "2023-04-05T10:00:00Z",
        });
    });

    it("keeps the local liveUrl when the repo also has a homepage", () => {
        const merged = mergeProjectWithRepo(
            makeProject({ slug: "example", liveUrl: "https://local.example.com" }),
            makeRepo({ name: "example-repo", homepage: "https://repo-homepage.example.com" }),
        );

        expect(merged.liveUrl).toBe("https://local.example.com");
    });

    it("uses the repo homepage when the project has no liveUrl", () => {
        const merged = mergeProjectWithRepo(
            makeProject({ slug: "example" }),
            makeRepo({ name: "example-repo", homepage: "https://repo-homepage.example.com" }),
        );

        expect(merged.liveUrl).toBe("https://repo-homepage.example.com");
    });

    it("treats a blank or missing homepage as no liveUrl", () => {
        expect(
            mergeProjectWithRepo(
                makeProject({ slug: "example" }),
                makeRepo({ name: "example-repo", homepage: "   " }),
            ).liveUrl,
        ).toBeUndefined();

        expect(
            mergeProjectWithRepo(
                makeProject({ slug: "example" }),
                makeRepo({ name: "example-repo", homepage: null }),
            ).liveUrl,
        ).toBeUndefined();
    });

    it("never overwrites narrative content with GitHub data", () => {
        const project = makeProject({
            slug: "example",
            title: "Local title",
            description: "Local description.",
            keyFeatures: ["Local feature"],
            technologies: ["Next.js"],
        });

        const merged = mergeProjectWithRepo(
            project,
            makeRepo({ name: "example-repo", description: "GitHub blurb", language: "Python" }),
        );

        expect(merged).toMatchObject({
            title: "Local title",
            description: "Local description.",
            keyFeatures: ["Local feature"],
            technologies: ["Next.js"],
        });
    });

    it("returns the project unchanged when there is no repo", () => {
        const project = makeProject({ slug: "example" });

        expect(mergeProjectWithRepo(project, undefined)).toBe(project);
    });

    it("maps a null repo language to undefined rather than null", () => {
        const merged = mergeProjectWithRepo(
            makeProject({ slug: "example" }),
            makeRepo({ name: "example-repo", language: null }),
        );

        expect(merged.language).toBeUndefined();
    });
});
