import type { ActionStatus, CommitResult } from "@/types/admin";
import type { Certification } from "@/types/certification";
import type { Education } from "@/types/education";
import type { Experience } from "@/types/experience";
import type { Skill, SkillCategory } from "@/types/skill";

/**
 * Shared contract for the four career editors on `/admin/career`.
 *
 * Client-safe by construction, exactly as `lib/admin/projectForm.ts` is: the
 * panels import the limits and the option lists, so anything added here ships to
 * the browser. No `server-only`, no `process.env`, no GitHub client. Parsing and
 * validation live here because they are pure — the Server Action calls them, and
 * so does `tests/lib/careerForm.test.ts`.
 *
 * **The row encoding, and why it is not parallel arrays.** A project form can
 * post `technologies` repeatedly and read the list back with `getAll`, because
 * there is one project per form. These editors hold *many* entries per form, and
 * three of the four have their own nested lists — `responsibilities`,
 * `relevantCourses`, `honors`. Flat parallel arrays cannot express "row 2 has
 * four responsibilities and row 3 has none": the lists run together and there is
 * no boundary to recover.
 *
 * So each row gets an opaque key, generated client-side and unique only within
 * the form. The form posts `row` once per row in DOM order — which `getAll`
 * preserves, so the posted order *is* the saved order — and every field is named
 * `field:key`. Reconstruction is then a lookup per row rather than an index
 * arithmetic problem, and a row removed from the middle cannot shift another
 * row's values onto it.
 *
 * The keys never reach a file. They are form-field names for the duration of one
 * request and are thrown away by `parseRows`.
 */

/** Field bounds. The client uses `max` for `maxLength`; the action re-checks every one. */
export const CAREER_LIMITS = {
    id: { max: 80 },
    shortText: { max: 160 },
    url: { max: 300 },
    description: { max: 1200 },
    listEntry: { max: 600 },
} as const;

/**
 * The id rule. Looser than a project slug — these ids are React keys and
 * cross-file references (`data/now.ts` prose points at them in review), never
 * URL segments — but still constrained, because an id with a quote in it is a
 * needless test of the serializer's escaping.
 */
export const CAREER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Mirrors the `employmentType` union in `types/experience.ts`. */
export const EMPLOYMENT_TYPES = [
    "Full-time",
    "Part-time",
    "Internship",
    "Contract",
    "Freelance",
] as const;

/** Mirrors the `SkillCategory` union in `types/skill.ts`. */
export const SKILL_CATEGORIES = [
    "Frontend",
    "Backend",
    "Programming Languages",
    "Databases",
    "Frameworks",
    "Developer Tools",
    "Networking & Cloud",
    "Other Technologies",
] as const;

/**
 * The sentinel an ongoing role or programme carries in `endDate`.
 *
 * Not a placeholder and not a formatting choice: `ExperienceSection` derives
 * "current" from this exact string, so a real future date is rendered as
 * finished history. The editor offers it as a checkbox for that reason — typing
 * the word is not something an operator should have to know to do.
 */
export const PRESENT = "Present";

export type CareerSection = "experience" | "education" | "skills" | "certifications";

export interface CareerFormState {
    status: ActionStatus;
    message: string;
    /** Keyed by `"<row index>.<field>"`, so a panel can mark the row that failed. */
    errors: Record<string, string>;
    warnings: string[];
    commit?: CommitResult;
}

export const INITIAL_CAREER_FORM: CareerFormState = {
    status: "idle",
    message: "",
    errors: {},
    warnings: [],
};

/**
 * Reads the posted rows in DOM order, returning one accessor per row.
 *
 * Duplicate keys are dropped rather than merged. They cannot happen from the
 * panels, which generate keys from a `useId()` seed and a counter, so a
 * duplicate means a hand-crafted or replayed post — and merging two rows that
 * claim the same key would silently combine two entries into one.
 */
export function parseRows(formData: FormData): {
    text: (field: string) => string;
    list: (field: string) => string[];
    checked: (field: string) => boolean;
}[] {
    const seen = new Set<string>();

    return formData
        .getAll("row")
        .map((value) => String(value))
        .filter((key) => {
            if (key.length === 0 || seen.has(key)) {
                return false;
            }

            seen.add(key);

            return true;
        })
        .map((key) => ({
            text: (field: string) => String(formData.get(`${field}:${key}`) ?? "").trim(),
            list: (field: string) =>
                formData
                    .getAll(`${field}:${key}`)
                    .map((value) => String(value).trim())
                    .filter((value) => value.length > 0),
            checked: (field: string) => formData.get(`${field}:${key}`) === "on",
        }));
}

/** Assigns only when there is something to say, so the printer's omission stays meaningful. */
function set<T extends object>(target: T, key: keyof T, value: string): void {
    if (value.length > 0) {
        target[key] = value as T[keyof T];
    }
}

export function parseExperienceForm(formData: FormData): Experience[] {
    return parseRows(formData).map((row) => {
        const entry: Experience = {
            id: row.text("id"),
            role: row.text("role"),
            company: row.text("company"),
            startDate: row.text("startDate"),
            description: row.text("description"),
            featured: row.checked("featured"),
        };

        set(entry, "companyUrl", row.text("companyUrl"));
        set(entry, "logo", row.text("logo"));
        set(entry, "location", row.text("location"));

        const employmentType = row.text("employmentType");
        if ((EMPLOYMENT_TYPES as readonly string[]).includes(employmentType)) {
            entry.employmentType = employmentType as Experience["employmentType"];
        }

        /*
         * The checkbox wins over the date input. A row can carry a stale date
         * from before it was marked current, and the two disagreeing is exactly
         * the bug this sentinel exists to prevent.
         */
        entry.endDate = row.checked("current") ? PRESENT : row.text("endDate") || undefined;

        if (entry.endDate === undefined) {
            delete entry.endDate;
        }

        const responsibilities = row.list("responsibilities");
        if (responsibilities.length > 0) entry.responsibilities = responsibilities;

        const technologies = row.list("technologies");
        if (technologies.length > 0) entry.technologies = technologies;

        return entry;
    });
}

export function parseEducationForm(formData: FormData): Education[] {
    return parseRows(formData).map((row) => {
        const entry: Education = {
            id: row.text("id"),
            degree: row.text("degree"),
            institution: row.text("institution"),
            startDate: row.text("startDate"),
            featured: row.checked("featured"),
        };

        set(entry, "institutionUrl", row.text("institutionUrl"));
        set(entry, "location", row.text("location"));
        set(entry, "gpa", row.text("gpa"));
        set(entry, "description", row.text("description"));

        const endDate = row.checked("current") ? PRESENT : row.text("endDate");
        if (endDate.length > 0) entry.endDate = endDate;

        const relevantCourses = row.list("relevantCourses");
        if (relevantCourses.length > 0) entry.relevantCourses = relevantCourses;

        const honors = row.list("honors");
        if (honors.length > 0) entry.honors = honors;

        return entry;
    });
}

export function parseSkillsForm(formData: FormData): Skill[] {
    return parseRows(formData).map((row) => ({
        id: row.text("id"),
        name: row.text("name"),
        category: row.text("category") as SkillCategory,
        icon: row.text("icon"),
        featured: row.checked("featured"),
    }));
}

export function parseCertificationsForm(formData: FormData): Certification[] {
    return parseRows(formData).map((row) => {
        const entry: Certification = {
            id: row.text("id"),
            name: row.text("name"),
            issuer: row.text("issuer"),
            date: row.text("date"),
        };

        set(entry, "credentialUrl", row.text("credentialUrl"));

        return entry;
    });
}

/** `YYYY-MM-DD`, and a real date — `2026-02-31` parses as March and is rejected. */
function isIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);

        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

interface Validation {
    errors: Record<string, string>;
    warnings: string[];
}

/**
 * Checks shared by all four sections: a present, well-formed, unique id.
 *
 * Uniqueness is the one that matters most and is invisible in a form. Every
 * component keys its list on `id`, so two rows sharing one make React reuse a
 * DOM node across two different entries — which renders as one entry's text
 * appearing inside another's card, on the live site, with no error anywhere.
 */
function checkIds(rows: { id: string }[], errors: Record<string, string>): void {
    const counts = new Map<string, number>();

    rows.forEach((row) => counts.set(row.id, (counts.get(row.id) ?? 0) + 1));

    rows.forEach((row, index) => {
        if (row.id.length === 0) {
            errors[`${index}.id`] = "An id is required — every component keys its list on it.";
        } else if (row.id.length > CAREER_LIMITS.id.max) {
            errors[`${index}.id`] = `Ids must be ${CAREER_LIMITS.id.max} characters or fewer.`;
        } else if (!CAREER_ID_PATTERN.test(row.id)) {
            errors[`${index}.id`] =
                "Lowercase letters, digits and single hyphens only — no spaces, no leading or trailing hyphen.";
        } else if ((counts.get(row.id) ?? 0) > 1) {
            errors[`${index}.id`] =
                "Another entry in this list already uses this id. React keys on it, so duplicates render one entry inside another.";
        }
    });
}

/**
 * Dates that a human reads as a range. Checked rather than corrected: a start
 * after an end is a typo worth seeing, and silently swapping them would hide it.
 */
function checkRange(
    index: number,
    startDate: string,
    endDate: string | undefined,
    errors: Record<string, string>,
): void {
    if (!isIsoDate(startDate)) {
        errors[`${index}.startDate`] = "A start date is required, as YYYY-MM-DD.";

        return;
    }

    if (endDate === undefined || endDate === PRESENT) {
        return;
    }

    if (!isIsoDate(endDate)) {
        errors[`${index}.endDate`] = `Must be YYYY-MM-DD, or "${PRESENT}" for an ongoing entry.`;
    } else if (endDate < startDate) {
        errors[`${index}.endDate`] = "The end date is before the start date.";
    }
}

export function validateExperience(entries: Experience[]): Validation {
    const errors: Record<string, string> = {};
    const warnings: string[] = [];

    checkIds(entries, errors);

    entries.forEach((entry, index) => {
        if (entry.role.length === 0) errors[`${index}.role`] = "A role title is required.";
        if (entry.company.length === 0) errors[`${index}.company`] = "A company is required.";

        if (entry.description.length === 0) {
            errors[`${index}.description`] =
                "A description is required — it is the summary line on the site and in the résumé.";
        } else if (entry.description.length > CAREER_LIMITS.description.max) {
            errors[`${index}.description`] =
                `Must be ${CAREER_LIMITS.description.max} characters or fewer.`;
        }

        if (entry.companyUrl && !isHttpUrl(entry.companyUrl)) {
            errors[`${index}.companyUrl`] = "Must be an absolute http(s) URL.";
        }

        checkRange(index, entry.startDate, entry.endDate, errors);

        if ((entry.responsibilities?.length ?? 0) === 0) {
            warnings.push(
                `"${entry.role || entry.id}" lists no responsibilities, so its card shows a summary line and nothing else.`,
            );
        }
    });

    if (entries.filter((entry) => entry.endDate === PRESENT).length > 1) {
        warnings.push(
            `More than one role is marked current. That is fine if it is true — a part-time role alongside an internship — but it is the kind of thing that is usually a forgotten "${PRESENT}".`,
        );
    }

    return { errors, warnings };
}

export function validateEducation(entries: Education[]): Validation {
    const errors: Record<string, string> = {};
    const warnings: string[] = [];

    checkIds(entries, errors);

    entries.forEach((entry, index) => {
        if (entry.degree.length === 0)
            errors[`${index}.degree`] = "A degree or programme is required.";

        if (entry.institution.length === 0) {
            errors[`${index}.institution`] = "An institution is required.";
        }

        if (entry.institutionUrl && !isHttpUrl(entry.institutionUrl)) {
            errors[`${index}.institutionUrl`] = "Must be an absolute http(s) URL.";
        }

        checkRange(index, entry.startDate, entry.endDate, errors);

        /*
         * The résumé's fonts cannot draw anything outside Latin and general
         * punctuation, so lib/resume/model.ts strips it. Worth saying once, at
         * the point of entry, rather than leaving it to be discovered by reading
         * the PDF — which is how it was found the first time (§16.3).
         */
        if (/[^\u0000-ɏ -⁯]/.test(entry.institution)) {
            warnings.push(
                `"${entry.institution}" contains characters the résumé's embedded fonts cannot draw. The site shows them; the PDF strips them.`,
            );
        }
    });

    return { errors, warnings };
}

export function validateSkills(entries: Skill[]): Validation {
    const errors: Record<string, string> = {};
    const warnings: string[] = [];

    checkIds(entries, errors);

    entries.forEach((entry, index) => {
        if (entry.name.length === 0) errors[`${index}.name`] = "A display name is required.";
        if (entry.icon.length === 0) errors[`${index}.icon`] = "An icon key is required.";

        if (!(SKILL_CATEGORIES as readonly string[]).includes(entry.category)) {
            errors[`${index}.category`] =
                "Pick one of the categories — it is a union in types/skill.ts, not free text.";
        }
    });

    return { errors, warnings };
}

export function validateCertifications(entries: Certification[]): Validation {
    const errors: Record<string, string> = {};

    checkIds(entries, errors);

    entries.forEach((entry, index) => {
        if (entry.name.length === 0) errors[`${index}.name`] = "A credential name is required.";
        if (entry.issuer.length === 0) errors[`${index}.issuer`] = "An awarding body is required.";

        if (!isIsoDate(entry.date)) {
            errors[`${index}.date`] = "An award date is required, as YYYY-MM-DD.";
        }

        if (entry.credentialUrl && !isHttpUrl(entry.credentialUrl)) {
            errors[`${index}.credentialUrl`] = "Must be an absolute http(s) URL.";
        }
    });

    return { errors, warnings: [] };
}
