import type { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL, HOME_TITLE } from "./constants";

interface MetadataOptions {
    title?: string;
    description?: string;
    path?: string;
    isHome?: boolean;
}

export function buildMetadata({
    title,
    description = SITE_DESCRIPTION,
    path = "",
    isHome = false,
}: MetadataOptions = {}): Metadata {
    const pageTitle = isHome
        ? (title ?? HOME_TITLE)
        : title
          ? `${title} | ${SITE_NAME}`
          : SITE_NAME;

    const url = `${SITE_URL}${path}`;

    return {
        metadataBase: new URL(SITE_URL),
        title: pageTitle,
        description,
        keywords: [
            "Software Engineer",
            "Portfolio",
            "Next.js",
            "React",
            "TypeScript",
            "Java",
            "Python",
            "PHP",
            "Supabase",
            "Malaysia",
            "APU",
        ],
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: pageTitle,
            description,
            url,
            siteName: SITE_NAME,
            locale: "en_MY",
            type: "website",
            // No `images` here — each route provides its own
            // opengraph-image.tsx (app/, app/projects/, app/projects/[slug]/),
            // which Next.js picks up automatically. Twitter falls back to
            // og:image when twitter:image is absent.
        },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description,
        },
        robots: {
            index: true,
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