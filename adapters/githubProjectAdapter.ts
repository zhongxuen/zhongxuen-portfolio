import { Project } from "@/types/project";
import { GitHubRepo } from "@/lib/github";

/**
 * Converts GitHub-derived fields into the shared Project shape.
 *
 * Hybrid model (per instructions.md): local data/projects.ts is the sole
 * source of truth for which projects exist and for their narrative content
 * (description, keyFeatures, challenges, lessonsLearned, futureImprovements).
 * This adapter only overlays GitHub-sourced stats (language, stars,
 * lastUpdated, publishedAt, githubUrl) onto a matching local project — it never invents
 * a project and never fabricates narrative fields.
 */

/**
 * Extracts the GitHub-derived subset of Project fields from a repo response.
 */
function extractGitHubFields(
    repo: GitHubRepo
): Pick<
    Project,
    "githubUrl" | "liveUrl" | "language" | "stars" | "lastUpdated" | "publishedAt"
> {
    return {
        githubUrl: repo.html_url,
        liveUrl: repo.homepage?.trim() || undefined,
        language: repo.language ?? undefined,
        stars: repo.stargazers_count,
        lastUpdated: repo.pushed_at,
        publishedAt: repo.created_at,
    };
}

/**
 * Reduces a repo name or slug to a comparable key, so that casing and
 * separator differences ("IT-ticket-helpdesk-system" vs "it_ticket_helpdesk_system")
 * still match.
 */
function normalizeName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Builds a lookup of normalized repo identifiers → repo, accepting both the
 * bare name ("ai-code-visualizer") and the owner-qualified full name
 * ("zhongxuen/ai-code-visualizer"). Earlier repos win on collision, and the
 * service layer hands them over sorted by most recent push.
 */
function indexReposByIdentifier(repos: GitHubRepo[]): Map<string, GitHubRepo> {
    const index = new Map<string, GitHubRepo>();

    for (const repo of repos) {
        for (const identifier of [repo.name, repo.full_name]) {
            const normalized = normalizeName(identifier);

            if (normalized && !index.has(normalized)) {
                index.set(normalized, repo);
            }
        }
    }

    return index;
}

/**
 * The identifiers a local project may be known by on GitHub: its configured
 * repo name first, then the repo segment of its GitHub URL. The slug is
 * deliberately not a candidate — slugs are display-oriented and matching on
 * them invites the wrong repo's stats onto a project.
 */
function repoIdentifiersFor(project: Project): string[] {
    const urlSegments = project.githubUrl?.split("/").filter(Boolean) ?? [];
    const urlRepoName = urlSegments.length >= 2 ? urlSegments[urlSegments.length - 1] : undefined;

    return [project.githubRepo, urlRepoName]
        .map((value) => (value?.trim() ? normalizeName(value) : ""))
        .filter((identifier) => identifier.length > 0);
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
 * Enriches the local project list with live GitHub stats.
 *
 * Returns exactly one entry per local project, in the given order: repos with
 * no local counterpart are ignored rather than appended as content-less
 * cards, so the homepage, /projects, the sitemap, and generateStaticParams
 * all agree on the same closed set of slugs whether or not GitHub responds.
 *
 * Matching is exact (after normalization) and each repo is claimed by at most
 * one project, so a project is either enriched with its own repo's stats or
 * left untouched — never overwritten with a near-namesake's URL and stars.
 */
export function mergeProjectsWithRepos(
    localProjects: Project[],
    repos: GitHubRepo[]
): Project[] {
    const reposByIdentifier = indexReposByIdentifier(repos);
    const claimedRepoNames = new Set<string>();

    return localProjects.map((project) => {
        const match = repoIdentifiersFor(project)
            .map((identifier) => reposByIdentifier.get(identifier))
            .find((repo) => repo !== undefined && !claimedRepoNames.has(repo.full_name));

        if (match) {
            claimedRepoNames.add(match.full_name);
        }

        return mergeProjectWithRepo(project, match);
    });
}
