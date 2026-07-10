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
        image: `${SITE_URL}/og/default.png`,
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
