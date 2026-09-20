import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * This site is fully statically generated, so a nonce-based CSP is not an
 * option: nonces are injected at request time and would force every route into
 * dynamic rendering (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * We therefore use the documented nonce-less variant, which requires
 * 'unsafe-inline' in script-src for:
 *   - the four inline `application/ld+json` blocks in app/layout.tsx and
 *     app/projects/[slug]/page.tsx (per-project JSON, so hashes are impractical)
 *   - Next.js' own inline bootstrap / RSC flight payload scripts
 *
 * @vercel/analytics is same-origin in production (it loads
 * /_vercel/insights/script.js and beacons /_vercel/insights/event), so 'self'
 * covers it there. Only the dev-mode debug script lives on an external host.
 */
const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
    // next/font and framer-motion both emit inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/**
 * The admin console's CSP.
 *
 * Identical to the public one except for `object-src`. The résumé page previews a
 * freshly rendered PDF before committing it, as a `data:` URL in an `<object>` —
 * and `object-src 'none'` blocks exactly that. The alternative was to make the
 * preview a download link, which would mean leaving the page to check a document
 * before replacing the live one; that is the check most likely to be skipped, so
 * the directive is relaxed instead, on the one route it affects, to the one
 * scheme it needs.
 */
const adminCsp = csp.replace("object-src 'none'", "object-src 'self' data:");

const securityHeaders = [
    {
        key: "Content-Security-Policy",
        value: csp,
    },
    {
        // 2 years, eligible for the HSTS preload list.
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        // Legacy companion to the frame-ancestors directive above.
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        key: "Permissions-Policy",
        value: [
            "accelerometer=()",
            "autoplay=()",
            "browsing-topics=()",
            "camera=()",
            "display-capture=()",
            "geolocation=()",
            "gyroscope=()",
            "magnetometer=()",
            "microphone=()",
            "payment=()",
            "usb=()",
        ].join(", "),
    },
];

const nextConfig: NextConfig = {
    // Don't advertise the framework version.
    poweredByHeader: false,

    experimental: {
        /*
         * Screenshots and PDFs arrive through Server Actions, whose request body
         * is capped at 1 MB by default. The résumé is a few hundred KB today; 6 MB
         * leaves room for one of those plus multipart overhead (the docs suggest
         * 10–20 KB for boundaries and part headers) without inviting large
         * uploads. The actions enforce their own tighter limits — 5 MB for a PDF,
         * 4 MB for an image — so this is the outer bound, not the policy.
         */
        serverActions: { bodySizeLimit: "6mb" },
    },

    /*
     * The résumé renderer reads TTFs off disk with node:fs, and nothing in the
     * source statically imports a font file — so Next's tracer has no reason to
     * believe public/fonts/ is needed and would leave it out of the function
     * bundle. Without this the generated PDF silently falls back to Helvetica,
     * which looks like nothing went wrong.
     *
     * The key is a route glob matched against the route path: /admin/resume is
     * where the regenerate action is invoked from. See
     * node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md.
     */
    outputFileTracingIncludes: {
        "/admin/resume": ["public/fonts/**/*"],
    },

    async headers() {
        /*
         * ORDER MATTERS, AND IT IS THE OPPOSITE OF WHAT IT LOOKS LIKE.
         *
         * Next applies every matching rule in turn, and for a header key set by
         * more than one rule the **last** one wins. The admin rule therefore comes
         * after the catch-all, not before it: with the intuitive ordering the
         * generic Content-Security-Policy silently overwrote the admin one, which
         * only showed up as `object-src 'none'` on a response that was supposed to
         * relax it. X-Robots-Tag and Cache-Control appeared correctly either way,
         * because nothing else sets them — which is exactly why the bug was easy
         * to miss.
         */
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
            {
                /*
                 * Nothing under /admin should be indexed or cached. The
                 * X-Robots-Tag is belt and braces with app/robots.ts and the
                 * layout's `robots: { index: false }` — they fail differently, and
                 * a header is the one a proxy can drop. `no-store` keeps a
                 * signed-in page out of any shared cache.
                 */
                source: "/admin/:path*",
                headers: [
                    { key: "Content-Security-Policy", value: adminCsp },
                    { key: "X-Robots-Tag", value: "noindex, nofollow" },
                    { key: "Cache-Control", value: "no-store, must-revalidate" },
                ],
            },
        ];
    },
};

export default nextConfig;
