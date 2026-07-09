import type { Metadata } from "next";
import {
    SITE_NAME,
    SITE_URL,
    SITE_DESCRIPTION,
    AUTHOR,
    DEFAULT_OG_IMAGE,
    TWITTER_HANDLE,
    KEYWORDS,
} from "@/lib/constants";

/**
 * Options for generating page-level metadata.
 * Extend as new sections/pages need custom SEO fields.
 */
interface PageMetadataOptions {
    /** Page-specific title. Combined with SITE_NAME unless isHome is true. */
    title?: string;

    /** Page-specific description. Falls back to SITE_DESCRIPTION. */
    description?: string;

    /** Relative or absolute path to page (used for canonical + OG URL). */
    path?: string;

    /** Relative or absolute OG image path. Falls back to DEFAULT_OG_IMAGE. */
    ogImage?: string;

    /** Set true only for the root "/" page (uses bare SITE_NAME as title). */
    isHome?: boolean;
}

/**
 * Builds a Next.js Metadata object for a given page.
 * Use in each route's `generateMetadata` or static `metadata` export.
 *
 * Example:
 *   export const metadata = buildMetadata({
 *       title: "Projects",
 *       description: "Selected software projects by Goh Zhong Xuen.",
 *       path: "/projects",
 *   });
 */
export function buildMetadata(options: PageMetadataOptions = {}): Metadata {
    const {
        title,
        description = SITE_DESCRIPTION,
        path = "/",
        ogImage = DEFAULT_OG_IMAGE,
        isHome = false,
    } = options;

    const resolvedTitle = isHome
        ? SITE_NAME
        : title
        ? `${title} | ${SITE_NAME}`
        : SITE_NAME;

    const url = new URL(path, SITE_URL).toString();
    const imageUrl = new URL(ogImage, SITE_URL).toString();

    return {
        title: resolvedTitle,
        description,
        keywords: [...KEYWORDS],
        authors: [{ name: AUTHOR.name, url: `https://github.com/${AUTHOR.githubUsername}` }],
        creator: AUTHOR.name,
        metadataBase: new URL(SITE_URL),
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: resolvedTitle,
            description,
            url,
            siteName: SITE_NAME,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: resolvedTitle,
                },
            ],
            locale: "en_US",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: resolvedTitle,
            description,
            images: [imageUrl],
            ...(TWITTER_HANDLE ? { creator: TWITTER_HANDLE } : {}),
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
            },
        },
    };
}