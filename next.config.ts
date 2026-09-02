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
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
