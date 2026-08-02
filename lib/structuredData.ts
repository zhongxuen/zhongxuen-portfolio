import type { Project } from "@/types/project";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";

export function buildProjectStructuredData(project: Project) {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: project.title,
        description: project.description,
        codeRepository: project.githubUrl,
        programmingLanguage: project.technologies,
        author: {
            "@type": "Person",
            name: AUTHOR.name,
            url: SITE_URL,
            sameAs: [AUTHOR.github, AUTHOR.linkedin],
        },
        url: `${SITE_URL}/projects/${project.slug}`,
        image: `${SITE_URL}${project.screenshots?.[0] ?? "/og/default.png"}`,
        keywords: project.technologies.join(", "),
        about: SITE_DESCRIPTION,
    };
}

export function buildWebsiteStructuredData() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        publisher: {
            "@type": "Person",
            name: AUTHOR.name,
            url: SITE_URL,
        },
    };
}

export function buildPersonStructuredData() {
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        name: AUTHOR.name,
        url: SITE_URL,
        jobTitle: AUTHOR.role,
        address: {
            "@type": "PostalAddress",
            addressLocality: AUTHOR.location,
        },
        sameAs: [AUTHOR.github, AUTHOR.linkedin, AUTHOR.jobstreet],
    };
}

export interface BreadcrumbItem {
    name: string;
    url: string;
}

export function buildBreadcrumbStructuredData(items: BreadcrumbItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}
