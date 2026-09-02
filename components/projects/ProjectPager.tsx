import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Project } from "@/types/project";

export interface ProjectPagerProps {
    previous?: Project;
    next?: Project;
}

/**
 * Previous/next pager at the foot of a case study (docs/uiux.md §4.6).
 *
 * Ordered by the same curated sequence /projects defaults to, so "next" means
 * the card that sits after this one in the catalogue rather than some second
 * ordering the visitor has never seen. The ends do not wrap: at the first or
 * last project the corresponding cell is simply absent, which is the honest
 * signal that the list has an edge.
 */
export function ProjectPager({ previous, next }: ProjectPagerProps) {
    if (!previous && !next) {
        return null;
    }

    return (
        <nav
            aria-label="Project navigation"
            className="grid gap-4 border-y border-line py-6 sm:grid-cols-2"
        >
            {previous ? (
                <Link
                    href={`/projects/${previous.slug}`}
                    className="bp-focus group/pager flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-4 transition-[border-color] duration-fast ease-bp hover:border-line-strong"
                >
                    <span className="bp-meta flex items-center gap-2 text-ink-muted">
                        <ArrowLeft
                            size={13}
                            aria-hidden="true"
                            className="transition-transform duration-fast ease-bp group-hover/pager:-translate-x-1"
                        />
                        Previous
                    </span>
                    <span className="font-display font-medium text-balance text-ink transition-colors duration-fast ease-bp group-hover/pager:text-accent">
                        {previous.title}
                    </span>
                </Link>
            ) : (
                <span />
            )}

            {next && (
                <Link
                    href={`/projects/${next.slug}`}
                    className="bp-focus group/pager flex flex-col items-end gap-1.5 rounded-lg border border-line bg-surface p-4 text-right transition-[border-color] duration-fast ease-bp hover:border-line-strong"
                >
                    <span className="bp-meta flex items-center gap-2 text-ink-muted">
                        Next
                        <ArrowRight
                            size={13}
                            aria-hidden="true"
                            className="transition-transform duration-fast ease-bp group-hover/pager:translate-x-1"
                        />
                    </span>
                    <span className="font-display font-medium text-balance text-ink transition-colors duration-fast ease-bp group-hover/pager:text-accent">
                        {next.title}
                    </span>
                </Link>
            )}
        </nav>
    );
}
