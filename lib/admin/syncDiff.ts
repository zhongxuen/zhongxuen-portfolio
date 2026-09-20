import { normalizeRepoKey } from "@/adapters/githubProjectAdapter";
import { toProjectSlug } from "@/lib/admin/projectForm";
import type { GitHubRepo } from "@/lib/github";
import type { SyncAddition, SyncChange, SyncOrphan, SyncPlan } from "@/types/admin";
import type { Project } from "@/types/project";

/**
 * Diffs the local project list against the live repo list (docs/admin-plan.md §7.4).
 *
 * Pure and I/O-free on purpose: the page fetches, this decides, and
 * tests/lib/syncDiff.test.ts can therefore assert the classification — including
 * the normalization cases the adapter already handles
 * (`IT-ticket-helpdesk-system` vs `it_ticket_helpdesk_system`) — without a
 * network or a fixture server.
 *
 * Matching reuses `normalizeRepoKey` from the adapter rather than defining a
 * second rule. Two rules is how the sync page comes to propose adding a project
 * that already exists under a differently-punctuated name.
 */

/**
 * Builds the plan.
 *
 * `repos` is expected to be `getPortfolioRepos()`, which has already dropped
 * forks and archived repos and sorted by push date. Nothing here re-filters,
 * because "which repos count as portfolio repos" is that service's decision and
 * duplicating it would let the two disagree.
 */
export function buildSyncPlan(projects: Project[], repos: GitHubRepo[]): SyncPlan {
    const claimed = new Set<string>();

    /**
     * Every key a local project may be known by: its configured repo name, and
     * the last segment of its GitHub URL. The slug is deliberately not a
     * candidate — slugs are display-oriented, and matching on them invites the
     * wrong repo onto a project. Same reasoning as the adapter's.
     */
    const keysFor = (project: Project): string[] => {
        const fromUrl = project.githubUrl?.split("/").filter(Boolean).pop();

        return [project.githubRepo, fromUrl]
            .filter((value): value is string => Boolean(value?.trim()))
            .map(normalizeRepoKey)
            .filter((key) => key.length > 0);
    };

    const reposByKey = new Map<string, GitHubRepo>();

    for (const repo of repos) {
        for (const identifier of [repo.name, repo.full_name]) {
            const key = normalizeRepoKey(identifier);

            if (key && !reposByKey.has(key)) {
                reposByKey.set(key, repo);
            }
        }
    }

    const changed: SyncChange[] = [];
    const orphaned: SyncOrphan[] = [];

    for (const project of projects) {
        const keys = keysFor(project);
        const match = keys.map((key) => reposByKey.get(key)).find((repo) => repo !== undefined);

        if (!match) {
            /*
             * Only a project that *claims* a repo can be orphaned. An entry with
             * no githubRepo and no githubUrl — the Botpress chatbot, built in a
             * hosted studio — has no repository to have lost, and flagging it
             * every time the page loads would train the operator to ignore the
             * column.
             */
            if (project.githubRepo) {
                orphaned.push({
                    kind: "orphaned",
                    slug: project.slug,
                    title: project.title,
                    githubRepo: project.githubRepo,
                });
            }

            continue;
        }

        claimed.add(match.full_name);

        const homepage = match.homepage?.trim();

        /*
         * A repo homepage that disagrees with the stored liveUrl. Proposed, not
         * applied: the stored value wins today in
         * `adapters/githubProjectAdapter.ts` (`localProject.liveUrl ||
         * githubFields.liveUrl`), and several entries deliberately point at a
         * demo path — `?demo=1` — that the repo's homepage field does not carry.
         */
        if (homepage && homepage !== project.liveUrl) {
            changed.push({
                kind: "changed",
                slug: project.slug,
                title: project.title,
                field: "liveUrl",
                current: project.liveUrl,
                proposed: homepage,
            });
        }

        if (!project.githubUrl) {
            changed.push({
                kind: "changed",
                slug: project.slug,
                title: project.title,
                field: "githubUrl",
                proposed: match.html_url,
            });
        }
    }

    const added: SyncAddition[] = repos
        .filter((repo) => !claimed.has(repo.full_name))
        .map((repo) => proposeAddition(repo));

    return { added, changed, orphaned };
}

/**
 * Turns an unlisted repo into a proposed new entry.
 *
 * The adapter's principle holds: GitHub supplies stats and identity, never
 * narrative. So the description is the repo's own one-liner and nothing is
 * invented; if the repo has no description the field says so plainly rather than
 * being filled with a sentence about a project this code has not seen. It arrives
 * `featured: false` and stays that way until you say otherwise.
 */
function proposeAddition(repo: GitHubRepo): SyncAddition {
    const technologies = [repo.language, ...(repo.topics ?? [])]
        .filter((value): value is string => Boolean(value))
        /*
         * Topics are lowercase-hyphenated by GitHub ("tailwind-css"), which is not
         * how `data/projects.ts` spells anything. They are seeded anyway because
         * editing a wrong chip is faster than remembering a missing one — but they
         * are title-cased so the mismatch is visible in the diff rather than
         * quietly breaking the /projects technology filter, which groups by exact
         * string.
         */
        .map(titleCase)
        /*
         * Case-insensitive dedup, first occurrence wins. `language` is listed
         * first and GitHub spells it the way the ecosystem does ("TypeScript"),
         * while the matching topic arrives lowercase and title-cases to
         * "Typescript" — a case-sensitive dedup keeps both and puts two chips
         * for one technology on the card.
         */
        .filter(
            (value, index, all) =>
                all.findIndex((other) => other.toLowerCase() === value.toLowerCase()) === index,
        );

    return {
        kind: "added",
        slug: toProjectSlug(repo.name),
        title: repo.name,
        description: repo.description?.trim() || "No description — write one before publishing.",
        technologies,
        githubUrl: repo.html_url,
        githubRepo: repo.name,
        liveUrl: repo.homepage?.trim() || undefined,
    };
}

function titleCase(value: string): string {
    return value
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * Applies a selection of plan entries to the project list.
 *
 * Pure, and separate from the action, so the "apply exactly what was ticked"
 * logic is testable. Orphans are never applied — they carry no change, only a
 * flag, and auto-deleting a project because GitHub made its repo private for an
 * afternoon is the one thing this feature must not do.
 */
export function applySyncPlan(
    projects: Project[],
    plan: SyncPlan,
    selected: Set<string>,
): Project[] {
    let next = projects.map((project) => ({ ...project }));

    for (const change of plan.changed) {
        if (!selected.has(`changed:${change.slug}:${change.field}`)) {
            continue;
        }

        next = next.map((project) =>
            project.slug === change.slug
                ? { ...project, [change.field]: change.proposed }
                : project,
        );
    }

    for (const addition of plan.added) {
        if (!selected.has(`added:${addition.slug}`)) {
            continue;
        }

        /*
         * A slug collision here means the repo did not match any project on repo
         * name but normalizes onto an existing slug. Skipped rather than
         * suffixed: a silent "-2" would publish a second page for the same work.
         */
        if (next.some((project) => project.slug === addition.slug)) {
            continue;
        }

        next.push({
            slug: addition.slug,
            title: addition.title,
            description: addition.description,
            technologies: addition.technologies,
            githubUrl: addition.githubUrl,
            githubRepo: addition.githubRepo,
            ...(addition.liveUrl ? { liveUrl: addition.liveUrl } : {}),
            featured: false,
            order: next.length + 1,
        });
    }

    return next;
}

/** Total entries a plan proposes acting on. Orphans are excluded — they are not actionable. */
export function planSize(plan: SyncPlan): number {
    return plan.added.length + plan.changed.length;
}
