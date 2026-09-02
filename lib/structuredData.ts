import type { Project } from "@/types/project";
import { AUTHOR, AVATAR_PATH, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";
import { education } from "@/data/education";
import { skills } from "@/data/skills";

/**
 * Stable identifiers for the two entities that exist site-wide.
 *
 * Every other node references these by `@id` instead of re-declaring the
 * person or the site inline, so a crawler resolves one Person and one WebSite
 * linked from many pages rather than a fresh anonymous copy per page.
 */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** How other nodes point at the Person without duplicating its properties. */
const personReference = {
    "@type": "Person",
    "@id": PERSON_ID,
    name: AUTHOR.name,
} as const;

/**
 * Serializes JSON-LD for injection through `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` does not escape `<`, so any data string that ever contains
 * `</script>` — a project description, a lesson learned — would close the tag
 * early and let the remainder be parsed as HTML. Escaping `<`, `>` and `&` to
 * their `\u` form leaves the JSON semantically identical while making that
 * breakout impossible. Next's own JSON-LD guide recommends the same escape.
 */
export function serializeJsonLd(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
}

/**
 * Institutions from data/education.ts, deduplicated by name so a person who
 * lists several entries from one school is still an alumnus of it once.
 */
function buildAlumniOf() {
    const seen = new Set<string>();

    return education
        .filter((entry) => {
            if (seen.has(entry.institution)) {
                return false;
            }
            seen.add(entry.institution);
            return true;
        })
        .map((entry) => ({
            "@type": "EducationalOrganization",
            name: entry.institution,
            ...(entry.institutionUrl ? { url: entry.institutionUrl } : {}),
            ...(entry.location
                ? {
                      address: {
                          "@type": "PostalAddress",
                          addressLocality: entry.location,
                      },
                  }
                : {}),
        }));
}

/**
 * `knowsAbout` derived from data/skills.ts rather than hand-listed, so the
 * schema can't drift from the skills the page actually renders.
 */
function buildKnowsAbout(): string[] {
    return Array.from(new Set(skills.map((skill) => skill.name)));
}

export function buildProjectStructuredData(project: Project) {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        "@id": `${SITE_URL}/projects/${project.slug}#project`,
        name: project.title,
        description: project.description,
        codeRepository: project.githubUrl,
        programmingLanguage: project.technologies,
        author: personReference,
        isPartOf: { "@id": WEBSITE_ID },
        url: `${SITE_URL}/projects/${project.slug}`,
        ...(project.publishedAt ? { datePublished: project.publishedAt } : {}),
        ...(project.lastUpdated ? { dateModified: project.lastUpdated } : {}),
        image: project.screenshots?.[0]
            ? `${SITE_URL}${project.screenshots[0]}`
            : `${SITE_URL}/projects/${project.slug}/opengraph-image`,
        keywords: project.technologies.join(", "),
        about: SITE_DESCRIPTION,
    };
}

/**
 * ItemList for the /projects grid. Google reads a summary-page ItemList as
 * the ordered set of detail URLs behind the listing, which is exactly what
 * the grid is — so the order here must match the rendered order.
 */
export function buildProjectListStructuredData(projects: Project[]) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": `${SITE_URL}/projects#projects`,
        name: "Selected projects",
        description: "Software projects spanning full-stack apps, desktop systems, and CLI tools.",
        url: `${SITE_URL}/projects`,
        isPartOf: { "@id": WEBSITE_ID },
        numberOfItems: projects.length,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: projects.map((project, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: project.title,
            url: `${SITE_URL}/projects/${project.slug}`,
        })),
    };
}

export function buildWebsiteStructuredData() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        inLanguage: "en-MY",
        // Both point at the Person node rather than restating it, so the two
        // scripts in app/layout.tsx describe one entity between them.
        publisher: personReference,
        about: { "@id": PERSON_ID },
    };
}

export function buildPersonStructuredData() {
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": PERSON_ID,
        name: AUTHOR.name,
        givenName: AUTHOR.firstName,
        url: SITE_URL,
        jobTitle: AUTHOR.role,
        email: `mailto:${AUTHOR.email}`,
        image: `${SITE_URL}${AVATAR_PATH}`,
        address: {
            "@type": "PostalAddress",
            addressLocality: AUTHOR.location,
        },
        alumniOf: buildAlumniOf(),
        knowsAbout: buildKnowsAbout(),
        mainEntityOfPage: { "@id": WEBSITE_ID },
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
