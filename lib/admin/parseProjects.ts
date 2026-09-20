import { ModuleSourceError, parseModule } from "@/lib/admin/parseModule";
import type { Project } from "@/types/project";

/**
 * Reads the text of `data/projects.ts` back into `Project[]`.
 *
 * The scanner that does the work now lives in `lib/admin/parseModule.ts`, shared
 * with the career files; what remains here is the part that is genuinely about
 * projects — the declaration to anchor on and the set of keys an entry may
 * carry. See that module for why nothing is evaluated and why an unknown field
 * is a hard failure rather than a shrug.
 *
 * `tests/lib/parseProjects.test.ts` round-trips the real file through this and
 * `serializeProjects`, which is what catches `KNOWN_KEYS` falling behind
 * `types/project.ts`.
 */

/**
 * Kept as a named export because it is what the tests assert on and what the
 * project actions match. It is the shared error class, not a subclass: the
 * message already names the file, so a second layer would only repeat it.
 */
export { ModuleSourceError as ProjectSourceError };

/**
 * Keys a `Project` may carry in the file.
 *
 * Restated rather than derived, because a type cannot be enumerated at runtime.
 * The round-trip test is what keeps it honest.
 */
const KNOWN_KEYS = [
    "slug",
    "title",
    "description",
    "longDescription",
    "testCredentials",
    "role",
    "technologies",
    "githubUrl",
    "githubRepo",
    "liveUrl",
    "screenshots",
    "keyFeatures",
    "disclaimers",
    "challenges",
    "lessonsLearned",
    "futureImprovements",
    "featured",
    "order",
] as const;

export const PROJECTS_SHAPE = {
    file: "data/projects.ts",
    declaration: "export const projects: Project[] = [",
    known: KNOWN_KEYS,
    required: ["slug", "title", "description"],
    requiredArrays: ["technologies"],
} as const;

export function parseProjects(source: string): Project[] {
    return parseModule<Project>(source, PROJECTS_SHAPE);
}
