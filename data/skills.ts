import { Skill } from "@/types/skill";

/**
 * Skills, grouped by category rather than by claimed proficiency.
 *
 * `category` is a union in types/skill.ts, not a free string, so the sections in
 * components/sections/SkillsSection.tsx can group without a fallback bucket. A
 * value outside that union is a type error at build time and is rejected by the
 * console's own form before it can be saved.
 *
 * `icon` must resolve in `skillIconMap` (components/cards/SkillCard.tsx).
 * An unmapped icon is not an error — the card falls back to a generic glyph —
 * which is exactly why tests/data/integrity.test.ts asserts the map covers every
 * entry, and why /admin/career warns about one rather than blocking the save.
 *
 * `name` doubles as the link into the /projects technology filter: a skill whose
 * name matches an entry in some project's `technologies` (case-insensitive) renders
 * as a link to /projects?tech=<name>. Spell a skill the way data/projects.ts does
 * — "Next.js", not "NextJS" — or it silently stops linking.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one — including the category headings this file
 * used to carry, which restated the `category` field on the following line. Put
 * notes in this header instead.
 */
export const skills: Skill[] = [
    {
        id: "python",
        name: "Python",
        category: "Programming Languages",
        icon: "python",
        featured: true,
    },
    {
        id: "java",
        name: "Java",
        category: "Programming Languages",
        icon: "java",
        featured: true,
    },
    {
        id: "typescript",
        name: "TypeScript",
        category: "Programming Languages",
        icon: "typescript",
        featured: true,
    },
    {
        id: "javascript",
        name: "JavaScript",
        category: "Programming Languages",
        icon: "javascript",
        featured: true,
    },
    {
        id: "rust",
        name: "Rust",
        category: "Programming Languages",
        icon: "rust",
    },
    {
        id: "php",
        name: "PHP",
        category: "Programming Languages",
        icon: "php",
    },
    {
        id: "html",
        name: "HTML",
        category: "Programming Languages",
        icon: "html5",
    },
    {
        id: "css",
        name: "CSS",
        category: "Programming Languages",
        icon: "css3",
    },
    {
        id: "sql",
        name: "SQL",
        category: "Programming Languages",
        icon: "mysql",
    },
    {
        id: "nextjs",
        name: "Next.js",
        category: "Frameworks",
        icon: "nextdotjs",
        featured: true,
    },
    {
        id: "react",
        name: "React",
        category: "Frameworks",
        icon: "react",
        featured: true,
    },
    {
        id: "react-native",
        name: "React Native",
        category: "Frameworks",
        icon: "reactnative",
    },
    {
        id: "expo",
        name: "Expo",
        category: "Frameworks",
        icon: "expo",
    },
    {
        id: "tailwind-css",
        name: "Tailwind CSS",
        category: "Frameworks",
        icon: "tailwindcss",
        featured: true,
    },
    {
        id: "fastapi",
        name: "FastAPI",
        category: "Frameworks",
        icon: "fastapi",
    },
    {
        id: "tauri",
        name: "Tauri",
        category: "Frameworks",
        icon: "tauri",
    },
    {
        id: "zustand",
        name: "Zustand",
        category: "Frameworks",
        icon: "zustand",
    },
    {
        id: "zod",
        name: "Zod",
        category: "Frameworks",
        icon: "zod",
    },
    {
        id: "react-flow",
        name: "React Flow",
        category: "Frameworks",
        icon: "xyflow",
    },
    {
        id: "botpress",
        name: "Botpress",
        category: "Frameworks",
        icon: "botpress",
    },
    {
        id: "joget",
        name: "Joget (Low-code)",
        category: "Frameworks",
        icon: "joget",
    },
    {
        id: "supabase",
        name: "Supabase",
        category: "Databases",
        icon: "supabase",
        featured: true,
    },
    {
        id: "postgresql",
        name: "PostgreSQL",
        category: "Databases",
        icon: "postgresql",
    },
    {
        id: "mysql",
        name: "MySQL",
        category: "Databases",
        icon: "mysql",
    },
    {
        id: "sqlite",
        name: "SQLite",
        category: "Databases",
        icon: "sqlite",
    },
    {
        id: "firebase",
        name: "Firebase",
        category: "Databases",
        icon: "firebase",
    },
    {
        id: "file-based-storage",
        name: "File-based Data Systems",
        category: "Databases",
        icon: "files",
    },
    {
        id: "claude-api",
        name: "Claude API",
        category: "AI & LLMs",
        icon: "claude",
    },
    {
        id: "gemini",
        name: "Gemini",
        category: "AI & LLMs",
        icon: "googlegemini",
    },
    {
        id: "ollama",
        name: "Ollama",
        category: "AI & LLMs",
        icon: "ollama",
    },
    {
        id: "git",
        name: "Git",
        category: "Developer Tools",
        icon: "git",
        featured: true,
    },
    {
        id: "github",
        name: "GitHub",
        category: "Developer Tools",
        icon: "github",
    },
    {
        id: "vitest",
        name: "Vitest",
        category: "Developer Tools",
        icon: "vitest",
    },
    {
        id: "playwright",
        name: "Playwright",
        category: "Developer Tools",
        icon: "playwright",
    },
    {
        id: "figma",
        name: "Figma",
        category: "Developer Tools",
        icon: "figma",
        featured: true,
    },
    {
        id: "canva",
        name: "Canva",
        category: "Developer Tools",
        icon: "canva",
    },
    {
        id: "ms-office",
        name: "Microsoft Office Suite",
        category: "Developer Tools",
        icon: "microsoftoffice",
    },
    {
        id: "ms-teams",
        name: "Microsoft Teams",
        category: "Developer Tools",
        icon: "microsoftteams",
    },
    {
        id: "cisco-packet-tracer",
        name: "Cisco Packet Tracer",
        category: "Networking & Cloud",
        icon: "cisco",
    },
    {
        id: "autopsy",
        name: "Autopsy",
        category: "Other Technologies",
        icon: "autopsy",
    },
    {
        id: "volatility-workbench",
        name: "Volatility Workbench",
        category: "Other Technologies",
        icon: "volatility",
    },
    {
        id: "ftk-imager",
        name: "FTK Imager",
        category: "Other Technologies",
        icon: "ftkimager",
    },
];
