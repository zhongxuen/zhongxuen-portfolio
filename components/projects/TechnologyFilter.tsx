import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTechHref, type ProjectsQuery, type TechFacet } from "@/lib/projectFilters";

export interface TechnologyFilterProps {
    /** Facets for every technology in the catalogue, built by buildTechFacets. */
    facets: TechFacet[];
    /** Total number of projects, shown against the "All" chip. */
    totalCount: number;
    /**
     * The rest of the view state. The "All" chip clears only the technology
     * selection — an active search or sort survives it, which is the whole
     * reason this takes the query rather than linking at a bare /projects.
     */
    query: ProjectsQuery;
}

/*
 * Chips are links, not buttons: each one is an address, so middle-click,
 * bookmarking and the back button all work without a line of client JS. This
 * component stays a Server Component for the same reason.
 */
const chipBase =
    "bp-focus inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 font-mono text-xs leading-5 transition-[background-color,border-color,color] duration-fast ease-bp";

const chipIdle = "border-line bg-surface-alt text-ink-muted hover:border-accent hover:text-accent";

const chipSelected = "border-accent/45 bg-accent/8 text-accent";

/** A facet that cannot narrow the current selection any further. */
const chipInert = "cursor-not-allowed border-line/60 bg-surface-alt/40 text-ink-faint";

/**
 * Technology facets for /projects (docs/improvements.md, Wave 3 Lane E).
 *
 * Selecting more than one technology narrows rather than widens — a project
 * must use all of them — so a chip that would empty the grid is rendered inert
 * with its zero count visible, instead of being hidden or offered as a dead
 * link.
 */
export function TechnologyFilter({ facets, totalCount, query }: TechnologyFilterProps) {
    const hasSelection = facets.some((facet) => facet.selected);

    return (
        <nav aria-label="Filter projects by technology" className="flex flex-col gap-3">
            <p className="bp-meta text-ink-muted">Filter by technology</p>

            <ul className="flex flex-wrap gap-2">
                <li>
                    <Link
                        href={buildTechHref(query)}
                        aria-current={hasSelection ? undefined : "true"}
                        aria-label={`All projects, ${totalCount} total`}
                        className={cn(chipBase, hasSelection ? chipIdle : chipSelected)}
                    >
                        All
                        <span className={hasSelection ? "text-ink-muted" : "text-accent/70"}>
                            {totalCount}
                        </span>
                    </Link>
                </li>

                {facets.map((facet) => {
                    const label = `${facet.name}, ${facet.count} ${facet.count === 1 ? "project" : "projects"}`;

                    if (facet.count === 0 && !facet.selected) {
                        return (
                            <li key={facet.name}>
                                <span
                                    aria-disabled="true"
                                    aria-label={`${label} with the current filters`}
                                    className={cn(chipBase, chipInert)}
                                >
                                    {facet.name}
                                    <span>{facet.count}</span>
                                </span>
                            </li>
                        );
                    }

                    return (
                        <li key={facet.name}>
                            <Link
                                href={facet.href}
                                aria-current={facet.selected ? "true" : undefined}
                                aria-label={
                                    facet.selected ? `Remove filter ${label}` : `Filter by ${label}`
                                }
                                className={cn(chipBase, facet.selected ? chipSelected : chipIdle)}
                            >
                                {facet.name}
                                {facet.selected ? (
                                    <X size={12} aria-hidden="true" />
                                ) : (
                                    <span className="text-ink-muted">{facet.count}</span>
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
