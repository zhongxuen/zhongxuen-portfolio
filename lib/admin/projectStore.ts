import "server-only";

import { projects as builtInProjects } from "@/data/projects";
import { isGithubWriteConfigured, readFile } from "@/lib/admin/github";
import { parseProjects } from "@/lib/admin/parseProjects";
import type { Project } from "@/types/project";

/**
 * The console's read side for `data/projects.ts`.
 *
 * Every admin page and every project action loads through here, so they all see
 * the same thing: the file as it exists in the repository *right now*, not as it
 * existed when this deployment was built.
 *
 * That distinction is the whole reason this module exists. `import { projects }
 * from "@/data/projects"` is frozen at build time, and a save takes a commit plus
 * a Vercel build (docs/admin-plan.md §2). Computing the second of two edits from
 * the build-time array would serialize the state *before* the first edit and
 * silently revert it. Reading the repo means consecutive edits compose, and the
 * blob sha carried alongside is what still catches a genuine concurrent edit from
 * another device.
 */

export interface ProjectsFile {
    projects: Project[];
    /** Blob sha to pass back on save. Null when the file was not read from the repo. */
    sha: string | null;
    /**
     * Where the data came from. `"build"` means `GITHUB_ADMIN_TOKEN` is unset, so
     * the console is showing the deployed snapshot and cannot save — the UI says
     * so rather than letting a save fail at the last step.
     */
    source: "repo" | "build";
}

export async function loadProjectsFile(): Promise<ProjectsFile> {
    if (!isGithubWriteConfigured()) {
        return { projects: builtInProjects, sha: null, source: "build" };
    }

    const file = await readFile({ kind: "known", key: "projects" });

    if (!file) {
        /*
         * The path is in the allowlist and the repo is this one, so a 404 here
         * means the file was deleted or the token cannot see the repository.
         * Either way, showing the build-time copy would invite a save that
         * recreates the file from stale data.
         */
        throw new Error(
            "data/projects.ts was not found in the repository. Check that GITHUB_ADMIN_TOKEN " +
                "can read this repo's contents.",
        );
    }

    return { projects: parseProjects(file.text), sha: file.sha, source: "repo" };
}

/**
 * Sorts by the curated `order` key, the way `services/projectService.ts` does.
 *
 * The console lists projects in the order the site renders them, because that is
 * what the operator is reasoning about when they reorder. `Infinity` for an
 * absent `order` keeps unordered entries last rather than first.
 */
export function inDisplayOrder(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
}

/**
 * Renumbers `order` as 1..n over the given sequence.
 *
 * Used by both the reorder action and the delete action — after removing entry 4,
 * leaving a gap at 4 would be harmless to rendering and confusing to read, and
 * the next drag would produce a diff full of unrelated renumbering.
 */
export function renumber(projects: Project[]): Project[] {
    return projects.map((project, index) => ({ ...project, order: index + 1 }));
}
