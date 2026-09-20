import Link from "next/link";
import { verifySession } from "@/lib/admin/dal";
import { loadCareer } from "@/lib/admin/careerStore";
import { isGithubWriteConfigured } from "@/lib/admin/github";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReadOnlyNotice } from "@/components/admin/ReadOnlyNotice";
import {
    CertificationsPanel,
    EducationPanel,
    ExperiencePanel,
    SkillsPanel,
} from "@/components/admin/CareerPanels";

/**
 * The four career lists (docs/admin-plan.md §17.1).
 *
 * **Why this page exists.** Before it, `/admin/resume` could regenerate the PDF
 * and could not edit a word of what went into it: `lib/resume/model.ts` reads
 * `data/experience.ts`, `data/education.ts`, `data/skills.ts` and
 * `data/certifications.ts`, and all four were unreachable from a browser. The
 * console could publish a résumé it could not author.
 *
 * All four load in parallel from the repository (`loadCareer`), for the reason
 * `projectStore` documents: this build's imports were frozen when it was built,
 * and computing a save from them would revert the previous one.
 *
 * Four separate forms rather than one. A single "Save everything" button would
 * make one commit out of four unrelated edits — the git history is the audit log
 * here, and `chore(admin): update experience` is worth more than
 * `chore(admin): update career`. It also means a validation failure in Skills
 * does not throw away unsaved work in Experience.
 */
export default async function CareerPage() {
    await verifySession();

    const canWrite = isGithubWriteConfigured();
    const [experience, education, skills, certifications] = await loadCareer();

    return (
        <AdminShell
            eyebrow="Career"
            title="Experience, education and skills"
            description="The four files behind the CV sections and the generated résumé. Each list is its own commit."
        >
            {!canWrite && <ReadOnlyNotice />}

            <nav aria-label="Career sections" className="flex flex-wrap gap-2">
                {[
                    ["experience", `Experience (${experience.entries.length})`],
                    ["education", `Education (${education.entries.length})`],
                    ["skills", `Skills (${skills.entries.length})`],
                    ["certifications", `Certifications (${certifications.entries.length})`],
                ].map(([anchor, label]) => (
                    <a
                        key={anchor}
                        href={`#${anchor}`}
                        className="bp-focus rounded-xs border border-line px-2.5 py-1 text-xs text-ink-muted transition-colors duration-fast ease-bp hover:border-line-strong hover:text-ink"
                    >
                        {label}
                    </a>
                ))}
            </nav>

            <ExperiencePanel entries={experience.entries} canWrite={canWrite} />
            <EducationPanel entries={education.entries} canWrite={canWrite} />
            <SkillsPanel entries={skills.entries} canWrite={canWrite} />
            <CertificationsPanel entries={certifications.entries} canWrite={canWrite} />

            <p className="border-t border-line pt-5 text-xs leading-relaxed text-ink-muted">
                Changing anything here changes the résumé&rsquo;s contents but not the published PDF
                — that is still a deliberate second step on{" "}
                <Link href="/admin/resume" className="bp-focus rounded-sm text-accent underline">
                    /admin/resume
                </Link>
                , so a half-finished edit is never sent to anyone.
            </p>
        </AdminShell>
    );
}
