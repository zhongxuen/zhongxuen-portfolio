import { printModule, type FieldSpec } from "@/lib/admin/printer";
import type { Certification } from "@/types/certification";
import type { Education } from "@/types/education";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";

/**
 * Emitters for the four career files the console edits: `data/experience.ts`,
 * `data/education.ts`, `data/skills.ts` and `data/certifications.ts`.
 *
 * **Why these four, and why now.** The console could regenerate the résumé PDF
 * from the moment it shipped, and could not edit one word that goes into it —
 * `lib/resume/model.ts` reads all four of these files. Five of the nine
 * `data/*.ts` modules were unreachable from a browser, which made "edit the
 * portfolio without opening an editor" true for projects and false for the CV.
 *
 * Each is a field order plus a header. Everything about layout — quoting,
 * wrapping, the short-key rule, omission of empty optionals — lives in
 * `lib/admin/printer.ts` and is shared with `serializeProjects`, so these four
 * cannot drift from it.
 *
 * **Comments inside these arrays did not survive this change, and that is the
 * cost being paid.** `data/experience.ts` carried a block comment explaining why
 * one `endDate` is `"Present"` rather than a known future date, `data/education.ts`
 * carried one explaining why a completed diploma is still `"Present"`, and
 * `data/skills.ts` grouped its entries with `// Category` lines. The first two
 * are real reasoning and moved into the headers below, where a re-emit keeps
 * them; the third was restating the `category` field on the next line and was
 * dropped. `lib/admin/parseModule.ts` still *reads* comments, so a hand-edit
 * that adds one is not a parse failure — it is a deletion by the next save, and
 * every header says so.
 */

const EXPERIENCE_FIELDS: readonly FieldSpec<Experience>[] = [
    { key: "id" },
    { key: "role" },
    { key: "company" },
    { key: "companyUrl" },
    { key: "logo" },
    { key: "location" },
    { key: "employmentType" },
    { key: "startDate" },
    { key: "endDate" },
    { key: "description" },
    { key: "responsibilities" },
    { key: "technologies" },
    { key: "featured" },
];

const EXPERIENCE_HEADER = `import { Experience } from "@/types/experience";

/**
 * Work history — the source for components/sections/ExperienceSection.tsx and,
 * through lib/resume/model.ts, for the generated résumé PDF.
 *
 * **"Present" is a value, not a placeholder.** ExperienceSection derives
 * \`current\` from \`endDate\` alone, so a fixed end date — even one in the future —
 * is read as an ended role. That is what once made the site show a running
 * internship as finished history. A role that is still running carries
 * "Present"; its real end date belongs in \`description\`, where it reads as
 * information rather than as a status.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one. Put notes in this header instead.
 */
export const experience: Experience[] = [
`;

export function serializeExperience(entries: Experience[]): string {
    return printModule({ header: EXPERIENCE_HEADER, entries, fields: EXPERIENCE_FIELDS });
}

const EDUCATION_FIELDS: readonly FieldSpec<Education>[] = [
    { key: "id" },
    { key: "degree" },
    { key: "institution" },
    { key: "institutionUrl" },
    { key: "location" },
    { key: "startDate" },
    { key: "endDate" },
    { key: "gpa" },
    { key: "relevantCourses" },
    { key: "honors" },
    { key: "description" },
    { key: "featured" },
];

const EDUCATION_HEADER = `import { Education } from "@/types/education";

/**
 * Education history — components/sections/EducationSection.tsx and the résumé.
 *
 * **On the diploma's "Present".** Coursework and examinations are complete; the
 * industrial placement recorded in data/experience.ts is the last outstanding
 * component, and the award is not conferred until its results are in. Recording
 * a graduation date before then would be a credential claim ahead of the
 * credential, so the entry stays open and its \`description\` says exactly where
 * it stands. Close it when the award is actually issued, not when the work ends.
 *
 * **Non-Latin characters.** \`institution\` may hold them — the Kuen Cheng entry
 * carries the school's name in Chinese — but the résumé's embedded fonts cannot
 * draw them, so lib/resume/model.ts strips anything outside Latin and general
 * punctuation before rendering. The site shows the full name; the PDF does not.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one. Put notes in this header instead.
 */
export const education: Education[] = [
`;

export function serializeEducation(entries: Education[]): string {
    return printModule({ header: EDUCATION_HEADER, entries, fields: EDUCATION_FIELDS });
}

const SKILL_FIELDS: readonly FieldSpec<Skill>[] = [
    { key: "id" },
    { key: "name" },
    { key: "category" },
    { key: "icon" },
    { key: "featured" },
];

const SKILLS_HEADER = `import { Skill } from "@/types/skill";

/**
 * Skills, grouped by category rather than by claimed proficiency.
 *
 * \`category\` is a union in types/skill.ts, not a free string, so the sections in
 * components/sections/SkillsSection.tsx can group without a fallback bucket. A
 * value outside that union is a type error at build time and is rejected by the
 * console's own form before it can be saved.
 *
 * \`icon\` must resolve in \`skillIconMap\` (components/cards/SkillCard.tsx).
 * An unmapped icon is not an error — the card falls back to a generic glyph —
 * which is exactly why tests/data/integrity.test.ts asserts the map covers every
 * entry, and why /admin/career warns about one rather than blocking the save.
 *
 * \`name\` doubles as the link into the /projects technology filter: a skill whose
 * name matches an entry in some project's \`technologies\` (case-insensitive) renders
 * as a link to /projects?tech=<name>. Spell a skill the way data/projects.ts does
 * — "Next.js", not "NextJS" — or it silently stops linking.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one — including the category headings this file
 * used to carry, which restated the \`category\` field on the following line. Put
 * notes in this header instead.
 */
export const skills: Skill[] = [
`;

export function serializeSkills(entries: Skill[]): string {
    return printModule({ header: SKILLS_HEADER, entries, fields: SKILL_FIELDS });
}

const CERTIFICATION_FIELDS: readonly FieldSpec<Certification>[] = [
    { key: "id" },
    { key: "name" },
    { key: "issuer" },
    { key: "date" },
    { key: "credentialUrl" },
];

const CERTIFICATIONS_HEADER = `import type { Certification } from "@/types/certification";

/**
 * Professional certifications (docs/uiux.md §4.7).
 *
 * Empty is a legitimate state and renders as nothing at all: the certifications
 * strip in components/sections/EducationSection.tsx is absent rather than
 * showing placeholder rows. Nothing currently in the CV or in data/education.ts
 * is a certification — the Cisco and forensics entries in data/skills.ts are
 * coursework tooling, not credentials.
 *
 * \`credentialUrl\` is optional because not every credential has an online
 * record; the strip renders an entry without one as plain text rather than as a
 * dead link.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one. Put notes in this header instead.
 */
export const certifications: Certification[] = [
`;

export function serializeCertifications(entries: Certification[]): string {
    return printModule({
        header: CERTIFICATIONS_HEADER,
        entries,
        fields: CERTIFICATION_FIELDS,
    });
}
