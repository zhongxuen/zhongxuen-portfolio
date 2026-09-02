import type { Metadata } from "next";
import { AUTHOR, SITE_NAME, SITE_DESCRIPTION, SITE_URL, HOME_TITLE } from "./constants";

/**
 * The handful of terms that identify the site itself and so belong on every
 * route. Everything topical — a stack, a project's technologies — is passed
 * per page via `keywords`, because one shared list repeated on every URL
 * tells a crawler nothing about what distinguishes those URLs.
 */
const IDENTITY_KEYWORDS = [AUTHOR.name, "Software Engineer", "Portfolio", "Malaysia"];

interface MetadataOptions {
    title?: string;
    description?: string;
    path?: string;
    isHome?: boolean;
    /** Page-specific terms, merged after IDENTITY_KEYWORDS and deduplicated. */
    keywords?: string[];
    /** `article` marks a page as a dated piece of content (project case studies). */
    type?: "website" | "article";
    /** ISO date, `article` only. */
    publishedTime?: string;
    /** ISO date, `article` only. */
    modifiedTime?: string;
    /**
     * Whether crawlers may index this URL. Default true. Set false for views
     * that are a user's query rather than content — /projects?q=… is generated
     * on demand, has no standing value, and would compete with the canonical
     * catalogue if indexed. `follow` stays on either way, so the links out of a
     * noindexed page still pass through.
     */
    index?: boolean;
}

export function buildMetadata({
    title,
    description = SITE_DESCRIPTION,
    path = "",
    isHome = false,
    keywords = [],
    type = "website",
    publishedTime,
    modifiedTime,
    index = true,
}: MetadataOptions = {}): Metadata {
    const pageTitle = isHome
        ? (title ?? HOME_TITLE)
        : title
          ? `${title} | ${SITE_NAME}`
          : SITE_NAME;

    const url = `${SITE_URL}${path}`;
    const pageKeywords = Array.from(new Set([...IDENTITY_KEYWORDS, ...keywords]));

    const openGraphBase = {
        title: pageTitle,
        description,
        url,
        siteName: SITE_NAME,
        locale: "en_MY",
        // No `images` here — each route provides its own
        // opengraph-image.tsx (app/, app/projects/, app/projects/[slug]/),
        // which Next.js picks up automatically. Twitter falls back to
        // og:image when twitter:image is absent.
    };

    return {
        metadataBase: new URL(SITE_URL),
        title: pageTitle,
        description,
        keywords: pageKeywords,
        alternates: {
            canonical: url,
        },
        openGraph:
            type === "article"
                ? {
                      ...openGraphBase,
                      type: "article",
                      publishedTime,
                      modifiedTime,
                      authors: [AUTHOR.name],
                      tags: keywords,
                  }
                : { ...openGraphBase, type: "website" },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description,
        },
        robots: {
            index,
            follow: true,
        },
        icons: {
            icon: "/favicon.ico",
        },
        verification: {
            google: "ctNrKI8WR17yMoxUeQZ6GioTTjknW5Y6vf8xjcOv7Og",
        },
    };
}
