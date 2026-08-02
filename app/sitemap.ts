import type { MetadataRoute } from "next";
import { SITE_URL, SITE_LAST_MODIFIED } from "@/lib/constants";
import { projects } from "@/data/projects";
import { getPortfolioRepos } from "@/services/githubService";
import { mergeProjectsWithRepos } from "@/adapters/githubProjectAdapter";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const repos = await getPortfolioRepos();
    const enrichedProjects = mergeProjectsWithRepos(projects, repos);

    return [
        {
            url: SITE_URL,
            lastModified: SITE_LAST_MODIFIED,
            changeFrequency: "monthly",
            priority: 1,
        },
        {
            url: `${SITE_URL}/projects`,
            lastModified: SITE_LAST_MODIFIED,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        ...enrichedProjects.map((project) => ({
            url: `${SITE_URL}/projects/${project.slug}`,
            // Real GitHub `pushed_at` when available, falling back to the
            // manually-bumped site constant rather than `new Date()` (which
            // would falsely signal "modified today" on every build).
            lastModified: project.lastUpdated ?? SITE_LAST_MODIFIED,
            changeFrequency: "monthly" as const,
            priority: project.featured ? 0.7 : 0.5,
        })),
    ];
}
