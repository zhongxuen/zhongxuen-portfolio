import { Plus } from "lucide-react";
import { verifySession } from "@/lib/admin/dal";
import { inDisplayOrder, loadProjectsFile } from "@/lib/admin/projectStore";
import { getPortfolioRepos } from "@/services/githubService";
import { normalizeRepoKey } from "@/adapters/githubProjectAdapter";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProjectTable, type ProjectRow } from "@/components/admin/ProjectTable";
import { ReadOnlyNotice } from "@/components/admin/ReadOnlyNotice";
import { Button } from "@/components/ui/Button";
import { NEW_PROJECT_SLUG } from "@/lib/admin/projectForm";

/**
 * Project list and reorder (docs/admin-plan.md §7.2).
 *
 * The repo match column reuses `getPortfolioRepos()` and the same normalization
 * `adapters/githubProjectAdapter.ts` uses, rather than inventing a second
 * matching rule — a console that disagrees with the renderer about whether a
 * project has a repo would be worse than no column.
 */
export default async function ProjectsPage() {
    await verifySession();

    const file = await loadProjectsFile();
    const repos = await getPortfolioRepos();
    const repoKeys = new Set(repos.map((repo) => normalizeRepoKey(repo.name)));

    const rows: ProjectRow[] = inDisplayOrder(file.projects).map((project) => ({
        slug: project.slug,
        title: project.title,
        featured: Boolean(project.featured),
        order: project.order,
        screenshots: project.screenshots?.length ?? 0,
        repo: !project.githubRepo
            ? "none"
            : repoKeys.has(normalizeRepoKey(project.githubRepo))
              ? "matched"
              : "missing",
    }));

    return (
        <AdminShell
            eyebrow="Projects"
            title={`${rows.length} projects`}
            description="Order here is the order the homepage and /projects render in. Reordering rewrites the `order` field across every entry in one commit."
            actions={
                <Button href={`/admin/projects/${NEW_PROJECT_SLUG}`} variant="primary" size="sm">
                    <Plus size={15} aria-hidden="true" />
                    New project
                </Button>
            }
        >
            {file.source === "build" && <ReadOnlyNotice />}

            <ProjectTable rows={rows} canWrite={file.source === "repo"} />

            {repos.length === 0 && (
                <p className="text-xs text-ink-muted">
                    GitHub did not return any repositories, so every repo state above reads as not
                    found. That is a rate limit or a network failure, not a set of missing repos —
                    check before acting on it.
                </p>
            )}
        </AdminShell>
    );
}
