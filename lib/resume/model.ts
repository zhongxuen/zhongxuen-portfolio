import { AUTHOR, SITE_URL } from "@/lib/constants";
import { certifications } from "@/data/certifications";
import { education } from "@/data/education";
import { experience } from "@/data/experience";
import { resumeConfig } from "@/data/resume";
import { skills } from "@/data/skills";
import { formatDateRange, formatMonthYear, sortByStartDateDesc } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { ResumeConfig } from "@/types/resume";

/**
 * Builds the résumé's document model from the site's own data
 * (docs/admin-plan.md §8.1).
 *
 * Model first, renderer second. Everything about *what* appears and in *what
 * order* is decided here; `ResumeDocument.tsx` only lays out what it is given.
 * That split is what stops the PDF becoming a second, drifting copy of the
 * site's content — and it is what makes the selection rules testable without
 * rendering a PDF (tests/lib/resumeModel.test.ts).
 *
 * `projects` is a parameter rather than an import so the console can generate a
 * preview from the *repository's* current `data/projects.ts` — which may be a
 * commit ahead of this build — rather than from the array this build was
 * compiled with.
 */

export interface ResumeContact {
    label: string;
    /** What is printed. Always real text, never an icon. */
    value: string;
    /** Real PDF hyperlink target, when there is one. */
    href?: string;
}

export interface ResumeRole {
    role: string;
    company: string;
    location?: string;
    /** Pre-formatted, e.g. "Jul 2026 – Present". */
    dates: string;
    bullets: string[];
}

export interface ResumeProject {
    title: string;
    technologies: string[];
    summary: string;
    /** Printed without a scheme — "job-now-navy.vercel.app" — and linked. */
    url?: string;
    href?: string;
    featured: boolean;
}

export interface ResumeSkillGroup {
    category: string;
    items: string[];
}

export interface ResumeEducation {
    degree: string;
    institution: string;
    dates: string;
    detail?: string;
}

export interface ResumeCertification {
    name: string;
    issuer: string;
    year: string;
}

export interface ResumeModel {
    name: string;
    headline: string;
    contacts: ResumeContact[];
    summary: string;
    experience: ResumeRole[];
    projects: ResumeProject[];
    skills: ResumeSkillGroup[];
    education: ResumeEducation[];
    certifications: ResumeCertification[];
    /** Printed bottom-left and encoded in the QR code. */
    siteUrl: string;
    /** `CV · GZX · 2026-09`, the plate annotation in the top-right corner. */
    documentCode: string;
    includeQrCode: boolean;
}

export function buildResumeModel(
    projects: Project[],
    config: ResumeConfig = resumeConfig,
    now = new Date(),
): ResumeModel {
    /*
     * Sanitized once, here, on the way out. Doing it at the model boundary rather
     * than in each section component means a new section cannot forget — and it
     * keeps the renderer free of any knowledge about which glyphs the bundled
     * fonts happen to have.
     */
    return renderableModel({
        name: AUTHOR.name.toUpperCase(),
        headline: `${AUTHOR.role} · Full-Stack Developer`,
        contacts: buildContacts(),
        summary: config.summary,
        experience: buildExperience(config),
        projects: buildProjects(projects, config),
        skills: buildSkills(config),
        education: buildEducation(),
        certifications: config.includeCertifications ? buildCertifications() : [],
        siteUrl: stripScheme(SITE_URL),
        documentCode: `CV · GZX · ${now.toISOString().slice(0, 7)}`,
        includeQrCode: config.includeQrCode,
    });
}

/**
 * Walks the model and runs `toRenderable` over every string.
 *
 * A generic walk rather than thirty call sites: the model is plain data — strings,
 * numbers, booleans, arrays and objects — so one recursion covers every field
 * including ones added later. URLs in `href` are left alone: they are link targets
 * rather than drawn text, and stripping a character from one would break it.
 */
function renderableModel(model: ResumeModel): ResumeModel {
    const walk = (value: unknown, key?: string): unknown => {
        if (typeof value === "string") {
            return key === "href" ? value : toRenderable(value);
        }

        if (Array.isArray(value)) {
            return value.map((item) => walk(item));
        }

        if (value && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value).map(([childKey, childValue]) => [
                    childKey,
                    walk(childValue, childKey),
                ]),
            );
        }

        return value;
    };

    return walk(model) as ResumeModel;
}

/**
 * Contact details, in the body rather than a running header.
 *
 * Some ATS parsers discard a repeating page header entirely, which is a
 * spectacular way to submit a résumé with no email address on it. Two rows: the
 * reachable details, then the profiles.
 */
function buildContacts(): ResumeContact[] {
    return [
        { label: "Email", value: AUTHOR.email, href: `mailto:${AUTHOR.email}` },
        { label: "Phone", value: AUTHOR.phone, href: `tel:${AUTHOR.phone.replace(/[^\d+]/g, "")}` },
        { label: "Location", value: AUTHOR.location },
        {
            label: "GitHub",
            value: stripScheme(AUTHOR.github),
            href: AUTHOR.github,
        },
        {
            label: "LinkedIn",
            value: stripScheme(AUTHOR.linkedin),
            href: AUTHOR.linkedin,
        },
        { label: "Portfolio", value: stripScheme(SITE_URL), href: SITE_URL },
    ];
}

/**
 * Experience, newest first, bullets capped.
 *
 * `sortByStartDateDesc` is the site's own sort, reused so the PDF cannot present
 * the timeline in a different order from `ExperienceSection`. The `description`
 * is dropped: it exists on the site to introduce a card, and on a résumé it would
 * repeat the bullets in prose form.
 */
function buildExperience(config: ResumeConfig): ResumeRole[] {
    return sortByStartDateDesc(experience)
        .slice(0, config.maxRoles)
        .map((entry) => ({
            role: entry.role,
            company: entry.company,
            location: entry.location ? shortLocation(entry.location) : undefined,
            dates: formatDateRange(entry.startDate, entry.endDate),
            bullets: (entry.responsibilities ?? [entry.description]).slice(
                0,
                config.maxBulletsPerRole,
            ),
        }));
}

/**
 * Projects: featured first, then by `order`, capped at `maxProjects`.
 *
 * The one-line summary is the project's `description`, which is already written
 * to be read on a card — the `longDescription` is three paragraphs and belongs on
 * the case-study page. Technologies are capped at six per project because a chip
 * row that wraps to three lines stops being scannable and starts being a wall.
 */
function buildProjects(projects: Project[], config: ResumeConfig): ResumeProject[] {
    return [...projects]
        .sort((a, b) => {
            if (Boolean(a.featured) !== Boolean(b.featured)) {
                return a.featured ? -1 : 1;
            }

            return (a.order ?? Infinity) - (b.order ?? Infinity);
        })
        .slice(0, config.maxProjects)
        .map((project) => ({
            title: project.title,
            technologies: project.technologies.slice(0, 6),
            summary: trimSummary(project.description, config.projectSummaryMaxChars),
            url: project.liveUrl ? stripScheme(project.liveUrl) : undefined,
            href: project.liveUrl,
            featured: Boolean(project.featured),
        }));
}

/**
 * Skills grouped into the configured categories, in the configured order.
 *
 * A category with no skills is dropped rather than printed empty — a heading
 * with nothing under it reads as a rendering fault, and the rail's height is the
 * scarcest space on the page.
 */
function buildSkills(config: ResumeConfig): ResumeSkillGroup[] {
    return config.skillCategories
        .map((category) => ({
            category,
            items: skills.filter((skill) => skill.category === category).map((skill) => skill.name),
        }))
        .filter((group) => group.items.length > 0);
}

/**
 * Education, newest first.
 *
 * `gpa` and the first honour are folded into one detail line: on the site they
 * are separate rows with room to breathe, and in a 32%-wide rail they have to be
 * one sentence or nothing.
 */
function buildEducation(): ResumeEducation[] {
    return sortByStartDateDesc(education).map((entry) => ({
        degree: entry.degree,
        institution: entry.institution,
        dates: formatDateRange(entry.startDate, entry.endDate),
        detail: entry.gpa ? `CGPA ${entry.gpa}` : entry.honors?.[0],
    }));
}

function buildCertifications(): ResumeCertification[] {
    return certifications.map((entry) => ({
        name: entry.name,
        issuer: entry.issuer,
        year: formatMonthYear(entry.date).split(" ").pop() ?? entry.date.slice(0, 4),
    }));
}

/**
 * Removes characters the résumé's fonts cannot draw.
 *
 * The three faces in `public/fonts/` are Latin. `data/education.ts` records
 * "Kuen Cheng High School (坤成中学)" — the school's real name, correctly — and
 * `@react-pdf` renders those four characters as `.notdef` boxes, which extract as
 * literal garbage: the first render of this document printed
 * "Kuen Cheng High School ( d-f )". Bundling a CJK face to draw four glyphs would
 * add several megabytes to the function bundle; dropping them costs nothing a
 * reader of this document needs.
 *
 * Kept: Latin-1 and Latin Extended-A/B (é, š), general punctuation (— – … · ‘ “),
 * and currency symbols — every mark the site's own copy actually uses. An
 * emptied bracket pair is removed too, so a stripped name does not leave
 * "School ()" behind.
 */
function toRenderable(text: string): string {
    return text
        .replace(/[^ -ɏ -⁯₠-⃏]/g, "")
        .replace(/\(\s*\)|\[\s*\]|【\s*】/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

/**
 * Cuts a project description down to a printable line.
 *
 * `Project.description` is card copy — two or three sentences written for a 380px
 * card, 218–240 characters on the four entries that reach the résumé. Printed
 * whole, four of those fill half the main column and push the document onto a
 * second page, which is the one thing the layout is not allowed to do.
 *
 * Cut preference, best first:
 *
 *  1. **A clause boundary inside the budget.** These descriptions are written as
 *     "what it is — how it works", so the text before the dash is a complete,
 *     deliberate one-liner rather than a sentence with its end lopped off. No
 *     ellipsis, because nothing reads as missing.
 *  2. **A sentence boundary inside the budget**, for the same reason.
 *  3. **The last word boundary**, with an ellipsis, since the cut is now visible
 *     and pretending otherwise would read as a typo. A trailing comma or colon is
 *     stripped first — "a focus timer,…" is worse than "a focus timer…".
 */
export function trimSummary(text: string, max: number): string {
    const trimmed = text.trim();

    if (trimmed.length <= max) {
        return trimmed;
    }

    const clause = trimmed.search(/ [—–] /);

    if (clause > 0 && clause <= max) {
        return trimmed.slice(0, clause);
    }

    const sentence = trimmed.search(/[.!?] /);

    if (sentence > 0 && sentence + 1 <= max) {
        return trimmed.slice(0, sentence + 1);
    }

    const word = trimmed.lastIndexOf(" ", max);

    return `${trimmed.slice(0, word > 0 ? word : max).replace(/[,;:—–-]$/, "")}…`;
}

/**
 * Drops the scheme, `www.` and any trailing slash.
 *
 * A printed URL is read, not clicked, and "https://" is six characters of noise
 * in a mono line that is already tight. The link target keeps the full URL.
 */
function stripScheme(url: string): string {
    return url
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/+$/, "");
}

/**
 * Keeps the last two comma-separated parts of a location.
 *
 * "Taman Maluri, Cheras, Kuala Lumpur, Malaysia" is precise and four lines long
 * in a date column. "Kuala Lumpur, Malaysia" is what a reader needs.
 */
function shortLocation(location: string): string {
    return location
        .split(",")
        .map((part) => part.trim())
        .slice(-2)
        .join(", ");
}
