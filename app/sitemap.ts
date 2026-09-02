import type { MetadataRoute } from "next";
import { SITE_URL, SITE_LAST_MODIFIED } from "@/lib/constants";
import { getProjects } from "@/services/projectService";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // getProjects() is the same source /projects/[slug] prerenders from, so
    // the sitemap can never list a slug the build didn't generate.
    const sitemapProjects = await getProjects();

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
        ...sitemapProjects.map((project) => ({
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
