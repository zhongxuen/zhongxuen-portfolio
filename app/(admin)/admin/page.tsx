import Link from "next/link";
import {
    Activity,
    BriefcaseBusiness,
    CircleCheck,
    ExternalLink,
    FileText,
    FolderGit2,
    GitCommitHorizontal,
    RefreshCw,
    Settings,
    Stethoscope,
    TriangleAlert,
} from "lucide-react";
import { verifySession } from "@/lib/admin/dal";
import { isGithubWriteConfigured, recentCommits, WRITABLE_FILES } from "@/lib/admin/github";
import { pageTraffic, viewsBySlug } from "@/lib/admin/analytics";
import { deliveryHealth } from "@/lib/admin/deliveries";
import { latestProductionDeployment } from "@/lib/admin/vercel";
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
    const writeReady = isGithubWriteConfigured();

    /*
     * Four independent reads — GitHub twice, Vercel twice — awaited together.
     * Sequentially they would make the dashboard four round trips deep for data
     * that has no ordering between its parts, and every one of them already
     * degrades to null or [] on its own rather than failing the page.
     */
    const [commits, deployment, traffic] = await Promise.all([
        recentCommits({ limit: 5 }),
        latestProductionDeployment(),
        pageTraffic(),
    ]);

    const views = viewsBySlug(traffic);
    const mail = deliveryHealth();

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

            {mail.allFailing && (
                <Card className="border-danger/40 bg-danger/8">
                    <div className="flex items-start gap-3">
                        <TriangleAlert
                            size={18}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-danger"
                        />
                        <div className="text-sm leading-relaxed text-ink">
                            <p className="font-medium">
                                Every contact-form delivery on record has failed.
                            </p>
                            <p className="mt-1 text-ink-muted">
                                Enquiries are being lost right now. Check{" "}
                                <code className="font-mono text-xs">RESEND_API_KEY</code> and the
                                verified sender — details on{" "}
                                <Link href="/admin/health" className="text-accent underline">
                                    Health
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {deployment && deployment.state === "error" && (
                <Card className="border-danger/40 bg-danger/8">
                    <div className="flex items-start gap-3">
                        <TriangleAlert
                            size={18}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-danger"
                        />
                        <div className="text-sm leading-relaxed text-ink">
                            <p className="font-medium">The most recent production build failed.</p>
                            <p className="mt-1 text-ink-muted">
                                The live site is still serving an older deploy, so the last thing
                                committed is <em>not</em> what visitors are seeing.
                                {deployment.message
                                    ? ` Last attempt: "${deployment.message}".`
                                    : ""}{" "}
                                {deployment.inspectorUrl && (
                                    <a
                                        href={deployment.inspectorUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-accent underline"
                                    >
                                        Build log
                                    </a>
                                )}
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
                    href="/admin/career"
                    icon={BriefcaseBusiness}
                    title="Career"
                    description="Experience, education, skills and certifications — everything the résumé is built from."
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
                <Action
                    href="/admin/health"
                    icon={Stethoscope}
                    title="Health"
                    description="Dead links, missing screenshots, and whether the contact form is actually sending."
                />
            </div>

            {traffic && (
                <section className="flex flex-col gap-3">
                    <h2 className="bp-meta text-ink-muted">
                        Project traffic · last {traffic.days} days
                    </h2>

                    {views.size === 0 ? (
                        <p className="text-sm text-ink-muted">
                            No project-page views recorded yet. Web Analytics has to be enabled on
                            the Vercel project, and a brand-new deployment has nothing to report.
                        </p>
                    ) : (
                        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                            {projects
                                .map((project) => ({
                                    project,
                                    count: views.get(project.slug) ?? 0,
                                }))
                                .sort((a, b) => b.count - a.count)
                                .map(({ project, count }, index, rows) => (
                                    <li
                                        key={project.slug}
                                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
                                    >
                                        <span className="w-10 shrink-0 text-right font-mono text-sm text-ink">
                                            {count}
                                        </span>

                                        {/*
                                         * A bar, scaled to the most-viewed entry rather
                                         * than to a fixed maximum. The comparison that
                                         * matters here is between projects, and an
                                         * absolute scale would render every row as a
                                         * stub on a site with modest traffic.
                                         */}
                                        <span
                                            aria-hidden="true"
                                            className="h-1 shrink-0 rounded-full bg-accent/70"
                                            style={{
                                                width: `${rows[0].count > 0 ? Math.max(2, (count / rows[0].count) * 100) : 2}px`,
                                            }}
                                        />

                                        <Link
                                            href={`/admin/projects/${project.slug}`}
                                            className="bp-focus min-w-0 flex-1 rounded-sm text-sm text-ink transition-colors duration-fast ease-bp hover:text-accent"
                                        >
                                            {project.title}
                                        </Link>

                                        {project.featured && (
                                            <span className="bp-meta shrink-0 text-ink-muted">
                                                featured
                                            </span>
                                        )}
                                    </li>
                                ))}
                        </ul>
                    )}

                    <p className="text-xs text-ink-muted">
                        The decision made most often in this console is which projects to feature
                        and in what order. This is the only screen that says anything about whether
                        anyone is reading them.
                    </p>
                </section>
            )}

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

                {deployment && deployment.state !== "unknown" && (
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        {deployment.state === "ready" ? (
                            <>
                                <CircleCheck
                                    size={13}
                                    aria-hidden="true"
                                    className="shrink-0 text-success"
                                />
                                <span className="text-ink-muted">
                                    Production is live on{" "}
                                    <code className="font-mono">
                                        {deployment.sha?.slice(0, 7) ?? "the latest build"}
                                    </code>
                                    {deployment.createdAt
                                        ? `, built ${formatDateTime(new Date(deployment.createdAt).toISOString())}`
                                        : ""}
                                    .
                                </span>
                            </>
                        ) : (
                            <>
                                <Activity
                                    size={13}
                                    aria-hidden="true"
                                    className="shrink-0 text-signal"
                                />
                                <span className="text-ink-muted">
                                    The latest production deployment is {deployment.state}.
                                </span>
                            </>
                        )}
                    </p>
                )}

                <p className="text-xs text-ink-muted">
                    Every save from this console is one of these. <code>git revert</code> is the
                    undo button, and this list is the audit log for <em>writes</em>. Access — who
                    signed in, and who failed to — is logged separately and read with{" "}
                    <code>vercel logs</code>; see <code>lib/admin/audit.ts</code>.
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
