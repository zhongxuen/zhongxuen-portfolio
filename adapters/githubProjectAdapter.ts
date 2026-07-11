import { Project } from "@/types/project";
import { GitHubRepo } from "@/lib/github";

/**
 * Converts GitHub-derived fields into the shared Project shape.
 *
 * Hybrid model (per instructions.md): local data/projects.ts remains the
 * source of truth for narrative content (description, keyFeatures,
 * challenges, lessonsLearned, futureImprovements). This adapter only
 * overlays GitHub-sourced stats (language, stars, lastUpdated, githubUrl)
 * onto a matching local project — it never fabricates narrative fields.
 */

/**
 * Extracts the GitHub-derived subset of Project fields from a repo response.
 */
function extractGitHubFields(
    repo: GitHubRepo
): Pick<Project, "githubUrl" | "liveUrl" | "language" | "stars" | "lastUpdated"> {
    return {
        githubUrl: repo.html_url,
        liveUrl: repo.homepage?.trim() || undefined,
        language: repo.language ?? undefined,
        stars: repo.stargazers_count,
        lastUpdated: repo.pushed_at,
    };
}

function normalizeName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findMatchingRepo(project: Project, repos: GitHubRepo[]): GitHubRepo | undefined {
    const explicitCandidates = [project.githubRepo]
        .filter((value): value is string => Boolean(value?.trim()))
        .map(normalizeName);

    const githubPathSegments = project.githubUrl.split("/").filter(Boolean);
    const githubPathRepo = githubPathSegments.length >= 2 ? githubPathSegments[githubPathSegments.length - 1] : undefined;
    const slugCandidate = normalizeName(project.slug);

    const candidates = [
        ...explicitCandidates,
        ...(githubPathRepo ? [normalizeName(githubPathRepo)] : []),
        ...(slugCandidate ? [slugCandidate] : []),
    ].filter(Boolean);

    if (candidates.length === 0) {
        return undefined;
    }

    return repos.find((repo) => {
        const normalizedRepoName = normalizeName(repo.name);
        const normalizedFullName = normalizeName(repo.full_name);

        return candidates.some((candidate) => {
            if (!candidate) {
                return false;
            }

            const repoMatchesCandidate =
                normalizedRepoName === candidate ||
                normalizedRepoName.includes(candidate) ||
                normalizedFullName === candidate ||
                normalizedFullName.includes(candidate) ||
                candidate.includes(normalizedRepoName);

            return repoMatchesCandidate && candidate !== "zhongxuen";
        });
    });
}

/**
 * Merges a single local Project with a matching GitHubRepo, letting
 * GitHub-derived fields take precedence for stats only. If no repo is
 * provided, the local project is returned unchanged.
 */
export function mergeProjectWithRepo(
    localProject: Project,
    repo: GitHubRepo | undefined
): Project {
    if (!repo) {
        return localProject;
    }

    const githubFields = extractGitHubFields(repo);

    return {
        ...localProject,
        ...githubFields,
        liveUrl: localProject.liveUrl || githubFields.liveUrl,
    };
}

/**
 * Merges an array of local projects with fetched GitHub repos, matching
 * by the project's configured repo name, its GitHub URL path, or a slug-based
 * similarity check. Projects with no matching repo are returned as-is.
 */
export function mergeProjectsWithRepos(
    localProjects: Project[],
    repos: GitHubRepo[]
): Project[] {
    return localProjects.map((project) => {
        const matchingRepo = findMatchingRepo(project, repos);
        return mergeProjectWithRepo(project, matchingRepo);
    });
}

/**
 * Converts a GitHub repo directly into a minimal Project shape, for cases
 * where a repo has no corresponding local entry yet (e.g. future full
 * GitHub-sync mode). Narrative fields are left undefined — the UI layer
 * should handle their absence rather than this adapter inventing content.
 */
export function githubRepoToProject(repo: GitHubRepo): Project {
    return {
        slug: repo.name,
        title: repo.name,
        description: repo.description ?? "",
        technologies: repo.topics ?? (repo.language ? [repo.language] : []),
        ...extractGitHubFields(repo),
    };
}