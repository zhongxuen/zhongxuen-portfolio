import { fetchUserRepos, fetchRepo, GitHubRepo } from "@/lib/github";
import { AUTHOR } from "@/lib/constants";

/**
 * Application-level GitHub service.
 *
 * Wraps lib/github.ts with the specific filtering/sorting rules this
 * portfolio needs (exclude forks/archived, sort by activity, etc.),
 * keeping that policy out of the raw API client and out of components.
 */

/**
 * Returns all non-fork, non-archived repositories for the configured
 * portfolio author, sorted by most recently pushed.
 */
export async function getPortfolioRepos(): Promise<GitHubRepo[]> {
    const repos = await fetchUserRepos(AUTHOR.githubUsername);

    return repos
        .filter((repo) => !repo.fork && !repo.archived)
        .sort(
            (a, b) =>
                new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
        );
}

/**
 * Returns a single repository by name for the configured portfolio author.
 * Used when a local project entry needs to be enriched with live GitHub stats.
 */
export async function getRepoByName(repoName: string): Promise<GitHubRepo | null> {
    return fetchRepo(AUTHOR.githubUsername, repoName);
}

/**
 * Returns repositories matching a given list of names, preserving the
 * input order. Repos that fail to fetch or don't exist are silently
 * omitted (hybrid model: local data remains valid even if GitHub sync
 * partially fails).
 */
export async function getReposByNames(
    repoNames: string[]
): Promise<GitHubRepo[]> {
    const results = await Promise.all(
        repoNames.map((name) => getRepoByName(name))
    );

    return results.filter((repo): repo is GitHubRepo => repo !== null);
}