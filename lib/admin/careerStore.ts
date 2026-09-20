import "server-only";

import { certifications as builtInCertifications } from "@/data/certifications";
import { education as builtInEducation } from "@/data/education";
import { experience as builtInExperience } from "@/data/experience";
import { skills as builtInSkills } from "@/data/skills";
import { isGithubWriteConfigured, readFile, type WritableKey } from "@/lib/admin/github";
import {
    parseCertifications,
    parseEducation,
    parseExperience,
    parseSkills,
} from "@/lib/admin/parseCareer";
import type { Certification } from "@/types/certification";
import type { Education } from "@/types/education";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";

/**
 * The console's read side for the four career files.
 *
 * Identical in shape and in reasoning to `lib/admin/projectStore.ts`: every page
 * and action loads through here so they all see the file as it exists in the
 * repository *right now*, not as it existed when this deployment was built.
 *
 * That distinction is the whole reason both modules exist. `import { skills }
 * from "@/data/skills"` is frozen at build time, and a save takes a commit plus
 * a Vercel build. Computing the second of two edits from the build-time array
 * would serialize the state *before* the first edit and silently revert it.
 * Reading the repo means consecutive edits compose, and the blob sha carried
 * alongside is what still catches a genuine concurrent edit from another device.
 *
 * Generic over the four rather than four near-identical functions, because the
 * only thing that differs is a key, a parser and a fallback — and three of those
 * four files are edited on the same page, in the same request.
 */

export interface CareerFile<T> {
    entries: T[];
    /** Blob sha to pass back on save. Null when the data came from the build. */
    sha: string | null;
    /**
     * `"build"` means `GITHUB_ADMIN_TOKEN` is unset, so the console is showing
     * the deployed snapshot and cannot save — the UI says so rather than letting
     * a save fail at the last step.
     */
    source: "repo" | "build";
}

async function load<T>(
    key: WritableKey,
    parse: (source: string) => T[],
    fallback: T[],
): Promise<CareerFile<T>> {
    if (!isGithubWriteConfigured()) {
        return { entries: fallback, sha: null, source: "build" };
    }

    const file = await readFile({ kind: "known", key });

    if (!file) {
        /*
         * The path is in the allowlist and the repo is this one, so a 404 means
         * the file was deleted or the token cannot see the repository. Either
         * way, showing the build-time copy would invite a save that recreates
         * the file from stale data.
         */
        throw new Error(
            `The career file for "${key}" was not found in the repository. Check that ` +
                "GITHUB_ADMIN_TOKEN can read this repo's contents.",
        );
    }

    return { entries: parse(file.text), sha: file.sha, source: "repo" };
}

export function loadExperienceFile(): Promise<CareerFile<Experience>> {
    return load("experience", parseExperience, builtInExperience);
}

export function loadEducationFile(): Promise<CareerFile<Education>> {
    return load("education", parseEducation, builtInEducation);
}

export function loadSkillsFile(): Promise<CareerFile<Skill>> {
    return load("skills", parseSkills, builtInSkills);
}

export function loadCertificationsFile(): Promise<CareerFile<Certification>> {
    return load("certifications", parseCertifications, builtInCertifications);
}

/**
 * All four at once, for the page that renders all four.
 *
 * `Promise.all` rather than four awaits: they are four independent GitHub reads
 * and serializing them would make the page four round trips deep for no reason.
 * A rejection in any one still rejects the whole page, which is correct — a
 * career editor showing three live lists and one stale one is worse than an
 * error, because nothing on screen would say which was which.
 */
export function loadCareer(): Promise<
    [CareerFile<Experience>, CareerFile<Education>, CareerFile<Skill>, CareerFile<Certification>]
> {
    return Promise.all([
        loadExperienceFile(),
        loadEducationFile(),
        loadSkillsFile(),
        loadCertificationsFile(),
    ]);
}
