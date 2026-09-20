import { describe, expect, it } from "vitest";
import { applySyncPlan, buildSyncPlan, planSize } from "@/lib/admin/syncDiff";
import type { GitHubRepo } from "@/lib/github";
import type { Project } from "@/types/project";

/** A repo with only the fields the diff reads, so a test names what it is about. */
function repo(overrides: Partial<GitHubRepo> & { name: string }): GitHubRepo {
    return {
        id: 1,
        full_name: `zhongxuen/${overrides.name}`,
        html_url: `https://github.com/zhongxuen/${overrides.name}`,
        description: null,
        language: null,
        stargazers_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        pushed_at: "2026-01-01T00:00:00Z",
        fork: false,
        archived: false,
        homepage: null,
        ...overrides,
    };
}

function project(overrides: Partial<Project> & { slug: string }): Project {
    return {
        title: overrides.slug,
        description: "A description.",
        technologies: [],
        ...overrides,
    };
}

describe("buildSyncPlan", () => {
    it("proposes a repo with no local entry as an addition", () => {
        const plan = buildSyncPlan(
            [],
            [repo({ name: "new-thing", description: "  Does a thing. " })],
        );

        expect(plan.added).toHaveLength(1);
        expect(plan.added[0]).toMatchObject({
            slug: "new-thing",
            title: "new-thing",
            description: "Does a thing.",
            githubRepo: "new-thing",
            githubUrl: "https://github.com/zhongxuen/new-thing",
        });
    });

    it("seeds technologies from language and topics, title-cased and deduplicated", () => {
        const plan = buildSyncPlan(
            [],
            [repo({ name: "x", language: "TypeScript", topics: ["tailwind-css", "typescript"] })],
        );

        expect(plan.added[0].technologies).toEqual(["TypeScript", "Tailwind Css"]);
    });

    it("says so rather than inventing prose when the repo has no description", () => {
        const plan = buildSyncPlan([], [repo({ name: "x", description: null })]);

        expect(plan.added[0].description).toMatch(/No description/);
    });

    /**
     * The normalization case the adapter already handles. Getting this wrong means
     * proposing to add a project that is already listed, which is the sync page's
     * most damaging possible mistake.
     */
    it("matches across casing and separator differences", () => {
        const plan = buildSyncPlan(
            [project({ slug: "helpdesk", githubRepo: "it_ticket_helpdesk_system" })],
            [repo({ name: "IT-ticket-helpdesk-system" })],
        );

        expect(plan.added).toHaveLength(0);
        expect(plan.orphaned).toHaveLength(0);
    });

    it("matches on the repo segment of githubUrl when githubRepo is unset", () => {
        const plan = buildSyncPlan(
            [project({ slug: "a", githubUrl: "https://github.com/zhongxuen/thing" })],
            [repo({ name: "thing" })],
        );

        expect(plan.added).toHaveLength(0);
    });

    it("flags a changed liveUrl but never applies it on its own", () => {
        const plan = buildSyncPlan(
            [
                project({
                    slug: "a",
                    githubRepo: "a",
                    githubUrl: "https://github.com/zhongxuen/a",
                    liveUrl: "https://old.example",
                }),
            ],
            [repo({ name: "a", homepage: "https://new.example" })],
        );

        expect(plan.changed).toEqual([
            {
                kind: "changed",
                slug: "a",
                title: "a",
                field: "liveUrl",
                current: "https://old.example",
                proposed: "https://new.example",
            },
        ]);
    });

    it("proposes a missing githubUrl on a matched project", () => {
        const plan = buildSyncPlan(
            [project({ slug: "a", githubRepo: "a" })],
            [repo({ name: "a" })],
        );

        expect(plan.changed).toHaveLength(1);
        expect(plan.changed[0]).toMatchObject({
            field: "githubUrl",
            proposed: "https://github.com/zhongxuen/a",
        });
        // Absent, not `undefined` — the UI renders "not set" for a missing `current`.
        expect(plan.changed[0]).not.toHaveProperty("current");
    });

    it("leaves a matching liveUrl alone", () => {
        const plan = buildSyncPlan(
            [
                project({
                    slug: "a",
                    githubRepo: "a",
                    githubUrl: "https://github.com/zhongxuen/a",
                    liveUrl: "https://same.example",
                }),
            ],
            [repo({ name: "a", homepage: "https://same.example" })],
        );

        expect(plan.changed).toHaveLength(0);
    });

    it("flags a project whose githubRepo no longer resolves", () => {
        const plan = buildSyncPlan([project({ slug: "a", githubRepo: "gone" })], []);

        expect(plan.orphaned).toEqual([
            { kind: "orphaned", slug: "a", title: "a", githubRepo: "gone" },
        ]);
    });

    it("does not flag a project that never claimed a repo", () => {
        const plan = buildSyncPlan([project({ slug: "chatbot" })], []);

        expect(plan.orphaned).toHaveLength(0);
    });

    it("lets each repo be claimed by at most one project", () => {
        const plan = buildSyncPlan(
            [
                project({ slug: "first", githubRepo: "shared" }),
                project({ slug: "second", githubRepo: "shared" }),
            ],
            [repo({ name: "shared" })],
        );

        // The repo is claimed, so it is not proposed as an addition to either.
        expect(plan.added).toHaveLength(0);
    });
});

describe("applySyncPlan", () => {
    const plan = buildSyncPlan(
        [project({ slug: "a", githubRepo: "a", liveUrl: "https://old.example" })],
        [repo({ name: "a", homepage: "https://new.example" }), repo({ name: "fresh" })],
    );

    it("applies only the selected entries", () => {
        const applied = applySyncPlan(
            [project({ slug: "a", githubRepo: "a", liveUrl: "https://old.example" })],
            plan,
            new Set(["changed:a:liveUrl"]),
        );

        expect(applied).toHaveLength(1);
        expect(applied[0].liveUrl).toBe("https://new.example");
    });

    it("appends an addition with featured false and the next order", () => {
        const applied = applySyncPlan(
            [project({ slug: "a", githubRepo: "a", order: 1 })],
            plan,
            new Set(["added:fresh"]),
        );

        expect(applied).toHaveLength(2);
        expect(applied[1]).toMatchObject({ slug: "fresh", featured: false, order: 2 });
    });

    it("applies nothing when nothing is selected", () => {
        const original = [project({ slug: "a", githubRepo: "a", liveUrl: "https://old.example" })];

        expect(applySyncPlan(original, plan, new Set())).toEqual(original);
    });

    it("skips an addition whose slug is already taken rather than suffixing it", () => {
        const applied = applySyncPlan([project({ slug: "fresh" })], plan, new Set(["added:fresh"]));

        expect(applied).toHaveLength(1);
    });

    it("never deletes an orphan", () => {
        const orphanPlan = buildSyncPlan([project({ slug: "a", githubRepo: "gone" })], []);
        const original = [project({ slug: "a", githubRepo: "gone" })];

        expect(applySyncPlan(original, orphanPlan, new Set(["orphaned:a"]))).toEqual(original);
    });
});

describe("planSize", () => {
    it("counts actionable entries only", () => {
        const plan = buildSyncPlan(
            [project({ slug: "a", githubRepo: "gone" })],
            [repo({ name: "fresh" })],
        );

        expect(plan.orphaned).toHaveLength(1);
        expect(planSize(plan)).toBe(1);
    });
});
