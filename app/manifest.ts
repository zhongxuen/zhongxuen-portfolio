import type { MetadataRoute } from "next";
import { SITE_NAME, HOME_TITLE } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE_NAME,
        short_name: HOME_TITLE.split(" — ")[0],
        description:
            "Portfolio of Goh Zhong Xuen — full-stack projects in Next.js, Java, and Python.",
        start_url: "/",
        display: "standalone",
        background_color: "#0F172A",
        theme_color: "#0F172A",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
            {
                src: "/icon",
                sizes: "32x32",
                type: "image/png",
            },
        ],
    };
}
