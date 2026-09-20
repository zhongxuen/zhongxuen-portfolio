"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin/dal";
import {
    CommitConflictError,
    MissingTokenError,
    commitFile,
    commitMessage,
    type WritableKey,
} from "@/lib/admin/github";
import {
    loadCertificationsFile,
    loadEducationFile,
    loadExperienceFile,
    loadSkillsFile,
    type CareerFile,
} from "@/lib/admin/careerStore";
import {
    parseCertificationsForm,
    parseEducationForm,
    parseExperienceForm,
    parseSkillsForm,
    validateCertifications,
    validateEducation,
    validateExperience,
    validateSkills,
    type CareerFormState,
} from "@/lib/admin/careerForm";
import {
    parseCertifications,
    parseEducation,
    parseExperience,
    parseSkills,
} from "@/lib/admin/parseCareer";
import {
    serializeCertifications,
    serializeEducation,
    serializeExperience,
    serializeSkills,
} from "@/lib/admin/serializeCareer";
import { UnsafeWriteError, safeCareerSource } from "@/lib/admin/validate";
import type { Certification } from "@/types/certification";
import type { Education } from "@/types/education";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";

/**
 * The four career lists (docs/admin-plan.md §17.1).
 *
 * **Every exported function here begins with `await verifySession()`.** A Server
 * Action is a public POST endpoint reachable by replay, and the Next 16 proxy
 * docs are explicit that a proxy matcher does not cover Server Function calls.
 * tests/admin/actionGuards.test.ts asserts this by static check over the
 * directory, because the failure it catches is invisible in review.
 *
 * Each action replaces its whole list rather than patching one entry. That is
 * the honest shape for what the form is: the panel holds every row, the posted
 * order *is* the saved order (see the row encoding in lib/admin/careerForm.ts),
 * and a partial update would need a second concept of identity on top of the ids
 * the user is simultaneously allowed to edit. The blob sha still catches a
 * genuine concurrent edit from another device.
 */

/**
 * The one save path, parameterised.
 *
 * Four sections that differ only in a parser, a validator, a serializer and a
 * noun would otherwise be four copies of the same twelve steps — and the steps
 * that matter (session first, read live, validate, round-trip, commit with the
 * sha) are exactly the ones that must not be subtly different between them.
 */
async function saveSection<T extends object>({
    formData,
    key,
    file: loadFile,
    noun,
    parseForm,
    validate,
    serialize,
    parse,
    describe: describeEntry,
}: {
    formData: FormData;
    key: WritableKey;
    file: () => Promise<CareerFile<T>>;
    /** Names the list in the operator-facing messages: "experience entries". */
    noun: string;
    parseForm: (formData: FormData) => T[];
    validate: (entries: T[]) => { errors: Record<string, string>; warnings: string[] };
    serialize: (entries: T[]) => string;
    parse: (source: string) => T[];
    describe: (entry: T, index: number) => string;
}): Promise<CareerFormState> {
    const submitted = parseForm(formData);

    let current: CareerFile<T>;

    try {
        current = await loadFile();
    } catch (error) {
        return failure(error, `Could not read data/${key}.ts.`);
    }

    if (current.source === "build") {
        return {
            status: "error",
            message: READ_ONLY_MESSAGE,
            errors: {},
            warnings: [],
        };
    }

    const { errors, warnings } = validate(submitted);

    if (Object.keys(errors).length > 0) {
        return {
            status: "error",
            message: "Nothing was committed — fix the highlighted fields.",
            errors,
            warnings: [],
        };
    }

    /*
     * An empty list is allowed and means what it says: data/certifications.ts
     * ships empty today and renders as no strip at all. Emptying `experience`
     * would be strange, so it is a warning rather than a refusal — this console
     * does not get to decide that a career is non-empty.
     */
    if (submitted.length === 0) {
        warnings.push(
            `Saved an empty ${noun} list. Every section that reads it renders nothing at all.`,
        );
    }

    try {
        const source = safeCareerSource<T>({
            file: `data/${key}.ts`,
            entries: submitted,
            serialize,
            parse,
            describe: describeEntry,
        });

        const commit = await commitFile({
            target: { kind: "known", key },
            content: source,
            sha: current.sha,
            message: commitMessage.career(`${noun} (${submitted.length} entries)`),
        });

        revalidatePath("/admin", "layout");

        return {
            status: "success",
            message: `Committed ${submitted.length} ${noun} ${submitted.length === 1 ? "entry" : "entries"}.`,
            errors: {},
            warnings,
            commit,
        };
    } catch (error) {
        return failure(error, "The commit failed.");
    }
}

export async function saveExperience(
    _previous: CareerFormState,
    formData: FormData,
): Promise<CareerFormState> {
    await verifySession();

    return saveSection<Experience>({
        formData,
        key: "experience",
        file: loadExperienceFile,
        noun: "experience",
        parseForm: parseExperienceForm,
        validate: validateExperience,
        serialize: serializeExperience,
        parse: parseExperience,
        describe: (entry, index) => entry.id || entry.role || `#${index + 1}`,
    });
}

export async function saveEducation(
    _previous: CareerFormState,
    formData: FormData,
): Promise<CareerFormState> {
    await verifySession();

    return saveSection<Education>({
        formData,
        key: "education",
        file: loadEducationFile,
        noun: "education",
        parseForm: parseEducationForm,
        validate: validateEducation,
        serialize: serializeEducation,
        parse: parseEducation,
        describe: (entry, index) => entry.id || entry.degree || `#${index + 1}`,
    });
}

export async function saveSkills(
    _previous: CareerFormState,
    formData: FormData,
): Promise<CareerFormState> {
    await verifySession();

    return saveSection<Skill>({
        formData,
        key: "skills",
        file: loadSkillsFile,
        noun: "skill",
        parseForm: parseSkillsForm,
        validate: validateSkills,
        serialize: serializeSkills,
        parse: parseSkills,
        describe: (entry, index) => entry.id || entry.name || `#${index + 1}`,
    });
}

export async function saveCertifications(
    _previous: CareerFormState,
    formData: FormData,
): Promise<CareerFormState> {
    await verifySession();

    return saveSection<Certification>({
        formData,
        key: "certifications",
        file: loadCertificationsFile,
        noun: "certification",
        parseForm: parseCertificationsForm,
        validate: validateCertifications,
        serialize: serializeCertifications,
        parse: parseCertifications,
        describe: (entry, index) => entry.id || entry.name || `#${index + 1}`,
    });
}

const READ_ONLY_MESSAGE =
    "GITHUB_ADMIN_TOKEN is not configured on this deployment, so this console can read but not write. Nothing was changed.";

function failure(error: unknown, fallback: string): CareerFormState {
    return {
        status: error instanceof CommitConflictError ? "conflict" : "error",
        message: describe(error, fallback),
        errors: {},
        warnings: [],
    };
}

/**
 * Turns a thrown error into something safe to return.
 *
 * Action return values are serialized straight to the client, so only error
 * classes defined in this repository contribute their own wording. Everything
 * else is logged server-side and replaced with the caller's generic sentence —
 * the discipline `app/actions/contact.ts` already documents, and which
 * `tests/admin/actionGuards.test.ts` asserts no action breaks.
 */
function describe(error: unknown, fallback: string): string {
    if (error instanceof CommitConflictError) {
        return "The repository changed since this page loaded, so nothing was written. Reload to pick up the newer version.";
    }

    if (error instanceof MissingTokenError) {
        return READ_ONLY_MESSAGE;
    }

    console.error("[admin/career] action failed", error);

    if (error instanceof Error && error.name === "ModuleSourceError") {
        return error.message;
    }

    if (error instanceof UnsafeWriteError) {
        return `Nothing was written. ${error.reasons.join(" ")} This is a bug in the console's serializer, not in your edit — the details are in the deployment logs.`;
    }

    return `${fallback} The reason is in the deployment logs.`;
}
