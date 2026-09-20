import type { ActionStatus, CommitResult } from "@/types/admin";
import type { Project } from "@/types/project";

/**
 * Shared contract for the project editor form.
 *
 * Client-safe by construction, exactly as `lib/contact.ts` is: the editor
 * imports the limits (for `maxLength`) and the state shape, so anything added
 * here ships to the browser. No `server-only`, no `process.env`, no GitHub
 * client. Validation lives here too because it is pure — the Server Action calls
 * it, and so does tests/lib/projectForm.test.ts.
 */

/**
 * Field bounds. The client uses `max` for the native `maxLength` attribute — a
 * courtesy, trivially bypassed — and the Server Action re-checks every one,
 * because the action is a public POST endpoint reachable by replay.
 */
export const PROJECT_LIMITS = {
    slug: { max: 80 },
    title: { max: 140 },
    description: { max: 400 },
    longDescription: { max: 6000 },
    role: { max: 140 },
    githubUrl: { max: 300 },
    githubRepo: { max: 140 },
    liveUrl: { max: 300 },
    credentialsPassword: { max: 140 },
    listEntry: { max: 1000 },
} as const;

/**
 * Soft ceiling on `description`, not a hard one.
 *
 * `buildMetadata()` reuses the description verbatim as the page's meta
 * description, where Google truncates around here, and
 * docs/seo-improvement-plan.md §7 is still tracking three existing entries that
 * overrun. Blocking the save would make those three unsaveable; warning is what
 * stops the problem getting worse while leaving the existing prose alone.
 */
export const DESCRIPTION_SEO_MAX = 155;

/**
 * The slug rule, identical to the one `tests/data/integrity.test.ts` asserts over
 * `data/projects.ts`. Restated rather than imported from the test, since a test
 * is not a module anything should depend on — but it is the same regex, and if
 * one changes the other fails.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Sentinel slug for the create route: `/admin/projects/new`. */
export const NEW_PROJECT_SLUG = "new";

export type ProjectField =
    | "slug"
    | "title"
    | "description"
    | "longDescription"
    | "role"
    | "githubUrl"
    | "githubRepo"
    | "liveUrl"
    | "credentialsPassword"
    | "credentialsAccounts"
    | "screenshot";

export type ProjectFieldErrors = Partial<Record<ProjectField, string>>;

export interface ProjectFormState {
    status: ActionStatus;
    message: string;
    errors: ProjectFieldErrors;
    /**
     * Advisory notes that did not block the save — an over-long description, a
     * `githubRepo` with no matching repo. Shown after a successful commit, which
     * is the only moment they are actionable.
     */
    warnings: string[];
    commit?: CommitResult;
}

export const INITIAL_PROJECT_FORM: ProjectFormState = {
    status: "idle",
    message: "",
    errors: {},
    warnings: [],
};

/**
 * Builds a `Project` from submitted form data.
 *
 * List fields arrive as repeated inputs of the same name, so `getAll` returns
 * them in DOM order — which is why `ListField` can implement reordering as real
 * state rather than as an index the server has to sort by. Blank rows are
 * dropped here rather than rejected: adding a row and changing your mind is not
 * an error.
 *
 * Nothing is trusted. `order` is not read from the form at all — it is owned by
 * the list page's reorder action and by `renumber()`, so a replayed request
 * cannot reshuffle the site by posting a number.
 */
export function parseProjectForm(formData: FormData): Project {
    const text = (name: string) => String(formData.get(name) ?? "").trim();

    const list = (name: string) =>
        formData
            .getAll(name)
            .map((value) => String(value).trim())
            .filter((value) => value.length > 0);

    const credentialsPassword = text("credentialsPassword");
    const credentialsAccounts = list("credentialsAccounts");

    const project: Project = {
        slug: text("slug"),
        title: text("title"),
        description: text("description"),
        technologies: list("technologies"),
        featured: formData.get("featured") === "on",
    };

    /*
     * Assigned conditionally rather than set to "" or []: the serializer omits
     * empty optionals, so writing them here would only make the object a less
     * accurate picture of the file it is about to become.
     */
    const longDescription = text("longDescription");
    if (longDescription) project.longDescription = longDescription;

    if (credentialsPassword || credentialsAccounts.length > 0) {
        project.testCredentials = {
            password: credentialsPassword,
            accounts: credentialsAccounts,
        };
    }

    const role = text("role");
    if (role) project.role = role;

    const githubUrl = text("githubUrl");
    if (githubUrl) project.githubUrl = githubUrl;

    const githubRepo = text("githubRepo");
    if (githubRepo) project.githubRepo = githubRepo;

    const liveUrl = text("liveUrl");
    if (liveUrl) project.liveUrl = liveUrl;

    const screenshots = list("screenshots");
    if (screenshots.length > 0) project.screenshots = screenshots;

    for (const field of [
        "keyFeatures",
        "disclaimers",
        "challenges",
        "lessonsLearned",
        "futureImprovements",
    ] as const) {
        const values = list(field);

        if (values.length > 0) {
            project[field] = values;
        }
    }

    return project;
}

/**
 * Validates a parsed project.
 *
 * `takenSlugs` is every *other* project's slug, so an edit that keeps its own
 * slug is not rejected as a duplicate.
 */
export function validateProject(
    project: Project,
    takenSlugs: string[],
): { errors: ProjectFieldErrors; warnings: string[] } {
    const errors: ProjectFieldErrors = {};
    const warnings: string[] = [];

    if (project.slug.length === 0) {
        errors.slug = "A slug is required — it is the project's URL.";
    } else if (project.slug.length > PROJECT_LIMITS.slug.max) {
        errors.slug = `Slug must be ${PROJECT_LIMITS.slug.max} characters or fewer.`;
    } else if (!SLUG_PATTERN.test(project.slug)) {
        errors.slug =
            "Lowercase letters, digits and single hyphens only — no spaces, no leading or trailing hyphen.";
    } else if (project.slug === NEW_PROJECT_SLUG) {
        errors.slug = `"${NEW_PROJECT_SLUG}" is reserved — it is this console's create route.`;
    } else if (takenSlugs.includes(project.slug)) {
        errors.slug = "Another project already uses this slug.";
    }

    if (project.title.length === 0) {
        errors.title = "A title is required.";
    } else if (project.title.length > PROJECT_LIMITS.title.max) {
        errors.title = `Title must be ${PROJECT_LIMITS.title.max} characters or fewer.`;
    }

    if (project.description.length === 0) {
        errors.description =
            "A description is required — it is the card copy and the meta description.";
    } else if (project.description.length > PROJECT_LIMITS.description.max) {
        errors.description = `Description must be ${PROJECT_LIMITS.description.max} characters or fewer.`;
    } else if (project.description.length > DESCRIPTION_SEO_MAX) {
        warnings.push(
            `The description is ${project.description.length} characters. It is reused verbatim as this page's meta description, where search results truncate around ${DESCRIPTION_SEO_MAX} — consider shortening it.`,
        );
    }

    if (project.technologies.length === 0) {
        warnings.push("No technologies listed, so the card and the spec sheet will show none.");
    }

    for (const [field, value] of [
        ["githubUrl", project.githubUrl],
        ["liveUrl", project.liveUrl],
    ] as const) {
        if (value && !isHttpUrl(value)) {
            errors[field] = "Must be an absolute http(s) URL.";
        } else if (value && value.length > PROJECT_LIMITS[field].max) {
            errors[field] = `Must be ${PROJECT_LIMITS[field].max} characters or fewer.`;
        }
    }

    if (project.testCredentials) {
        if (project.testCredentials.password.length === 0) {
            errors.credentialsPassword =
                "Demo accounts need the shared password, or remove the accounts.";
        }

        if (project.testCredentials.accounts.length === 0) {
            errors.credentialsAccounts = "Add at least one account, or clear the password.";
        }
    }

    /*
     * A screenshot path that does not start with /images/projects/ would render a
     * broken <Image> at build time. Checked rather than rewritten: a wrong path
     * is a mistake worth seeing, and silently "fixing" it would hide a typo in
     * the filename.
     */
    const badScreenshot = project.screenshots?.find(
        (path) => !path.startsWith("/images/projects/"),
    );

    if (badScreenshot) {
        errors.screenshot = `"${badScreenshot}" must be a path under /images/projects/.`;
    }

    return { errors, warnings };
}

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);

        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Derives a slug from a repo name or a title, for the create form and for
 * GitHub sync.
 *
 * `lib/utils.ts` already exports `slugify`, and this wraps it rather than
 * replacing it: that function leaves underscores and can emit a leading or
 * trailing hyphen, neither of which passes `SLUG_PATTERN`. The extra two
 * replacements are the difference between "a slug" and "a slug this console will
 * accept".
 */
export function toProjectSlug(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[_\s]+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
