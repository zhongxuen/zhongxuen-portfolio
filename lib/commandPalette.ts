import { navigation } from "@/data/navigation";
import { socials } from "@/data/socials";
import { AUTHOR } from "@/lib/constants";
import { resolveNavHref } from "@/lib/navigation";
import { PROJECTS_PATH } from "@/lib/projectFilters";
import { THEME_MODES, type ThemeMode } from "@/lib/theme";
import type { ResumeMeta } from "@/lib/resume";
import type { Project } from "@/types/project";

/**
 * The ⌘K palette's action list and its matcher (docs/uiux.md §5.1).
 *
 * Everything here is pure and free of React and of browser globals, which is
 * the point: the palette's interesting logic — what commands exist, and which
 * of them a query selects — is unit-testable without rendering anything, and
 * the component in components/ui/CommandPalette.tsx is left with presentation
 * and keyboard plumbing only.
 *
 * `import type { ResumeMeta }` is deliberate: lib/resume.ts reaches for
 * node:fs, and a value import would drag that into the client bundle. The
 * measured resume metadata is resolved on the server and passed down as a prop.
 *
 * Nothing below is hardcoded that already lives in data/: sections come from
 * data/navigation.ts, external links from data/socials.ts, theme modes from
 * lib/theme.ts, and the projects arrive from data/projects.ts via the caller.
 */

/** What activating a command does — the component switches on this. */
export type CommandKind = "section" | "project" | "link" | "download" | "theme" | "copy";

interface CommandBase {
    /** Stable across renders; also the DOM id of the rendered option. */
    id: string;
    label: string;
    /** Heading the command is filed under in the list. */
    group: string;
    /** Mono annotation on the right of the row. */
    hint?: string;
    /** Folded into the match but never displayed. */
    keywords?: string;
}

/** A command that resolves to an href — rendered as a real anchor. */
export interface NavigateCommand extends CommandBase {
    kind: "section" | "project" | "link" | "download";
    href: string;
    /** Opens in a new tab, with the usual rel hardening. */
    external?: boolean;
}

export interface ThemeCommand extends CommandBase {
    kind: "theme";
    mode: ThemeMode;
}

export interface CopyCommand extends CommandBase {
    kind: "copy";
    value: string;
    /** Announced in the palette's live region once the copy lands. */
    confirmation: string;
}

export type CommandAction = NavigateCommand | ThemeCommand | CopyCommand;

/**
 * The slice of a Project the palette needs. Passing this rather than the whole
 * `Project` keeps data/projects.ts — long descriptions, challenges, lessons —
 * out of the client bundle; only the title, its route and its stack cross the
 * boundary.
 */
export interface PaletteProject {
    slug: string;
    title: string;
    /** Folded into the match, so "supabase" finds the projects that use it. */
    technologies: string[];
}

/**
 * Narrows the full project records to what actually crosses the client
 * boundary. Called on the server, in app/layout.tsx.
 */
export function toPaletteProjects(projects: Project[]): PaletteProject[] {
    return projects.map(({ slug, title, technologies }) => ({ slug, title, technologies }));
}

export interface BuildCommandsInput {
    projects: PaletteProject[];
    resume: ResumeMeta;
    /** Whether the palette is open on `/`, where bare `#section` hrefs work. */
    isHome: boolean;
}

export const COMMAND_GROUPS = {
    jump: "Jump to",
    projects: "Projects",
    actions: "Actions",
    theme: "Theme",
    elsewhere: "Elsewhere",
} as const;

/** Reads as an instruction in the row, which is what a command should. */
const THEME_LABELS: Record<ThemeMode, string> = {
    system: "Match system theme",
    light: "Switch to light theme",
    dark: "Switch to dark theme",
};

/** Narrows a URL to its recognisable part: a host, or a mail address. */
function annotateUrl(url: string): string {
    try {
        const parsed = new URL(url);

        return parsed.protocol === "https:" || parsed.protocol === "http:"
            ? parsed.hostname.replace(/^www\./, "")
            : parsed.pathname;
    } catch {
        return url;
    }
}

/** Every command the palette can run, in the order it lists them unfiltered. */
export function buildCommandActions({
    projects,
    resume,
    isHome,
}: BuildCommandsInput): CommandAction[] {
    const sections: CommandAction[] = navigation.map((item) => ({
        kind: "section",
        id: `section:${item.id}`,
        group: COMMAND_GROUPS.jump,
        label: item.label,
        hint: "SECTION",
        href: resolveNavHref(item.href, isHome),
    }));

    const projectCommands: CommandAction[] = projects.map((project) => ({
        kind: "project",
        id: `project:${project.slug}`,
        group: COMMAND_GROUPS.projects,
        label: project.title,
        hint: "CASE STUDY",
        keywords: [project.slug, ...project.technologies].join(" "),
        href: `${PROJECTS_PATH}/${project.slug}`,
    }));

    const actions: CommandAction[] = [
        {
            kind: "link",
            id: "action:all-projects",
            group: COMMAND_GROUPS.jump,
            label: "All projects",
            hint: "INDEX",
            keywords: "work portfolio case studies",
            href: PROJECTS_PATH,
        },
        {
            kind: "copy",
            id: "action:copy-email",
            group: COMMAND_GROUPS.actions,
            label: "Copy email address",
            hint: AUTHOR.email,
            keywords: `${AUTHOR.email} clipboard contact`,
            value: AUTHOR.email,
            confirmation: "Email address copied to the clipboard.",
        },
        {
            kind: "download",
            id: "action:resume",
            group: COMMAND_GROUPS.actions,
            label: "Download resume",
            // The size is measured off the real PDF by lib/resume.ts, so this
            // annotation cannot drift from the file the link serves.
            hint: resume.sizeLabel ? `PDF · ${resume.sizeLabel}` : "PDF",
            keywords: "cv curriculum vitae pdf",
            href: resume.path,
            external: true,
        },
    ];

    /*
     * Three explicit modes rather than one "toggle theme" row. A palette is
     * searched, not cycled: typing "dark" should land on dark, not on whatever
     * the cycle happens to reach next. The list is derived from THEME_MODES so
     * it cannot drift from the toggle beside it.
     */
    const themes: CommandAction[] = THEME_MODES.map((mode) => ({
        kind: "theme",
        id: `theme:${mode}`,
        group: COMMAND_GROUPS.theme,
        label: THEME_LABELS[mode],
        hint: mode.toUpperCase(),
        keywords: "appearance colour color scheme",
        mode,
    }));

    const elsewhere: CommandAction[] = socials.map((social) => ({
        kind: "link",
        id: `social:${social.id}`,
        group: COMMAND_GROUPS.elsewhere,
        label: social.label,
        hint: annotateUrl(social.url),
        keywords: social.url,
        href: social.url,
        // A mailto: hands off to the mail client; a new tab would be an empty
        // one left behind.
        external: /^https?:/i.test(social.url),
    }));

    return [...sections, ...projectCommands, ...actions, ...themes, ...elsewhere];
}

/* ---------------------------------------------------------------------------
 * Matching
 * ------------------------------------------------------------------------ */

export interface CommandMatch {
    action: CommandAction;
    score: number;
    /** Indices into `action.label` to emphasise. Empty for keyword-only hits. */
    indices: number[];
}

/** Scoring weights. Tuned so a prefix always beats a scattered subsequence. */
const SCORE = {
    /** Every matched character is worth something on its own. */
    char: 1,
    /** Runs read as a real word fragment, not a coincidence. */
    consecutive: 8,
    /** Matching the start of a word — the "v" in "AI Code Visualizer". */
    wordStart: 6,
    /** Matching the very first character. */
    prefix: 6,
    /** Per character skipped before a match, so near matches rank first. */
    gap: 0.4,
    /** A label hit always outranks a hit that only landed in the keywords. */
    label: 100,
};

const isWordChar = (char: string | undefined) => char !== undefined && /[a-z0-9]/.test(char);

/**
 * Scores `token` as a subsequence of `text`, or returns null if it is not one.
 *
 * Greedy left to right. As a *test* for a subsequence that is exact; the
 * positions it picks are merely good, not optimal, which is the right trade
 * across a list this size — searching for the best alignment would cost more
 * than it could ever be worth over ~25 candidates.
 */
export function fuzzyMatchToken(
    token: string,
    text: string,
): { score: number; indices: number[] } | null {
    const needle = token.toLowerCase();
    const haystack = text.toLowerCase();

    if (needle.length === 0) return { score: 0, indices: [] };
    if (needle.length > haystack.length) return null;

    const indices: number[] = [];
    let score = 0;
    let cursor = 0;

    for (let n = 0; n < needle.length; n += 1) {
        const found = haystack.indexOf(needle[n], cursor);
        if (found === -1) return null;

        score += SCORE.char;

        if (n > 0 && found === indices[n - 1] + 1) {
            score += SCORE.consecutive;
        }

        if (found === 0) {
            score += SCORE.prefix;
        } else if (!isWordChar(haystack[found - 1])) {
            score += SCORE.wordStart;
        }

        score -= (found - cursor) * SCORE.gap;

        indices.push(found);
        cursor = found + 1;
    }

    return { score, indices };
}

/**
 * All whitespace-separated tokens must match, each independently.
 *
 * Splitting is what makes "vis ai" find "AI Code Visualizer" — a single
 * subsequence pass over the raw query would require the words in the order
 * they appear in the label, which is not how anyone types into a palette.
 */
export function fuzzyMatch(
    query: string,
    text: string,
): { score: number; indices: number[] } | null {
    const tokens = query.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) return { score: 0, indices: [] };

    const indices = new Set<number>();
    let score = 0;

    for (const token of tokens) {
        const match = fuzzyMatchToken(token, text);
        if (match === null) return null;

        score += match.score;
        match.indices.forEach((index) => indices.add(index));
    }

    return { score, indices: [...indices].sort((a, b) => a - b) };
}

/**
 * Filters and ranks the action list, best first.
 *
 * An empty query returns everything in its authored order — the palette's
 * resting state is a table of contents, not an empty box.
 *
 * A command matches on its label or, failing that, on a haystack of its label,
 * keywords and hint. Keyword-only hits are still offered (typing "supabase"
 * should surface the projects that use it) but score below every label hit and
 * highlight nothing, because the characters they matched are not on screen.
 */
export function filterCommands(actions: CommandAction[], query: string): CommandMatch[] {
    const trimmed = query.trim();

    if (trimmed.length === 0) {
        return actions.map((action) => ({ action, score: 0, indices: [] }));
    }

    const ranked: Array<CommandMatch & { order: number }> = [];

    actions.forEach((action, order) => {
        const onLabel = fuzzyMatch(trimmed, action.label);

        if (onLabel) {
            ranked.push({
                action,
                score: onLabel.score + SCORE.label,
                indices: onLabel.indices,
                order,
            });
            return;
        }

        const haystack = [action.label, action.keywords, action.hint].filter(Boolean).join(" ");
        const onKeywords = fuzzyMatch(trimmed, haystack);

        if (onKeywords) {
            ranked.push({ action, score: onKeywords.score, indices: [], order });
        }
    });

    return ranked
        .sort((a, b) => b.score - a.score || a.order - b.order)
        .map(({ action, score, indices }) => ({ action, score, indices }));
}

/** A run of label text, either matched by the query or not. */
export interface LabelSegment {
    text: string;
    matched: boolean;
}

/**
 * Splits a label into alternating matched / unmatched runs for highlighting.
 *
 * Runs rather than one element per character: a label chopped into 20 spans is
 * read out letter by letter by some screen readers, and "AI Code Visualizer"
 * spelled aloud is worse than no highlight at all.
 */
export function toLabelSegments(text: string, indices: number[]): LabelSegment[] {
    if (indices.length === 0) {
        return text.length === 0 ? [] : [{ text, matched: false }];
    }

    const matched = new Set(indices);
    const segments: LabelSegment[] = [];

    for (let position = 0; position < text.length; position += 1) {
        const isMatch = matched.has(position);
        const last = segments[segments.length - 1];

        if (last && last.matched === isMatch) {
            last.text += text[position];
        } else {
            segments.push({ text: text[position], matched: isMatch });
        }
    }

    return segments;
}

/* ---------------------------------------------------------------------------
 * Grouping
 * ------------------------------------------------------------------------ */

/** One rendered row: its match, plus its position in the flattened list. */
export interface CommandRow {
    match: CommandMatch;
    /** Index used by the arrow keys and by `aria-activedescendant`. */
    index: number;
}

export interface CommandGroup {
    name: string;
    rows: CommandRow[];
}

/**
 * Buckets ranked matches under their group headings.
 *
 * Groups appear in order of their best match and rows keep their rank within a
 * group, so the headings survive sorting instead of a filtered list collapsing
 * into one undifferentiated run. `index` is assigned over the flattened
 * result, which is the order the arrow keys walk — the two cannot drift
 * because they are produced here together.
 */
export function groupCommandMatches(matches: CommandMatch[]): CommandGroup[] {
    const buckets = new Map<string, CommandMatch[]>();

    for (const match of matches) {
        const bucket = buckets.get(match.action.group);

        if (bucket) {
            bucket.push(match);
        } else {
            buckets.set(match.action.group, [match]);
        }
    }

    let index = 0;

    return [...buckets.entries()].map(([name, groupMatches]) => ({
        name,
        rows: groupMatches.map((match) => ({ match, index: index++ })),
    }));
}

/** The flattened row order — what the arrow keys and Enter operate on. */
export function flattenGroups(groups: CommandGroup[]): CommandMatch[] {
    return groups.flatMap((group) => group.rows.map((row) => row.match));
}
