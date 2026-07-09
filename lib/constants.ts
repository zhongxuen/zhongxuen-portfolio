/**
 * Central site-wide constants derived from CV.md / project identity.
 *
 * Single source of truth for author info, site metadata defaults,
 * and values referenced across lib/metadata.ts, layout.tsx, and
 * components (Footer, Hero, structured data, etc.).
 *
 * Do not duplicate these values in components — import from here.
 */

export const SITE_NAME = "Goh Zhong Xuen | Portfolio";

export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://your-domain.dev";

export const SITE_DESCRIPTION =
    "Portfolio of Goh Zhong Xuen, a Software Engineering diploma student specializing in full-stack development, UI/UX design, and software systems.";

export const AUTHOR = {
    name: "Goh Zhong Xuen",
    role: "Software Engineering Student",
    email: "gohzx2006@gmail.com",
    phone: "+6010-7722127",
    location: "Selangor, Malaysia",
    githubUsername: "zhongxuen",
} as const;

export const DEFAULT_OG_IMAGE = "/og/default.png";

export const TWITTER_HANDLE: string | undefined = undefined;

export const KEYWORDS = [
    "Goh Zhong Xuen",
    "Software Engineer",
    "Full Stack Developer",
    "Portfolio",
    "Next.js",
    "TypeScript",
    "React",
    "Software Engineering Intern",
] as const;