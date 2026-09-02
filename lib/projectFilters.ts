import type { Project } from "@/types/project";

/**
 * Faceting, search and sort for /projects.
 *
 * All three live entirely in the URL (`/projects?tech=Next.js&q=swipe&sort=stars`)
 * and are read on the server, so every combination is a real, linkable,
 * crawlable address and the page stays a Server Component — no client state, no
 * hydration cost, and the back button works by itself. The search box is a
 * plain GET form and the sort control is a row of links, so both work with
 * JavaScript disabled (docs/uiux.md §11.1.3).
 *
 * Facets are derived from the union of `Project.technologies`; nothing here is
 * hardcoded, so adding a technology in data/projects.ts adds a filter.
 */

/** Route the filter links point at. */
export const PROJECTS_PATH = "/projects";

/** Query-string key carrying the tech selection. Repeated for multi-select. */
export const TECH_PARAM = "tech";

/** Query-string key carrying the free-text search. */
export const QUERY_PARAM = "q";

/** Query-string key carrying the sort order. */
export const SORT_PARAM = "sort";

/** The `searchParams` shape Next.js resolves for a page. */
export type SearchParams = Record<string, string | string[] | undefined>;

export type ProjectSort = "curated" | "updated" | "stars";

/** Data order — what `getProjects()` already returns, driven by `Project.order`. */
export const DEFAULT_SORT: ProjectSort = "curated";

export interface SortOption {
    value: ProjectSort;
    /** Label for the control. */
    label: string;
    /** Spoken form, used for the link's accessible name. */
    description: string;
}

export const SORT_OPTIONS: SortOption[] = [
    { value: "curated", label: "Curated", description: "my own order" },
    { value: "updated", label: "Updated", description: "most recently updated first" },
    { value: "stars", label: "Stars", description: "most starred first" },
];

/**
 * The complete state of the catalogue view. Every href on the page is built
 * from one of these, so a control can only ever change its own parameter and
 * never silently drop another.
 */
export interface ProjectsQuery {
    tech: string[];
    q: string;
    sort: ProjectSort;
}

export interface TechFacet {
    /** Canonical label, exactly as spelled in data/projects.ts. */
    name: string;
    /** Projects that would remain if this facet were part of the selection. */
    count: number;
    selected: boolean;
    /** Href toggling this facet on/off while preserving the rest. */
    href: string;
}

const lower = (value: string) => value.toLowerCase();

const includesTech = (list: string[], tech: string) =>
    list.some((entry) => lower(entry) === lower(tech));

/* -------------------------------------------------------------------------
 * Parsing
 * ---------------------------------------------------------------------- */

/**
 * Every technology used by at least one project, most-used first and
 * alphabetical within a tie, so the chip row has a stable, meaningful order.
 * Comparison is case-insensitive; the first spelling encountered wins as the
 * canonical label.
 */
export function collectTechnologies(projects: Project[]): string[] {
    const tally = new Map<string, { name: string; count: number }>();

    for (const project of projects) {
        for (const tech of project.technologies) {
            const entry = tally.get(lower(tech));

            if (entry) {
                entry.count += 1;
            } else {
                tally.set(lower(tech), { name: tech, count: 1 });
            }
        }
    }

    return [...tally.values()]
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .map((entry) => entry.name);
}

/**
 * Normalises the raw `?tech=` value into a de-duplicated selection.
 *
 * Values are matched case-insensitively against the known facets and rewritten
 * to their canonical spelling, so `?tech=next.js` and `?tech=Next.js` are the
 * same filter. Unrecognised values are kept rather than dropped: a stale or
 * hand-edited URL should resolve to the "no matches" state, not silently to the
 * unfiltered list.
 */
export function parseTechFilter(raw: string | string[] | undefined, known: string[]): string[] {
    if (raw === undefined) {
        return [];
    }

    const canonical = new Map(known.map((tech) => [lower(tech), tech]));
    const seen = new Set<string>();
    const selected: string[] = [];

    for (const value of Array.isArray(raw) ? raw : [raw]) {
        const trimmed = value.trim();

        if (!trimmed || seen.has(lower(trimmed))) {
            continue;
        }

        seen.add(lower(trimmed));
        selected.push(canonical.get(lower(trimmed)) ?? trimmed);
    }

    return selected;
}

/**
 * Normalises `?q=`. A repeated param takes its first value — the form only ever
 * emits one, so a second is a hand-edited URL rather than an intention.
 * Whitespace is collapsed so `"  next   js "` and `"next js"` are one query and
 * one cache entry.
 *
 * Capped at 100 characters: nothing in the catalogue is longer, and an
 * unbounded value would be echoed back into the page's copy and its <title>.
 */
export function parseQuery(raw: string | string[] | undefined): string {
    const value = Array.isArray(raw) ? raw[0] : raw;

    return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
}

/** Normalises `?sort=`. Anything unrecognised falls back to the default. */
export function parseSort(raw: string | string[] | undefined): ProjectSort {
    const value = Array.isArray(raw) ? raw[0] : raw;

    return SORT_OPTIONS.some((option) => option.value === value)
        ? (value as ProjectSort)
        : DEFAULT_SORT;
}

/** Reads the whole view state out of one `searchParams` object. */
export function parseProjectsQuery(params: SearchParams, known: string[]): ProjectsQuery {
    return {
        tech: parseTechFilter(params[TECH_PARAM], known),
        q: parseQuery(params[QUERY_PARAM]),
        sort: parseSort(params[SORT_PARAM]),
    };
}

/* -------------------------------------------------------------------------
 * Narrowing
 * ---------------------------------------------------------------------- */

/** Narrowing semantics: a project must use *every* selected technology. */
export function filterProjectsByTech(projects: Project[], selected: string[]): Project[] {
    if (selected.length === 0) {
        return projects;
    }

    return projects.filter((project) =>
        selected.every((tech) => includesTech(project.technologies, tech)),
    );
}

/**
 * Whether `project` satisfies the free-text query.
 *
 * Every whitespace-separated term must appear somewhere in the title,
 * description or technology list — AND, not OR, so typing more words narrows
 * the result set, which is what a search box is expected to do. Matching is
 * case-insensitive substring, not word-boundary, so "type" finds "TypeScript".
 * An empty query matches everything.
 */
export function matchesQuery(project: Project, query: string): boolean {
    const terms = query.toLowerCase().split(" ").filter(Boolean);

    if (terms.length === 0) {
        return true;
    }

    const haystack = [project.title, project.description, ...project.technologies]
        .join(" ")
        .toLowerCase();

    return terms.every((term) => haystack.includes(term));
}

export function searchProjects(projects: Project[], query: string): Project[] {
    if (!query) {
        return projects;
    }

    return projects.filter((project) => matchesQuery(project, query));
}

/* -------------------------------------------------------------------------
 * Sorting
 * ---------------------------------------------------------------------- */

/**
 * Descending comparator that keeps missing values last regardless of
 * direction. `lastUpdated` and `stars` are GitHub-derived and absent for any
 * project with no matched repo (types/project.ts); treating `undefined` as 0 or
 * as -Infinity would be a silent lie about a project that simply has no data,
 * so they sink to the bottom of both orders instead of pretending to be the
 * oldest or the least starred.
 */
function undefinedLast<T>(
    a: T | undefined,
    b: T | undefined,
    compare: (a: T, b: T) => number,
): number {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;

    return compare(a, b);
}

/**
 * Applies a sort order. `curated` is the identity — the list arrives from
 * `getProjects()` already ordered by `Project.order`, and that hand-picked
 * sequence is the whole point of the default.
 *
 * Ties fall back to the curated position, so the order is total: two projects
 * with the same star count never swap places between renders.
 */
export function sortProjects(projects: Project[], sort: ProjectSort): Project[] {
    if (sort === DEFAULT_SORT) {
        return projects;
    }

    const curatedIndex = new Map(projects.map((project, index) => [project.slug, index]));
    const tiebreak = (a: Project, b: Project) =>
        (curatedIndex.get(a.slug) ?? 0) - (curatedIndex.get(b.slug) ?? 0);

    return [...projects].sort((a, b) => {
        const primary =
            sort === "stars"
                ? undefinedLast(a.stars, b.stars, (x, y) => y - x)
                : undefinedLast(
                      a.lastUpdated,
                      b.lastUpdated,
                      (x, y) => new Date(y).getTime() - new Date(x).getTime(),
                  );

        return primary || tiebreak(a, b);
    });
}

/** Filter, search and sort in one pass, in the order the UI implies. */
export function resolveProjects(projects: Project[], query: ProjectsQuery): Project[] {
    return sortProjects(
        searchProjects(filterProjectsByTech(projects, query.tech), query.q),
        query.sort,
    );
}

/* -------------------------------------------------------------------------
 * Hrefs
 * ---------------------------------------------------------------------- */

/**
 * The one place a /projects URL is built.
 *
 * Default values are omitted, so the unfiltered catalogue is exactly
 * `/projects` rather than `/projects?sort=curated` — one address for one result
 * set. The tech selection is sorted before serialising for the same reason: a
 * given combination has one URL regardless of the order the chips were clicked,
 * rather than a permutation of near-duplicates for crawlers to sift.
 *
 * Parameter order is fixed (q, sort, tech) so two callers building the same
 * state produce byte-identical strings.
 */
export function buildProjectsHref(query: Partial<ProjectsQuery> = {}): string {
    const params = new URLSearchParams();

    if (query.q) {
        params.set(QUERY_PARAM, query.q);
    }

    if (query.sort && query.sort !== DEFAULT_SORT) {
        params.set(SORT_PARAM, query.sort);
    }

    for (const tech of [...(query.tech ?? [])].sort((a, b) => a.localeCompare(b))) {
        params.append(TECH_PARAM, tech);
    }

    const search = params.toString();

    return search ? `${PROJECTS_PATH}?${search}` : PROJECTS_PATH;
}

/**
 * Href that adds `tech` to the selection, or removes it when already selected.
 * Omit `tech` for the "clear the technology filter" link. Search and sort ride
 * along untouched.
 */
export function buildTechHref(query: ProjectsQuery, tech?: string): string {
    const nextSelection =
        tech === undefined
            ? []
            : includesTech(query.tech, tech)
              ? query.tech.filter((entry) => lower(entry) !== lower(tech))
              : [...query.tech, tech];

    return buildProjectsHref({ ...query, tech: nextSelection });
}

/** Href selecting a sort order, preserving the filter and the search. */
export function buildSortHref(query: ProjectsQuery, sort: ProjectSort): string {
    return buildProjectsHref({ ...query, sort });
}

/**
 * The full chip row. Facets are derived from the whole project list narrowed by
 * the *search* but not by the tech selection, so chips never disappear
 * mid-selection — a chip that would yield nothing reports `count: 0` and is
 * rendered inert by the UI instead.
 */
export function buildTechFacets(projects: Project[], query: ProjectsQuery): TechFacet[] {
    const searched = searchProjects(projects, query.q);

    return collectTechnologies(projects).map((name) => {
        const selected = includesTech(query.tech, name);

        return {
            name,
            count: filterProjectsByTech(
                searched,
                selected ? query.tech : [...query.tech, name],
            ).length,
            selected,
            href: buildTechHref(query, name),
        };
    });
}
