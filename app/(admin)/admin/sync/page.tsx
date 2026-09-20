import { verifySession } from "@/lib/admin/dal";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import { buildSyncPlan } from "@/lib/admin/syncDiff";
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

    return (
        <AdminShell
            eyebrow="Sync"
            title="GitHub sync"
            description="What your repositories say that data/projects.ts does not. Review, tick, apply — one commit."
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
                        {plan.orphaned.length} orphaned
                    </p>

                    <DiffTable plan={plan} canWrite={file.source === "repo"} />

                    <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
                        GitHub supplies stats and identity, never narrative — the same rule
                        <code className="mx-1 font-mono">adapters/githubProjectAdapter.ts</code>
                        follows. A synced project therefore arrives as a stub with real links and an
                        honest description, and stays unfeatured until you say otherwise.
                    </p>
                </>
            )}
        </AdminShell>
    );
}
