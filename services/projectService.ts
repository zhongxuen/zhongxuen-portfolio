import { cache } from "react";
import { projects as localProjects } from "@/data/projects";
import { mergeProjectsWithRepos } from "@/adapters/githubProjectAdapter";
import { getPortfolioRepos } from "@/services/githubService";
import type { Project } from "@/types/project";

/**
 * Single entry point for project data.
 *
 * The homepage, /projects, /projects/[slug] (including generateStaticParams
 * and generateMetadata) and the sitemap all read from here, so they cannot
 * disagree about which projects exist or what order they appear in. GitHub is
 * a progressive enhancement: if the fetch fails, the local list is still
 * returned in full, just without live stats.
 *
 * Wrapped in React `cache()` so the fetch+merge runs once per render pass
 * rather than once per consumer. The 1h ISR window lives on the underlying
 * fetch in lib/github.ts.
 */
export const getProjects = cache(async (): Promise<Project[]> => {
    const repos = await getPortfolioRepos();

    return mergeProjectsWithRepos(localProjects, repos).sort(
        (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
    );
});

/**
 * Returns a single enriched project, or undefined when the slug has no local
 * entry. Routes decide how to handle the miss (notFound(), fallback metadata).
 */
export const getProjectBySlug = cache(async (slug: string): Promise<Project | undefined> => {
    const projects = await getProjects();

    return projects.find((project) => project.slug === slug);
});
