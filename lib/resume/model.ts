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

/** A headline figure in the header strip. Always computed, never typed in. */
export interface ResumeStat {
    value: string;
    label: string;
}

export interface ResumeRole {
    role: string;
    company: string;
    /** "Internship", "Part-time" — printed beside the company. */
    employmentType?: string;
    location?: string;
    /** Pre-formatted, e.g. "Jul 2026 – Present". */
    dates: string;
    bullets: string[];
    technologies: string[];
}

export interface ResumeLink {
    label: string;
    /** Printed without a scheme — "job-now-navy.vercel.app". */
    value: string;
    href: string;
}

export interface ResumeProject {
    title: string;
    /** "University capstone, four-person team". Absent means nothing is printed. */
    role?: string;
    technologies: string[];
    summary: string;
    features: string[];
    links: ResumeLink[];
    featured: boolean;
}

export interface ResumeSkillGroup {
    category: string;
    items: string[];
}

export interface ResumeEducation {
    degree: string;
    institution: string;
    location?: string;
    dates: string;
    /** CGPA, honours and status, one line each. */
    details: string[];
    /** Comma-joined relevant coursework. */
    coursework?: string;
}

export interface ResumeFact {
    label: string;
    value: string;
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
    stats: ResumeStat[];
    summary: string;
    highlights: string[];
    /** Printed at the foot of the summary, on page one, where a recruiter looks first. */
    availability: string;
    experience: ResumeRole[];
    projects: ResumeProject[];
    /** Titles of the projects past `maxProjects`, for the closing "More projects" line. */
    moreProjects: string[];
    skills: ResumeSkillGroup[];
    education: ResumeEducation[];
    certifications: ResumeCertification[];
    /** Languages and interests. */
    additional: ResumeFact[];
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
    const ranked = rankProjects(projects);

    return renderableModel({
        name: AUTHOR.name.toUpperCase(),
        headline: `${AUTHOR.role} · Full-Stack Developer`,
        contacts: buildContacts(),
        stats: buildStats(projects),
        summary: config.summary,
        highlights: config.highlights.filter((line) => line.trim()),
        availability: config.availability.trim(),
        experience: buildExperience(config),
        projects: buildProjects(ranked, config),
        moreProjects: config.listRemainingProjects
            ? ranked.slice(config.maxProjects).map((project) => shortTitle(project.title))
            : [],
        skills: buildSkills(config),
        education: buildEducation(),
        certifications: config.includeCertifications ? buildCertifications() : [],
        additional: buildAdditional(config),
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
        { label: "Portfolio", value: stripScheme(SITE_URL), href: SITE_URL },
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
        { label: "JobStreet", value: "JobStreet profile", href: AUTHOR.jobstreet },
    ];
}

/**
 * The header's figures, all counted from data rather than written.
 *
 * Counting is the point: "13 projects" typed into a config file is stale the day
 * a fourteenth ships, and a figure on a résumé that the linked site contradicts
 * costs more credibility than it ever bought. Technologies are the distinct
 * entries across every project's `technologies`, case-insensitively — what has
 * actually been shipped with, not what `data/skills.ts` lists as known.
 */
function buildStats(projects: Project[]): ResumeStat[] {
    const technologies = new Set(
        projects.flatMap((project) => project.technologies.map((tech) => tech.toLowerCase())),
    );
    const gpa = sortByStartDateDesc(education).find((entry) => entry.gpa)?.gpa;

    return [
        { value: String(projects.length), label: "Projects built" },
        {
            value: String(projects.filter((project) => project.liveUrl).length),
            label: "Live deployments",
        },
        { value: String(technologies.size), label: "Technologies shipped" },
        ...(gpa ? [{ value: gpa, label: "CGPA" }] : []),
    ];
}

/**
 * Experience, newest first, bullets capped.
 *
 * `sortByStartDateDesc` is the site's own sort, reused so the PDF cannot present
 * the timeline in a different order from `ExperienceSection`. The `description`
 * is dropped when there are bullets: it exists on the site to introduce a card,
 * and on a résumé it would repeat the bullets in prose form.
 */
function buildExperience(config: ResumeConfig): ResumeRole[] {
    return sortByStartDateDesc(experience)
        .slice(0, config.maxRoles)
        .map((entry) => ({
            role: entry.role,
            company: entry.company,
            employmentType: entry.employmentType,
            location: entry.location ? shortLocation(entry.location) : undefined,
            dates: formatDateRange(entry.startDate, entry.endDate),
            bullets: (entry.responsibilities?.length
                ? entry.responsibilities
                : [entry.description]
            ).slice(0, config.maxBulletsPerRole),
            technologies: entry.technologies ?? [],
        }));
}

/** Featured first, then by `order` — the site's own ranking. */
function rankProjects(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => {
        if (Boolean(a.featured) !== Boolean(b.featured)) {
            return a.featured ? -1 : 1;
        }

        return (a.order ?? Infinity) - (b.order ?? Infinity);
    });
}

/**
 * Projects, capped at `maxProjects`, each with its summary, its first key
 * features, its role, and every link it has.
 *
 * The summary is the project's `description` — card copy, already written to be
 * read cold. The key features are what turn "a job listing app" into evidence of
 * engineering: the description says what it is, the features say what was hard.
 * Technologies are capped at eight per project because a chip row that wraps to
 * three lines stops being scannable and starts being a wall.
 *
 * Both links are printed when both exist. A reviewer who wants to try it takes
 * the live one; a reviewer who wants to judge the code takes the repository —
 * and the second reviewer is the one deciding on an engineering hire. The live
 * link prints its bare hostname (a deployed domain is itself a signal); the
 * repository prints as "GitHub", since its full path would crowd the title row
 * and every repository is one click from the GitHub URL in the contact row.
 */
function buildProjects(ranked: Project[], config: ResumeConfig): ResumeProject[] {
    return ranked.slice(0, config.maxProjects).map((project) => ({
        title: shortTitle(project.title),
        role: project.role,
        technologies: project.technologies.slice(0, 8),
        summary: trimSummary(project.description, config.projectSummaryMaxChars),
        features: (project.keyFeatures ?? [])
            .slice(0, config.maxFeaturesPerProject)
            .map((feature) => trimSummary(feature, config.featureMaxChars)),
        links: [
            ...(project.liveUrl
                ? [
                      {
                          label: "Live",
                          value: new URL(project.liveUrl).hostname.replace(/^www\./, ""),
                          href: project.liveUrl,
                      },
                  ]
                : []),
            ...(project.githubUrl
                ? [{ label: "Code", value: "GitHub", href: project.githubUrl }]
                : []),
        ],
        featured: Boolean(project.featured),
    }));
}

/**
 * Drops a title's subtitle — "JobNow – Job Listing Application" prints as
 * "JobNow". The subtitle restates the summary directly beneath it, and the short
 * name is what the reader will search for on the site.
 */
function shortTitle(title: string): string {
    return title.split(/ [–—] /)[0].trim();
}

/**
 * Skills grouped into the configured categories, in the configured order.
 *
 * A category with no skills is dropped rather than printed empty — a heading
 * with nothing under it reads as a rendering fault. Soft skills close the table
 * as their own row; they come from `data/resume.ts` because the site has no
 * other place for them.
 */
function buildSkills(config: ResumeConfig): ResumeSkillGroup[] {
    const technical = config.skillCategories
        .map((category) => ({
            category: config.skillCategoryLabels[category] ?? category,
            items: skills.filter((skill) => skill.category === category).map((skill) => skill.name),
        }))
        .filter((group) => group.items.length > 0);

    return config.softSkills.length > 0
        ? [...technical, { category: "Soft Skills", items: config.softSkills }]
        : technical;
}

/**
 * Education, newest first, in full.
 *
 * Honours are joined into one line (the SPM entry is six of them), the CGPA is
 * added only when no honour already states it, and an ongoing entry carries its
 * `description` — for the diploma that is the sentence explaining exactly where
 * the award stands, which an employer reading "Present" will want to know.
 */
function buildEducation(): ResumeEducation[] {
    return sortByStartDateDesc(education).map((entry) => {
        const honours = entry.honors?.join(" · ");
        const details = [
            ...(honours ? [honours] : []),
            ...(entry.gpa && !honours?.includes(entry.gpa) ? [`CGPA ${entry.gpa}`] : []),
            ...(entry.endDate === "Present" && entry.description ? [entry.description] : []),
        ];

        return {
            degree: entry.degree,
            institution: entry.institution,
            location: entry.location ? shortLocation(entry.location) : undefined,
            dates: formatDateRange(entry.startDate, entry.endDate),
            details,
            coursework: entry.relevantCourses?.length
                ? entry.relevantCourses.join(", ")
                : undefined,
        };
    });
}

function buildAdditional(config: ResumeConfig): ResumeFact[] {
    return [
        { label: "Languages", value: config.languages.join(" · ") },
        { label: "Interests", value: config.interests.join(" · ") },
    ].filter((fact) => fact.value.trim());
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
 *
 * One mark is translated rather than dropped: "→" sits in the Arrows block, which
 * the Latin subsets do not carry, and project copy uses it as a verb — "Gemini →
 * local Ollama failover" printed as "Gemini local Ollama failover" loses the
 * meaning. It becomes " to ".
 */
function toRenderable(text: string): string {
    return text
        .replace(/\s*→\s*/g, " to ")
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
 *  3. **The last phrase boundary inside the budget** — before " (", or after
 *     ": ", "; ", or a comma that opens a new clause (", plus", ", with" …) —
 *     provided it clears the same floor as tiers 1 and 2. Key features are written as
 *     "the thing: the detail" or "the thing, plus the extra", so the head is a
 *     complete statement. A bare list comma does not qualify: cutting
 *     "Admin, Moderator and Student" after "Admin" would state something false.
 *     Nor does a cut inside an open bracket.
 *
 * Tiers 1–3 each apply only when the cut keeps at least 30% of the budget.
 *  4. **The last word boundary**, with an ellipsis, since the cut is now visible
 *     and pretending otherwise would read as a typo. A trailing comma or colon is
 *     stripped first — "a focus timer,…" is worse than "a focus timer…".
 */
export function trimSummary(text: string, max: number): string {
    const trimmed = text.trim();

    if (trimmed.length <= max) {
        return trimmed;
    }

    /*
     * No clean cut may keep less than this. Without it, a key feature written as
     * "Deterministic simulation kernel — protocol logic is pure TypeScript…" was
     * cut at its dash to three words, dropping the half that was the point.
     */
    const floor = max * 0.3;
    const clause = trimmed.search(/ [—–] /);

    if (clause >= floor && clause <= max) {
        return trimmed.slice(0, clause);
    }

    const sentence = trimmed.search(/[.!?] /);

    if (sentence + 1 >= floor && sentence + 1 <= max) {
        return trimmed.slice(0, sentence + 1);
    }

    const phrases = [
        ...trimmed.matchAll(/ \(|[:;] |, (?=(?:plus|with|and|so|which|but|each|rather|then) )/g),
    ]
        .map((match) => match.index)
        .filter((index) => index >= floor && index <= max && isBalanced(trimmed.slice(0, index)));

    if (phrases.length > 0) {
        return trimmed.slice(0, phrases[phrases.length - 1]);
    }

    const word = trimmed.lastIndexOf(" ", max);

    return `${trimmed.slice(0, word > 0 ? word : max).replace(/[,;:—–-]$/, "")}…`;
}

/** True when every "(" in `text` is closed — a cut inside brackets strands one open. */
function isBalanced(text: string): boolean {
    return (text.match(/\(/g)?.length ?? 0) === (text.match(/\)/g)?.length ?? 0);
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
