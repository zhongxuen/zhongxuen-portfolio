import Form from "next/form";
import Link from "next/link";
import { Search, X } from "lucide-react";
import {
    PROJECTS_PATH,
    QUERY_PARAM,
    SORT_PARAM,
    TECH_PARAM,
    buildProjectsHref,
    DEFAULT_SORT,
    type ProjectsQuery,
} from "@/lib/projectFilters";

export interface ProjectSearchProps {
    query: ProjectsQuery;
}

/**
 * Free-text search over the catalogue (docs/uiux.md §4.5).
 *
 * A real GET form, not a controlled input: submitting navigates to
 * `/projects?q=…`, which means the result is a shareable address, the back
 * button undoes the search, and the whole thing works with JavaScript off.
 * `next/form` adds client-side navigation and prefetching on top of exactly
 * that native behaviour — see
 * node_modules/next/dist/docs/01-app/03-api-reference/02-components/form.md.
 *
 * The active technology and sort selections ride along as hidden inputs, so a
 * search performed inside a filtered view narrows it rather than resetting it.
 * They are rendered only when set, so a plain search from the unfiltered page
 * still lands on the canonical `/projects?q=…`.
 */
export function ProjectSearch({ query }: ProjectSearchProps) {
    return (
        <Form action={PROJECTS_PATH} className="flex flex-col gap-3">
            <label htmlFor="project-search" className="bp-meta text-ink-muted">
                Search
            </label>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 sm:max-w-sm">
                    <Search
                        size={15}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
                    />
                    <input
                        id="project-search"
                        type="search"
                        name={QUERY_PARAM}
                        defaultValue={query.q}
                        placeholder="Title, description, or stack"
                        autoComplete="off"
                        className="bp-focus h-10 w-full rounded-xs border border-line-ui bg-surface-alt pr-3 pl-9 font-mono text-sm text-ink placeholder:text-ink-muted"
                    />
                </div>

                {query.tech.map((tech) => (
                    <input key={tech} type="hidden" name={TECH_PARAM} value={tech} />
                ))}
                {query.sort !== DEFAULT_SORT && (
                    <input type="hidden" name={SORT_PARAM} value={query.sort} />
                )}

                <button
                    type="submit"
                    className="bp-focus h-10 shrink-0 rounded-sm border border-line-strong bg-surface-alt px-4 font-mono text-sm text-ink transition-[border-color,color] duration-fast ease-bp hover:border-accent hover:text-accent"
                >
                    Search
                </button>

                {query.q && (
                    <Link
                        href={buildProjectsHref({ ...query, q: "" })}
                        className="bp-focus inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm px-2 font-mono text-sm text-ink-muted transition-colors duration-fast ease-bp hover:text-accent"
                    >
                        <X size={14} aria-hidden="true" />
                        Clear search
                    </Link>
                )}
            </div>
        </Form>
    );
}
