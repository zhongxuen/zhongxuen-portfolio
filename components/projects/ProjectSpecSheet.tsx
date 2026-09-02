import { ExternalLink } from "lucide-react";
import type { Project } from "@/types/project";
import { formatMonthYear } from "@/lib/utils";

export interface ProjectSpecSheetProps {
    project: Project;
}

/**
 * Trims a URL to the part worth reading in a narrow rail:
 * `https://github.com/owner/repo` → `owner/repo`, `https://x.vercel.app/` →
 * `x.vercel.app`. Anything unparseable renders as-is.
 *
 * Dropping the forge's own domain is not cosmetic here: the row is already
 * labelled REPO and carries a GitHub icon in the header above it, and the
 * eleven characters it saves are two of the four lines the full URL was
 * wrapping to in the sticky spec sheet.
 */
function shortenUrl(url: string): string {
    try {
        const { hostname, pathname } = new URL(url);
        const host = hostname.replace(/^www\./, "");
        const path = pathname.replace(/\/$/, "");

        return host === "github.com" ? path.replace(/^\//, "") : `${host}${path}`;
    } catch {
        return url;
    }
}

interface SpecRow {
    key: string;
    value: React.ReactNode;
}

/**
 * The drafting spec sheet in the detail page's left rail (docs/uiux.md §4.6).
 *
 * This replaces the old "Project snapshot" card, whose three lines were generic
 * filler restating the stack in prose. Everything here is a fact already in
 * data/projects.ts or synced from GitHub, and a row with no data is dropped
 * rather than rendered blank — a spec sheet with empty fields reads as an
 * unfinished form, not as a project with fewer attributes.
 *
 * STATUS is derived rather than stored, from the two links that actually exist:
 * a live URL means it is running somewhere, a repo alone means the source is
 * readable, and neither means the artifact is private.
 */
export function ProjectSpecSheet({ project }: ProjectSpecSheetProps) {
    const status = project.liveUrl
        ? "Deployed"
        : project.githubUrl
          ? "Source available"
          : "Private build";

    const candidates: (SpecRow | undefined)[] = [
        project.role ? { key: "Role", value: project.role } : undefined,
        { key: "Stack", value: project.technologies.join(" · ") },
        { key: "Status", value: status },
        project.githubUrl
            ? {
                  key: "Repo",
                  value: (
                      <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bp-focus inline-flex items-center gap-1 text-accent break-all hover:underline"
                      >
                          {shortenUrl(project.githubUrl)}
                          <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
                      </a>
                  ),
              }
            : undefined,
        project.liveUrl
            ? {
                  key: "Live",
                  value: (
                      <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bp-focus inline-flex items-center gap-1 text-accent break-all hover:underline"
                      >
                          {shortenUrl(project.liveUrl)}
                          <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
                      </a>
                  ),
              }
            : undefined,
        project.lastUpdated
            ? { key: "Updated", value: formatMonthYear(project.lastUpdated) }
            : undefined,
    ];

    const rows = candidates.filter((row): row is SpecRow => Boolean(row));

    return (
        <div className="bp-ticks rounded-xl border border-line bg-surface p-5">
            <h2 className="bp-meta mb-4 text-ink-muted">Specification</h2>

            <dl className="flex flex-col">
                {rows.map((row, index) => (
                    <div
                        key={row.key}
                        className={
                            index === 0
                                ? "grid grid-cols-[5.5rem_1fr] gap-3 py-2"
                                : "grid grid-cols-[5.5rem_1fr] gap-3 border-t border-line py-2"
                        }
                    >
                        <dt className="bp-meta pt-0.5 text-ink-muted">{row.key}</dt>
                        <dd className="font-mono text-sm text-ink">{row.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
