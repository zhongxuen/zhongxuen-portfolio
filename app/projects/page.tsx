import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { revealDelay, stagger } from "@/lib/reveal";
import {
    CATALOGUE_CARD_SIZES,
    FEATURE_CARD_SIZES,
    ProjectCard,
} from "@/components/cards/ProjectCard";
import { TechnologyFilter } from "@/components/projects/TechnologyFilter";
import { ProjectSearch } from "@/components/projects/ProjectSearch";
import { ProjectSort } from "@/components/projects/ProjectSort";
import { Button } from "@/components/ui/Button";
import { buildMetadata } from "@/lib/metadata";
import { buildProjectListStructuredData, serializeJsonLd } from "@/lib/structuredData";
import { cn } from "@/lib/utils";
import {
    PROJECTS_PATH,
    buildTechFacets,
    collectTechnologies,
    filterProjectsByTech,
    parseProjectsQuery,
    resolveProjects,
    searchProjects,
    type SearchParams,
} from "@/lib/projectFilters";
import { getProjects } from "@/services/projectService";

const BASE_DESCRIPTION =
    "A curated selection of software projects spanning full-stack apps, desktop systems, and CLI tools.";

interface ProjectsPageProps {
    searchParams: Promise<SearchParams>;
}

/** Resolves the whole view for a request, canonicalised against the real facets. */
async function resolveView(searchParams: Promise<SearchParams>) {
    const [projects, params] = await Promise.all([getProjects(), searchParams]);
    const query = parseProjectsQuery(params, collectTechnologies(projects));

    return { projects, query, matches: resolveProjects(projects, query) };
}

/** Zero-padded mono figure for the `SHOWING 03 / 08` readout. */
const pad = (value: number) => String(value).padStart(2, "0");

/*
 * The canonical URL stays /projects for every combination (buildMetadata
 * derives it from `path`, not from the query string), so the facet permutations
 * are crawlable without competing with each other in the index. Only the title
 * and description reflect the selection — except for search, which is
 * noindexed outright: `?q=` is a user's question, not a page.
 */
export async function generateMetadata({ searchParams }: ProjectsPageProps): Promise<Metadata> {
    const { query, matches } = await resolveView(searchParams);
    const filterLabel = query.tech.join(" + ");

    const title = query.q
        ? `Projects matching “${query.q}”`
        : query.tech.length > 0
          ? `${filterLabel} Projects`
          : "Projects";

    return buildMetadata({
        title,
        description:
            query.tech.length > 0
                ? `Portfolio projects built with ${filterLabel}.`
                : BASE_DESCRIPTION,
        path: PROJECTS_PATH,
        index: !query.q,
        // Keywords come from the stacks actually on the page rather than a
        // hand-kept list, so they narrow with the facet selection and can
        // never drift from data/projects.ts.
        keywords: ["Software projects", "Case studies", ...collectTechnologies(matches)],
    });
}

/**
 * The complete project list, with URL-driven technology filtering, search and
 * sort (docs/uiux.md §4.5).
 *
 * Reading `searchParams` opts this route into request-time rendering, unlike
 * the rest of the site. The project data itself is still cached — getProjects()
 * sits on the 1h ISR fetch in lib/github.ts — so a request only re-runs the
 * filter, not the GitHub call.
 */
export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
    const { projects, query, matches } = await resolveView(searchParams);
    const facets = buildTechFacets(projects, query);

    const isNarrowed = query.tech.length > 0 || query.q.length > 0;

    /*
     * Which control emptied the grid. Each is measured on its own against the
     * full catalogue, so the copy can say "nothing matches that search" rather
     * than the useless "no results" when it is in fact the search, and the
     * combination case is distinguishable from either alone.
     */
    const searchMatches = searchProjects(projects, query.q);
    const techMatches = filterProjectsByTech(projects, query.tech);
    const emptyCause =
        matches.length > 0
            ? undefined
            : query.q && searchMatches.length === 0
              ? "search"
              : query.tech.length > 0 && techMatches.length === 0
                ? "tech"
                : isNarrowed
                  ? "combination"
                  : "catalogue";

    /*
     * Bento (§4.5): the first featured project in the result set takes a
     * 2 x 2 cell from xl up. It is NOT hoisted to the front — CSS grid
     * auto-placement flows the remaining cards around it wherever it lands, so
     * the visual order still matches the chosen sort. Below xl, and when
     * nothing in the result set is featured, this degrades to the plain grid
     * with no special case in the markup.
     */
    const featureSlug = matches.find((project) => project.featured)?.slug;

    return (
        <>
            {/*
             * ItemList only on the unfiltered view. Every permutation
             * canonicalises to /projects, so a filtered subset published under
             * the same @id would describe neither the canonical page nor,
             * after canonicalisation, the content Google indexes.
             */}
            {!isNarrowed && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: serializeJsonLd(buildProjectListStructuredData(matches)),
                    }}
                />
            )}

            <Container
                as="section"
                aria-labelledby="projects-heading"
                className="bp-section-y flex flex-col gap-10"
            >
                <SectionHeading
                    as="h1"
                    /* Page title — on screen at load, so it animates from
                       parse time rather than waiting on an observer. */
                    immediate
                    headingId="projects-heading"
                    eyebrow="Portfolio"
                    title="Selected projects"
                    description="A snapshot of the systems, interfaces, and workflows I have built across coursework, personal projects, and product-focused development work."
                />

                <div className="flex flex-col gap-6 border-t border-line pt-6">
                    <ProjectSearch query={query} />

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <TechnologyFilter
                            facets={facets}
                            totalCount={searchMatches.length}
                            query={query}
                        />
                        <ProjectSort query={query} />
                    </div>

                    {/*
                     * Live count. `aria-live="polite"` so a filter change is
                     * announced — with JS on this is a client-side navigation,
                     * which does not otherwise reannounce the page.
                     */}
                    <p aria-live="polite" className="bp-meta text-ink-muted">
                        Showing {pad(matches.length)}{" "}
                        <span aria-hidden="true" className="text-ink-faint">
                            /
                        </span>
                        <span className="sr-only">of</span> {pad(projects.length)}
                    </p>
                </div>

                {matches.length > 0 ? (
                    /*
                     * The cards are h3 (CardTitle), and the only heading above
                     * them here is the page h1 — an h1 → h3 skip. On the
                     * homepage the "Featured work" h2 sits between them; this
                     * page has no such visible heading to spare, so the results
                     * region carries an sr-only one. Screen-reader-only, not
                     * `aria-label` on the section: a labelled region alone does
                     * not repair the heading outline.
                     */
                    <section aria-labelledby="results-heading">
                        <h2 id="results-heading" className="sr-only">
                            Results
                        </h2>

                        {/*
                         * `immediate`, for two reasons. The grid is the first
                         * thing below the fold-line on this route, so its LCP
                         * candidate must not wait on hydration; and because
                         * app/projects/template.tsx remounts the subtree on
                         * every filter change, the cascade replays as the
                         * results change, which is exactly the feedback a
                         * filter should give.
                         *
                         * The stagger wrapper is also the grid item, so the
                         * feature card's span classes have to live on it — on
                         * the card itself they would apply to a box that is no
                         * longer a child of the grid.
                         */}
                        <Reveal immediate className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {matches.map((project, index) => (
                                <div
                                    key={project.slug}
                                    data-reveal="up"
                                    style={revealDelay(stagger(index))}
                                    className={cn(
                                        project.slug === featureSlug &&
                                            "xl:col-span-2 xl:row-span-2",
                                    )}
                                >
                                    <ProjectCard
                                        project={project}
                                        feature={project.slug === featureSlug}
                                        sizes={
                                            project.slug === featureSlug
                                                ? FEATURE_CARD_SIZES
                                                : CATALOGUE_CARD_SIZES
                                        }
                                    />
                                </div>
                            ))}
                        </Reveal>
                    </section>
                ) : (
                    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-line-strong bg-surface p-8">
                        <h2 className="font-display text-h3 font-medium text-ink">
                            {emptyCause === "catalogue"
                                ? "Nothing to show yet"
                                : "No projects match that"}
                        </h2>

                        <p className="max-w-prose text-body-lg text-pretty text-ink-muted">
                            {emptyCause === "search" && (
                                <>
                                    Nothing in the portfolio mentions{" "}
                                    <span className="font-mono text-ink">{query.q}</span>. Try a
                                    single word — the search looks at titles, descriptions and
                                    stacks.
                                </>
                            )}
                            {emptyCause === "tech" && (
                                <>
                                    Nothing in the portfolio uses{" "}
                                    <span className="font-mono text-ink">
                                        {query.tech.join(" + ")}
                                    </span>{" "}
                                    together. Drop a filter to widen the search.
                                </>
                            )}
                            {emptyCause === "combination" && (
                                <>
                                    <span className="font-mono text-ink">{query.q}</span> matches
                                    projects, and so does{" "}
                                    <span className="font-mono text-ink">
                                        {query.tech.join(" + ")}
                                    </span>{" "}
                                    — but no single project does both.
                                </>
                            )}
                            {emptyCause === "catalogue" &&
                                "The project list is empty right now. Check back shortly."}
                        </p>

                        {isNarrowed && (
                            <Button href={PROJECTS_PATH} variant="secondary">
                                Reset search, filters and sort
                            </Button>
                        )}
                    </div>
                )}
            </Container>
        </>
    );
}
