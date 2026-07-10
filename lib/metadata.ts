import type { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "./constants";

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
        ? SITE_NAME
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
            images: [
                {
                    url: "/images/og-image.png",
                    width: 1200,
                    height: 630,
                    alt: SITE_NAME,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description,
            images: ["/images/og-image.png"],
        },
        robots: {
            index: true,
            follow: true,
        },
        icons: {
            icon: "/favicon.ico",
        },
    };
}