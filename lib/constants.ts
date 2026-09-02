export const AUTHOR = {
    name: "Goh Zhong Xuen",
    firstName: "Zhong Xuen",
    role: "Software Engineering Student",
    location: "Selangor, Malaysia",
    email: "gohzx2006@gmail.com",
    phone: "+60 10-772 2127",
    github: "https://github.com/zhongxuen",
    githubUsername: "zhongxuen",
    linkedin: "https://www.linkedin.com/in/goh-zhong-xuen-14020a3b0/",
    jobstreet: "https://my.jobstreet.com/profiles/goh-zhong-xuen-GP4B6t54MG",

    /**
     * Availability signal rendered as the navbar pill and in the footer
     * (docs/uiux.md §4.1). Deliberately a one-line edit: set `open` to false
     * and every surface that reads it stops claiming availability.
     *
     * Off since September 2026 — the internship in data/experience.ts is
     * running, so a pill reading "available" would contradict the timeline two
     * screens below it. Flip `open` back to true when the placement ends and
     * set `label` to whatever is true then.
     */
    availability: {
        open: false,
        label: "Available for internship",
    },
};

/**
 * Public path to the resume PDF. The displayed file size is not stored here —
 * lib/resume.ts stats the real file at build time so the annotation can never
 * drift from the artifact.
 */
export const RESUME_PATH = "/resume/resume.pdf";

/**
 * Public path to the profile photo. Shared rather than local to
 * AboutSection because lib/structuredData.ts publishes the same file as the
 * Person `image`, and a knowledge-panel photo that 404s is worse than none.
 */
export const AVATAR_PATH = "/images/profile/avatar.jpg";

export const SITE_NAME = "Goh Zhong Xuen Portfolio";

export const SITE_DESCRIPTION =
    "Software Engineering student at Asia Pacific University building full-stack applications, UI/UX solutions, and modern web technologies.";

/** SEO title for the homepage `<title>` tag — distinct from SITE_NAME, front-loads role/keywords for SERP CTR. Keep under ~60 chars. */
export const HOME_TITLE = "Goh Zhong Xuen — Software Engineer | Full-Stack Portfolio";

/**
 * Meta description for the homepage only. Deliberately different from
 * SITE_DESCRIPTION (used verbatim as the hero paragraph) to avoid a
 * duplicate-content smell between the SERP snippet and on-page copy.
 */
export const HOME_META_DESCRIPTION =
    "Full-stack projects in Next.js, Java, and Python — role-based systems, real-time apps, and detailed case studies with live demos. See the work →";

const LOCAL_SITE_URL = "http://localhost:3001";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/**
 * Resolves the absolute origin every canonical URL, OG `url`, JSON-LD `@id`
 * and sitemap `<loc>` is built from:
 *
 *   1. NEXT_PUBLIC_SITE_URL          — the real domain, set explicitly.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's production hostname, injected
 *      at build time without a protocol, so a deploy that forgot step 1 still
 *      emits URLs that resolve.
 *   3. http://localhost:3001         — local development only.
 *
 * A production build that ends up on localhost is a hard error, not a
 * fallback: it ships `<loc>http://localhost:3001</loc>` in sitemap.xml and
 * points every canonical, OG url and JSON-LD @id at the developer's machine.
 * The check is on the *resolved* value rather than on which branch produced
 * it, because the common failure is not a missing variable — it is
 * `.env.local` pinning NEXT_PUBLIC_SITE_URL to localhost for dev and Next
 * loading that file during `next build` too.
 *
 * The throw is server-only on purpose. This module is also pulled into the
 * client bundle (Navbar, HeroSection, ContactSection read AUTHOR), and
 * VERCEL_PROJECT_PRODUCTION_URL is never inlined there — so an unguarded
 * throw would take the whole site down in the browser on exactly the deploys
 * this check is meant to protect.
 */
function resolveSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL;
    const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

    const resolved = explicit
        ? stripTrailingSlash(explicit)
        : vercelHost
          ? `https://${stripTrailingSlash(vercelHost)}`
          : LOCAL_SITE_URL;

    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(resolved);

    if (isLocal && process.env.NODE_ENV === "production" && typeof window === "undefined") {
        throw new Error(
            `Refusing to build: the site URL resolved to ${resolved}. ` +
                "Every canonical URL, OG url, JSON-LD @id and sitemap entry " +
                "would point at a local machine. Set NEXT_PUBLIC_SITE_URL to " +
                "the public origin (e.g. https://example.com) — note that a " +
                "localhost value in .env.local is picked up by `next build` " +
                "too, so override it for production builds.",
        );
    }

    return resolved;
}

/** Absolute site origin, never with a trailing slash — callers append paths. */
export const SITE_URL = resolveSiteUrl();

/**
 * Manually-bumped last-modified date for site-level pages (home, /projects
 * index) used in app/sitemap.ts. Update this when the page content changes
 * meaningfully — do not replace with `new Date()`, which regenerates a
 * fresh "modified today" timestamp on every build and misleads crawlers.
 */
export const SITE_LAST_MODIFIED = "2026-09-02";
