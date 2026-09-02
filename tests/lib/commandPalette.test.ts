import { describe, expect, it } from "vitest";
import {
    buildCommandActions,
    filterCommands,
    flattenGroups,
    fuzzyMatch,
    groupCommandMatches,
    toLabelSegments,
    toPaletteProjects,
    type CommandAction,
    type NavigateCommand,
} from "@/lib/commandPalette";
import { navigation } from "@/data/navigation";
import { socials } from "@/data/socials";
import { projects } from "@/data/projects";
import { AUTHOR } from "@/lib/constants";
import { THEME_MODES } from "@/lib/theme";

/**
 * The palette's logic is deliberately kept out of the component so it can be
 * exercised here: what commands exist, and which of them a query selects.
 */

const resume = { path: "/resume/resume.pdf", sizeLabel: "412 KB" };

const paletteProjects = toPaletteProjects(projects);

function actions(isHome = true): CommandAction[] {
    return buildCommandActions({ projects: paletteProjects, resume, isHome });
}

function labels(query: string, isHome = true): string[] {
    return filterCommands(actions(isHome), query).map((match) => match.action.label);
}

describe("buildCommandActions", () => {
    it("covers every section, project, theme mode and social link", () => {
        const built = actions();

        expect(built.filter((action) => action.kind === "section")).toHaveLength(navigation.length);
        expect(built.filter((action) => action.kind === "project")).toHaveLength(projects.length);
        expect(built.filter((action) => action.kind === "theme")).toHaveLength(THEME_MODES.length);

        socials.forEach((social) => {
            expect(built.some((action) => action.id === `social:${social.id}`)).toBe(true);
        });
    });

    it("gives every command a unique id, since it is also a DOM id", () => {
        const ids = actions().map((action) => action.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    /*
     * The same bug lib/navigation.ts exists to prevent: a bare `#about` on a
     * project page resolves against that page and goes nowhere.
     */
    it("rewrites section hrefs to absolute ones when away from the home route", () => {
        const sections = (isHome: boolean) =>
            actions(isHome).filter(
                (action): action is NavigateCommand => action.kind === "section",
            );

        expect(sections(false).every((action) => action.href.startsWith("/#"))).toBe(true);
        expect(sections(true).every((action) => action.href.startsWith("#"))).toBe(true);
    });

    it("opens web links in a new tab but hands mailto: to the mail client", () => {
        const built = actions();
        const github = built.find((action) => action.id === "social:github");
        const email = built.find((action) => action.id === "social:email");

        expect(github).toMatchObject({ external: true });
        expect(email).toMatchObject({ external: false });
    });

    it("annotates the resume with the size measured off the real file", () => {
        const download = actions().find((action) => action.id === "action:resume");

        expect(download).toMatchObject({ hint: "PDF · 412 KB", href: resume.path });
    });

    it("falls back to an unsized annotation when the PDF is missing", () => {
        const built = buildCommandActions({
            projects: paletteProjects,
            resume: { path: resume.path, sizeLabel: "" },
            isHome: true,
        });

        expect(built.find((action) => action.id === "action:resume")).toMatchObject({
            hint: "PDF",
        });
    });

    it("copies the address from lib/constants rather than a second copy of it", () => {
        expect(actions().find((action) => action.id === "action:copy-email")).toMatchObject({
            kind: "copy",
            value: AUTHOR.email,
        });
    });
});

describe("fuzzyMatch", () => {
    it("matches a subsequence and reports where it landed", () => {
        expect(fuzzyMatch("prj", "Projects")).toMatchObject({ indices: [0, 1, 3] });
    });

    it("rejects characters that are not there in order", () => {
        expect(fuzzyMatch("zq", "Projects")).toBeNull();
        expect(fuzzyMatch("stcejorp", "Projects")).toBeNull();
    });

    it("matches each whitespace-separated token independently, in any order", () => {
        expect(fuzzyMatch("vis ai", "AI Code Visualizer")).not.toBeNull();
        expect(fuzzyMatch("ai vis", "AI Code Visualizer")).not.toBeNull();
        expect(fuzzyMatch("vis zzz", "AI Code Visualizer")).toBeNull();
    });

    it("scores a prefix above a scattered subsequence of the same length", () => {
        const prefix = fuzzyMatch("con", "Contact");
        const scattered = fuzzyMatch("con", "Copy email address for contact");

        expect(prefix!.score).toBeGreaterThan(scattered!.score);
    });

    it("treats an empty query as a match on everything", () => {
        expect(fuzzyMatch("   ", "Anything")).toMatchObject({ indices: [] });
    });
});

describe("filterCommands", () => {
    it("returns every command, in authored order, for an empty query", () => {
        const all = actions();

        expect(filterCommands(all, "").map((match) => match.action)).toEqual(all);
        expect(filterCommands(all, "   ")).toHaveLength(all.length);
    });

    it("puts the exact label first", () => {
        expect(labels("contact")[0]).toBe("Contact");
        expect(labels("about")[0]).toBe("About");
    });

    it("ranks every label hit above a keyword-only hit", () => {
        const matches = filterCommands(actions(), "project");
        const firstKeywordOnly = matches.findIndex((match) => match.indices.length === 0);

        if (firstKeywordOnly !== -1) {
            matches.slice(firstKeywordOnly).forEach((match) => {
                expect(match.indices).toHaveLength(0);
            });
        }
    });

    /*
     * Technologies are folded into the keywords precisely so the palette can
     * answer "which of these used Supabase?" — the most likely thing a
     * recruiter types into it.
     */
    it("finds projects by a technology that never appears in their title", () => {
        const tech = projects.find((project) => project.technologies.length > 0)!.technologies[0];
        const expected = projects.filter((project) => project.technologies.includes(tech)).length;

        const found = filterCommands(actions(), tech).filter(
            (match) => match.action.kind === "project",
        );

        expect(found.length).toBeGreaterThanOrEqual(expected);
    });

    it("finds the theme commands by the theme being asked for", () => {
        expect(labels("dark")[0]).toBe("Switch to dark theme");
        expect(labels("light")[0]).toBe("Switch to light theme");
    });

    it("returns nothing rather than everything when nothing matches", () => {
        expect(filterCommands(actions(), "qqzzxx")).toHaveLength(0);
    });
});

describe("groupCommandMatches", () => {
    it("assigns indices over the flattened list, in the order rendered", () => {
        const groups = groupCommandMatches(filterCommands(actions(), ""));
        const flat = flattenGroups(groups);
        const indices = groups.flatMap((group) => group.rows.map((row) => row.index));

        expect(indices).toEqual(flat.map((_, position) => position));
        groups.forEach((group) =>
            group.rows.forEach((row) => expect(flat[row.index]).toBe(row.match)),
        );
    });

    it("files every match under its own group, with no group appearing twice", () => {
        const groups = groupCommandMatches(filterCommands(actions(), ""));
        const names = groups.map((group) => group.name);

        expect(new Set(names).size).toBe(names.length);
        groups.forEach((group) =>
            group.rows.forEach((row) => expect(row.match.action.group).toBe(group.name)),
        );
    });

    it("orders groups by their best match, so a search reorders the headings", () => {
        const groups = groupCommandMatches(filterCommands(actions(), "theme"));

        expect(groups[0]?.name).toBe("Theme");
    });
});

describe("toLabelSegments", () => {
    it("collapses matched characters into runs rather than one span each", () => {
        expect(toLabelSegments("Projects", [0, 1, 2])).toEqual([
            { text: "Pro", matched: true },
            { text: "jects", matched: false },
        ]);
    });

    it("round-trips the original text", () => {
        const text = "AI Code Visualizer";
        const indices = fuzzyMatch("aiv", text)!.indices;

        expect(
            toLabelSegments(text, indices)
                .map((segment) => segment.text)
                .join(""),
        ).toBe(text);
    });

    it("returns one unmatched run when nothing matched", () => {
        expect(toLabelSegments("Contact", [])).toEqual([{ text: "Contact", matched: false }]);
    });
});

describe("toPaletteProjects", () => {
    it("carries only the fields the palette reads across the client boundary", () => {
        paletteProjects.forEach((project) => {
            expect(Object.keys(project).sort()).toEqual(["slug", "technologies", "title"]);
        });
    });
});
