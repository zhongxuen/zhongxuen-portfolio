import type { MetadataRoute } from "next";
import { SITE_NAME, HOME_TITLE } from "@/lib/constants";
import { THEME_COLORS } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE_NAME,
        short_name: HOME_TITLE.split(" — ")[0],
        description:
            "Portfolio of Goh Zhong Xuen — full-stack projects in Next.js, Java, and Python.",
        start_url: "/",
        display: "standalone",
        // An installed app has no theme toggle and no OS query to read, so it
        // gets the dark palette the site defaults to. #0F172A was left over
        // from the pre-Blueprint tokens and matched neither theme.
        background_color: THEME_COLORS.dark,
        theme_color: THEME_COLORS.dark,
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
