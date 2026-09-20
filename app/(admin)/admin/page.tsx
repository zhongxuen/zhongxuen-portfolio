import Link from "next/link";
import {
    ExternalLink,
    FileText,
    FolderGit2,
    GitCommitHorizontal,
    RefreshCw,
    Settings,
    TriangleAlert,
} from "lucide-react";
import { verifySession } from "@/lib/admin/dal";
import { isGithubWriteConfigured, recentCommits, WRITABLE_FILES } from "@/lib/admin/github";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { projects } from "@/data/projects";
import { getResumeMeta } from "@/lib/resume/meta";
import { formatDateTime } from "@/lib/utils";

/**
 * The console's landing page (docs/admin-plan.md §7.1).
 *
 * Counts come from `data/projects.ts` directly rather than from
 * `getProjects()`: the console edits the *file*, so the numbers it reports must
 * be the file's, not the file merged with an hour-old GitHub overlay. A featured
 * count that disagrees with what the editor is about to save would be worse than
 * no count.
 */
export default async function AdminDashboard() {
    await verifySession();

    const resume = getResumeMeta();
    const commits = await recentCommits({ limit: 5 });
    const writeReady = isGithubWriteConfigured();

    const screenshots = projects.reduce(
        (total, project) => total + (project.screenshots?.length ?? 0),
        0,
    );

    return (
        <AdminShell
            eyebrow="Dashboard"
            title="Portfolio console"
            description="Edits here are commits to main. The public site follows about a minute later."
        >
            {!writeReady && (
                <Card className="border-signal/40 bg-signal/8">
                    <div className="flex items-start gap-3">
                        <TriangleAlert
                            size={18}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-signal"
                        />
                        <div className="text-sm leading-relaxed text-ink">
                            <p className="font-medium">GITHUB_ADMIN_TOKEN is not set.</p>
                            <p className="mt-1 text-ink-muted">
                                Everything here loads and reads, and every save will fail. Add a
                                fine-grained PAT scoped to this repository with Contents: Read and
                                write, then redeploy.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Projects" value={String(projects.length)} />
                <Stat
                    label="Featured"
                    value={String(projects.filter((project) => project.featured).length)}
                />
                <Stat label="Screenshots" value={String(screenshots)} />
                <Stat label="Résumé" value={resume.sizeLabel || "missing"} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Action
                    href="/admin/projects"
                    icon={FolderGit2}
                    title="Edit projects"
                    description="Add, edit, reorder and remove entries. Screenshots upload from the editor."
                />
                <Action
                    href="/admin/sync"
                    icon={RefreshCw}
                    title="Sync from GitHub"
                    description="Pull live repos, review the diff, apply what you want in one commit."
                />
                <Action
                    href="/admin/resume"
                    icon={FileText}
                    title="Résumé"
                    description="Upload a replacement, or regenerate the PDF from this site's own data."
                />
                <Action
                    href="/admin/settings"
                    icon={Settings}
                    title="Settings"
                    description="Availability pill, the NOW block, the sitemap's last-modified date."
                />
            </div>

            <section className="flex flex-col gap-3">
                <h2 className="bp-meta text-ink-muted">Recent commits</h2>

                {commits.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                        No commit history available — GitHub did not answer, or the token is unset.
                    </p>
                ) : (
                    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                        {commits.map((commit) => (
                            <li key={commit.sha} className="flex flex-col gap-1 px-4 py-3">
                                <a
                                    href={commit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bp-focus flex items-start gap-2 rounded-sm text-sm text-ink transition-colors duration-fast ease-bp hover:text-accent"
                                >
                                    <GitCommitHorizontal
                                        size={15}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0 text-ink-muted"
                                    />
                                    <span className="min-w-0 flex-1">{commit.message}</span>
                                    <ExternalLink
                                        size={12}
                                        aria-hidden="true"
                                        className="mt-1 shrink-0 text-ink-muted"
                                    />
                                </a>
                                <p className="pl-[23px] font-mono text-xs text-ink-muted">
                                    {commit.sha.slice(0, 7)} · {formatDateTime(commit.date)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="text-xs text-ink-muted">
                    Every save from this console is one of these. <code>git revert</code> is the
                    undo button, and this list is the audit log — there was no feature to build.
                </p>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="bp-meta text-ink-muted">Writable files</h2>
                <ul className="flex flex-wrap gap-2">
                    {Object.values(WRITABLE_FILES).map((path) => (
                        <li
                            key={path}
                            className="rounded-xs border border-line bg-surface-alt px-2 py-0.5 font-mono text-xs text-ink-muted"
                        >
                            {path}
                        </li>
                    ))}
                    <li className="rounded-xs border border-line bg-surface-alt px-2 py-0.5 font-mono text-xs text-ink-muted">
                        public/images/projects/*
                    </li>
                </ul>
                <p className="text-xs text-ink-muted">
                    The complete allowlist. Nothing else in the repository is reachable from this
                    console — see <code>WriteTarget</code> in <code>lib/admin/github.ts</code>.
                </p>
            </section>
        </AdminShell>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <Card plain className="flex flex-col gap-1 p-4">
            <span className="bp-meta text-ink-muted">{label}</span>
            <span className="font-display text-h3 font-bold text-ink">{value}</span>
        </Card>
    );
}

function Action({
    href,
    icon: Icon,
    title,
    description,
}: {
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: "true" }>;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="bp-focus group/action flex items-start gap-3.5 rounded-xl border border-line bg-surface p-5 transition-[border-color,background-color] duration-fast ease-bp hover:border-line-strong hover:bg-surface-alt"
        >
            <Icon
                size={20}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-ink-muted transition-colors duration-fast ease-bp group-hover/action:text-accent"
            />
            <span className="min-w-0">
                <span className="block font-display text-base font-medium text-ink">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
                    {description}
                </span>
            </span>
        </Link>
    );
}
