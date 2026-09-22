import type { ResumeConfig } from "@/types/resume";

/**
 * What goes on the résumé, and how much of it.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/resume). The object below is re-emitted in
 * full by lib/admin/serializeResumeConfig.ts on every save, so a comment placed
 * inside it will be deleted by the next one. Put notes in this header instead.
 *
 * Two-page budget (`maxPages`). The one-page layout this replaced cut every
 * project to one trimmed line and dropped coursework, honours, soft skills and
 * languages — a thinner document than the hand-made CV it was meant to replace.
 * If the preview reports more than two pages, the levers are `maxProjects`,
 * `maxFeaturesPerProject` and `featureMaxChars`, in that order.
 *
 * `highlights`, `softSkills`, `languages`, `interests` and `availability` are the
 * résumé-only facts: an employer expects them on a CV and the site has no other
 * home for them. Every highlight should be checkable against data/experience.ts,
 * data/education.ts or a project's key features.
 *
 * `maxRoles` is 3, so the 2022–2023 pharmacy assistant role is included: it is
 * real, dated work that shows customer-facing reliability, and the hand-made CV
 * carried it too. Drop to 2 for a strictly technical application.
 */
export const resumeConfig: ResumeConfig = {
    summary:
        "Software Engineering diploma student at Asia Pacific University (CGPA 3.72, Distinction), currently a Frontend Web Developer Intern at TED Optimus. I design, build and ship full-stack products end to end — web, mobile, desktop and AI — and care most about the parts usually skipped: enforced architecture, automated testing, tested accessibility and clear documentation.",
    highlights: [
        "Building production user-facing features and reusable component libraries as a Frontend Web Developer Intern at TED Optimus.",
        "Full-stack range: Next.js and React front ends; FastAPI, Supabase and PostgreSQL back ends; React Native mobile; Tauri and Rust desktop.",
        "Ships LLM features in real products — an AI mentor on the Claude API, and a Gemini-to-local-Ollama router with automatic failover.",
        "Quality by default: ESLint-enforced architecture boundaries, deterministic simulation tests, and Playwright + axe accessibility checks on every route.",
    ],
    maxPages: 2,
    maxProjects: 6,
    maxFeaturesPerProject: 2,
    featureMaxChars: 110,
    projectSummaryMaxChars: 260,
    listRemainingProjects: true,
    maxRoles: 3,
    maxBulletsPerRole: 4,
    skillCategories: [
        "Programming Languages",
        "Frameworks",
        "Databases",
        "AI & LLMs",
        "Developer Tools",
        "Networking & Cloud",
        "Other Technologies",
    ],
    skillCategoryLabels: {
        Frameworks: "Frameworks & Libraries",
        "Developer Tools": "Tools & Testing",
        "Networking & Cloud": "Networking",
        "Other Technologies": "Digital Forensics",
    },
    softSkills: [
        "Problem Solving & Analytical Thinking",
        "Teamwork & Cross-functional Collaboration",
        "Communication & Presentation",
        "Time Management & Self-directed Learning",
        "Attention to Detail",
        "Customer Service",
    ],
    languages: ["English (Fluent)", "Chinese (Native)", "Malay (Basic)"],
    interests: [
        "Software development",
        "UI/UX design",
        "Cybersecurity",
        "AI & emerging technologies",
    ],
    availability:
        "Open to full-time software engineering roles after the internship concludes on 23 October 2026.",
    includeCertifications: true,
    includeQrCode: true,
};
