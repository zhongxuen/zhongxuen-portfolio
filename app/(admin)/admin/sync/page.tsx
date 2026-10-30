import { verifySession } from "@/lib/admin/dal";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import { buildSyncPlan } from "@/lib/admin/syncDiff";
import { loadActivityCommits } from "@/lib/admin/syncNarrative";
import { getPortfolioRepos } from "@/services/githubService";
import { AdminShell } from "@/components/admin/AdminShell";
import { DiffTable } from "@/components/admin/DiffTable";
import { ReadOnlyNotice } from "@/components/admin/ReadOnlyNotice";
import { Card } from "@/components/ui/Card";

/**
 * GitHub sync review (docs/admin-plan.md §7.4).
 *
 * Fetches with the existing `getPortfolioRepos()` — which already drops forks and
 * archived repos and sorts by push date — and diffs with the pure
 * `buildSyncPlan()`. No new fetching code, and the decision logic is testable
 * without a network.
 *
 * Nothing on this page writes. The button posts a selection; the action re-fetches
 * and recomputes before it commits.
 */
export default async function SyncPage() {
    await verifySession();

    const file = await loadProjectsFile();
    const repos = await getPortfolioRepos();
    const plan = buildSyncPlan(file.projects, repos);
    const commits = await loadActivityCommits(plan.activity);

    return (
        <AdminShell
            eyebrow="Sync"
            title="GitHub sync"
            description="What your repositories say that data/projects.ts does not — links, new repos, and work pushed since an entry was last reviewed. Review, tick, apply — one commit."
        >
            {file.source === "build" && <ReadOnlyNotice />}

            {repos.length === 0 ? (
                <Card className="border-signal/40 bg-signal/8">
                    <p className="text-sm leading-relaxed text-ink">
                        GitHub returned no repositories. That is a rate limit or a network failure,
                        not an empty account — so the diff below would read as though every project
                        had lost its repo. Nothing is shown, and nothing can be applied, until the
                        fetch succeeds.
                    </p>
                </Card>
            ) : (
                <>
                    <p className="font-mono text-xs text-ink-muted">
                        {repos.length} repositories · {file.projects.length} entries ·{" "}
                        {plan.added.length} unlisted · {plan.changed.length} changed ·{" "}
                        {plan.activity.length} with new work ·{" "}
                        {plan.orphaned.length} orphaned
                    </p>

                    <DiffTable
                        plan={plan}
                        commits={commits}
                        canWrite={file.source === "repo"}
                    />

                    <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
                        Links and new repos come straight from GitHub. Copy never does on its own: a
                        drafted update is a proposal from the README and commits, shown field by
                        field for you to edit or drop, and nothing reaches
                        <code className="mx-1 font-mono">data/projects.ts</code>
                        until you tick it and apply. A new repo arrives as an unfeatured stub.
                    </p>
                </>
            )}
        </AdminShell>
    );
}
