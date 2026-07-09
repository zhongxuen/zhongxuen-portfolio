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
): Pick<Project, "githubUrl" | "language" | "stars" | "lastUpdated"> {
    return {
        githubUrl: repo.html_url,
        language: repo.language ?? undefined,
        stars: repo.stargazers_count,
        lastUpdated: repo.pushed_at,
    };
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

    return {
        ...localProject,
        ...extractGitHubFields(repo),
    };
}

/**
 * Merges an array of local projects with fetched GitHub repos, matching
 * by repo name embedded in the project's githubUrl (last path segment).
 * Projects with no matching repo are returned as-is (graceful degradation).
 */
export function mergeProjectsWithRepos(
    localProjects: Project[],
    repos: GitHubRepo[]
): Project[] {
    const repoByName = new Map(repos.map((repo) => [repo.name, repo]));

    return localProjects.map((project) => {
        const repoName = project.githubUrl.split("/").filter(Boolean).pop();
        const matchingRepo = repoName ? repoByName.get(repoName) : undefined;

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