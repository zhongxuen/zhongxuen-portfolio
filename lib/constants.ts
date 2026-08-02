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
};

export const SITE_NAME = "Goh Zhong Xuen Portfolio";

export const SITE_DESCRIPTION =
    "Software Engineering student at Asia Pacific University building full-stack applications, UI/UX solutions, and modern web technologies.";

/** SEO title for the homepage `<title>` tag — distinct from SITE_NAME, front-loads role/keywords for SERP CTR. Keep under ~60 chars. */
export const HOME_TITLE =
    "Goh Zhong Xuen — Software Engineer | Full-Stack Portfolio";

/**
 * Meta description for the homepage only. Deliberately different from
 * SITE_DESCRIPTION (used verbatim as the hero paragraph) to avoid a
 * duplicate-content smell between the SERP snippet and on-page copy.
 */
export const HOME_META_DESCRIPTION =
    "Full-stack projects in Next.js, Java, and Python — role-based systems, real-time apps, and detailed case studies with live demos. See the work →";

export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Manually-bumped last-modified date for site-level pages (home, /projects
 * index) used in app/sitemap.ts. Update this when the page content changes
 * meaningfully — do not replace with `new Date()`, which regenerates a
 * fresh "modified today" timestamp on every build and misleads crawlers.
 */
export const SITE_LAST_MODIFIED = "2026-08-02";