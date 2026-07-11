/**
 * Low-level GitHub REST API client.
 *
 * Responsible only for fetching and typing raw GitHub API responses.
 * Business logic (merging, filtering, caching decisions) belongs in
 * services/githubService.ts, not here.
 *
 * Uses unauthenticated requests by default (60 req/hr rate limit).
 * Set GITHUB_TOKEN in .env.local to raise the limit via authenticated requests.
 */

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Shape of the fields we actually use from GitHub's repo response.
 * GitHub returns many more fields; only relevant ones are typed here
 * to keep the contract intentional (per "avoid unnecessary abstractions").
 */
export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
    pushed_at: string;
    fork: boolean;
    archived: boolean;
    topics?: string[];
    homepage: string | null;
}

function buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
        Accept: "application/vnd.github+json",
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
}

/**
 * Fetches all public repositories for a given GitHub username.
 * Returns an empty array on failure rather than throwing, since GitHub
 * data is a progressive enhancement, not a hard dependency (instructions.md:
 * "Assume Supabase is optional" — same philosophy applies to GitHub sync).
 */
export async function fetchUserRepos(username: string): Promise<GitHubRepo[]> {
    try {
        const response = await fetch(
            `${GITHUB_API_BASE}/users/${username}/repos?per_page=100&sort=updated`,
            {
                headers: buildHeaders(),
                next: { revalidate: 3600 }, // ISR: refresh at most once per hour
            }
        );

        if (!response.ok) {
            console.error(`GitHub API error: ${response.status} ${response.statusText}`);
            return [];
        }

        return (await response.json()) as GitHubRepo[];
    } catch (error) {
        console.error("Failed to fetch GitHub repos:", error);
        return [];
    }
}

/**
 * Fetches a single repository by owner/repo name.
 * Returns null on failure or if not found.
 */
export async function fetchRepo(
    owner: string,
    repo: string
): Promise<GitHubRepo | null> {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
            headers: buildHeaders(),
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            console.error(`GitHub API error: ${response.status} ${response.statusText}`);
            return null;
        }

        return (await response.json()) as GitHubRepo;
    } catch (error) {
        console.error(`Failed to fetch GitHub repo ${owner}/${repo}:`, error);
        return null;
    }
}