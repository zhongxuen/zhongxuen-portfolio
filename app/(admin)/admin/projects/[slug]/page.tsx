import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { verifySession } from "@/lib/admin/dal";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import { NEW_PROJECT_SLUG } from "@/lib/admin/projectForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import { ReadOnlyNotice } from "@/components/admin/ReadOnlyNotice";
import { Button } from "@/components/ui/Button";

/**
 * Project editor, and the create form (docs/admin-plan.md §7.3).
 *
 * `slug === "new"` is the create route. A sentinel rather than a separate
 * `/admin/projects/new/page.tsx` because the form is identical either way —
 * splitting the route would mean two copies of a thirty-field form, and
 * `validateProject` rejects "new" as a real slug so the sentinel can never
 * collide with a project.
 */
export default async function ProjectEditorPage({ params }: { params: Promise<{ slug: string }> }) {
    await verifySession();

    const { slug } = await params;
    const file = await loadProjectsFile();

    const isCreate = slug === NEW_PROJECT_SLUG;
    const project = isCreate ? undefined : file.projects.find((entry) => entry.slug === slug);

    if (!isCreate && !project) {
        notFound();
    }

    return (
        <AdminShell
            eyebrow={isCreate ? "New project" : "Edit project"}
            title={project?.title ?? "New project"}
            description={
                isCreate
                    ? "Appended to the end of the list. Reorder it from the projects page afterwards."
                    : `Editing entry ${project?.order ?? "—"} of ${file.projects.length}.`
            }
            actions={
                <Button href="/admin/projects" variant="secondary" size="sm">
                    <ArrowLeft size={15} aria-hidden="true" />
                    All projects
                </Button>
            }
        >
            {file.source === "build" && <ReadOnlyNotice />}

            <ProjectEditor project={project} canWrite={file.source === "repo"} />
        </AdminShell>
    );
}
