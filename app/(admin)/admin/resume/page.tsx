import { ExternalLink } from "lucide-react";
import { verifySession } from "@/lib/admin/dal";
import { isGithubWriteConfigured, recentCommits, WRITABLE_FILES } from "@/lib/admin/github";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import { buildResumeModel } from "@/lib/resume/model";
import { getResumeMeta } from "@/lib/resume/meta";
import { resumeConfig } from "@/data/resume";
import { experience } from "@/data/experience";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResumePanel } from "@/components/admin/ResumePanel";
import { ReadOnlyNotice } from "@/components/admin/ReadOnlyNotice";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";

/**
 * Résumé management (docs/admin-plan.md §7.5).
 *
 * The "what will be on it" panel exists because the curation in
 * `data/resume.ts` omits things silently by design — two of three roles, four of
 * twelve projects. An omission the operator cannot see is one they will not
 * notice is wrong, so the counts are stated before anything is rendered.
 */
export default async function ResumePage() {
    await verifySession();

    const meta = getResumeMeta();
    const file = await loadProjectsFile();
    const model = buildResumeModel(file.projects, resumeConfig);

    const history = isGithubWriteConfigured()
        ? await recentCommits({ path: WRITABLE_FILES.resumePdf, limit: 1 })
        : [];

    return (
        <AdminShell
            eyebrow="Résumé"
            title="resume.pdf"
            description="One page, A4, set in the site's own three faces. Regenerating renders a preview; committing is a separate, explicit press."
        >
            {file.source === "build" && <ReadOnlyNotice />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Current size" value={meta.sizeLabel || "missing"} />
                <Stat
                    label="Last changed"
                    value={history[0] ? formatDateTime(history[0].date) : "unknown"}
                />
                <Stat
                    label="Projects on it"
                    value={`${model.projects.length} of ${file.projects.length}`}
                />
                <Stat
                    label="Roles on it"
                    value={`${model.experience.length} of ${experience.length}`}
                />
            </div>

            <p className="text-xs leading-relaxed text-ink-muted">
                The size shown on the site is measured off the real file at build time by{" "}
                <code className="font-mono">lib/resume/meta.ts</code>, so it cannot drift from the
                artifact — there is nothing to keep in sync after a commit.{" "}
                <a
                    href={meta.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bp-focus inline-flex items-center gap-1 rounded-sm text-accent underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                >
                    Open the published PDF
                    <ExternalLink size={11} aria-hidden="true" />
                </a>
            </p>

            <ResumePanel canWrite={file.source === "repo"} />

            <section className="flex flex-col gap-2">
                <h2 className="bp-meta text-ink-muted">Curation</h2>
                <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
                    <Row term="maxProjects" detail={String(resumeConfig.maxProjects)} />
                    <Row term="maxRoles" detail={String(resumeConfig.maxRoles)} />
                    <Row term="maxBulletsPerRole" detail={String(resumeConfig.maxBulletsPerRole)} />
                    <Row
                        term="projectSummaryMaxChars"
                        detail={String(resumeConfig.projectSummaryMaxChars)}
                    />
                    <Row term="skillCategories" detail={resumeConfig.skillCategories.join(", ")} />
                    <Row
                        term="includeQrCode"
                        detail={resumeConfig.includeQrCode ? "yes — footer, 14 mm" : "no"}
                    />
                </dl>
                <p className="text-xs leading-relaxed text-ink-muted">
                    Edited in <code className="font-mono">data/resume.ts</code>. These are the
                    levers for the one-page target — not the type size, which is already at the
                    floor of what prints legibly.
                </p>
            </section>
        </AdminShell>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <Card plain className="flex flex-col gap-1 p-4">
            <span className="bp-meta text-ink-muted">{label}</span>
            <span className="font-display text-base font-bold text-ink">{value}</span>
        </Card>
    );
}

function Row({ term, detail }: { term: string; detail: string }) {
    return (
        <>
            <dt className="font-mono text-xs text-ink-muted">{term}</dt>
            <dd className="text-sm text-ink">{detail}</dd>
        </>
    );
}
