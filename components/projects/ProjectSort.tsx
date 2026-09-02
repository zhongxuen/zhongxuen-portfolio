import Link from "next/link";
import { SORT_OPTIONS, buildSortHref, type ProjectsQuery } from "@/lib/projectFilters";
import { cn } from "@/lib/utils";

export interface ProjectSortProps {
    query: ProjectsQuery;
}

/*
 * Same construction as the technology chips: every option is an address, so the
 * control needs no client JavaScript and every ordering is bookmarkable.
 * `border-line-ui` rather than `border-line` because this is a control, not
 * chrome — see the contrast note at the top of app/globals.css.
 */
const optionBase =
    "bp-focus inline-flex items-center rounded-xs border px-3 py-1 font-mono text-xs leading-5 transition-[background-color,border-color,color] duration-fast ease-bp";

const optionIdle =
    "border-line-ui/60 bg-surface-alt text-ink-muted hover:border-accent hover:text-accent";

const optionSelected = "border-accent/45 bg-accent/8 text-accent";

/** Sort order for the catalogue (docs/uiux.md §4.5). */
export function ProjectSort({ query }: ProjectSortProps) {
    return (
        <nav aria-label="Sort projects" className="flex flex-col gap-3">
            <p className="bp-meta text-ink-muted">Sort</p>

            <ul className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => {
                    const selected = option.value === query.sort;

                    return (
                        <li key={option.value}>
                            <Link
                                href={buildSortHref(query, option.value)}
                                aria-current={selected ? "true" : undefined}
                                aria-label={`Sort by ${option.description}`}
                                className={cn(optionBase, selected ? optionSelected : optionIdle)}
                            >
                                {option.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
