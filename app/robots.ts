import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            /*
             * Advisory, and the weakest of the three mechanisms guarding the admin
             * console — the others being the X-Robots-Tag header in next.config.ts
             * and `robots: { index: false }` on the (admin) layout. Listed here
             * anyway because they fail differently: a header can be dropped by a
             * proxy, and this is the one a crawler reads before requesting
             * anything.
             */
            disallow: "/admin",
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
