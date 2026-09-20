"use client";

import { useActionState } from "react";
import { ExternalLink, Image as ImageIcon, Info } from "lucide-react";
import { saveProject } from "@/app/(admin)/actions/projects";
import { CheckboxField, Field, controlStyles } from "@/components/admin/Field";
import { ListField } from "@/components/admin/ListField";
import { SaveBar } from "@/components/admin/SaveBar";
import { DeployStatus } from "@/components/admin/DeployStatus";
import { Card } from "@/components/ui/Card";
import {
    DESCRIPTION_SEO_MAX,
    INITIAL_PROJECT_FORM,
    NEW_PROJECT_SLUG,
    PROJECT_LIMITS,
} from "@/lib/admin/projectForm";
import type { Project } from "@/types/project";

/**
 * One form over every field of `types/project.ts` (docs/admin-plan.md §7.3).
 *
 * `project` is undefined for a create. `originalSlug` is a hidden field rather
 * than a bound argument so the form still posts without JavaScript — the same
 * reason `components/forms/ContactForm.tsx` uses `<form action>` and not an
 * onSubmit handler.
 *
 * The array fields are `ListField`s, not comma-separated text. The data model is
 * arrays, and every one of these fields routinely contains commas — the first
 * `keyFeatures` entry in `data/projects.ts` has four. A separator the user has to
 * avoid is a serialization the user has to get right.
 */
export function ProjectEditor({ project, canWrite }: { project?: Project; canWrite: boolean }) {
    const [state, formAction, pending] = useActionState(saveProject, INITIAL_PROJECT_FORM);
    const isCreate = !project;
    const disabled = pending || !canWrite;

    return (
        <form action={formAction} className="flex flex-col gap-6">
            <input type="hidden" name="originalSlug" value={project?.slug ?? NEW_PROJECT_SLUG} />

            <Section
                title="Identity"
                note="The slug is the live URL. Changing it on an existing project turns the old address into a 404 and publishes a new one — no redirect is created."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        name="slug"
                        label="Slug"
                        mono
                        required
                        disabled={disabled}
                        maxLength={PROJECT_LIMITS.slug.max}
                        defaultValue={project?.slug ?? ""}
                        error={state.errors.slug}
                        placeholder="my-project"
                        hint="Lowercase, digits and single hyphens. Becomes /projects/<slug>."
                    />
                    <Field
                        name="title"
                        label="Title"
                        required
                        disabled={disabled}
                        maxLength={PROJECT_LIMITS.title.max}
                        defaultValue={project?.title ?? ""}
                        error={state.errors.title}
                        hint="Shown on the card, the detail page heading and the ⌘K palette."
                    />
                </div>

                <Field
                    name="description"
                    label="Description"
                    multiline
                    rows={3}
                    required
                    disabled={disabled}
                    maxLength={PROJECT_LIMITS.description.max}
                    defaultValue={project?.description ?? ""}
                    error={state.errors.description}
                    hint={`Card copy, and reused verbatim as the page's meta description — so aim for ${DESCRIPTION_SEO_MAX} characters or fewer. Over that is a warning, not a block.`}
                />

                <Field
                    name="longDescription"
                    label="Long description"
                    multiline
                    rows={8}
                    disabled={disabled}
                    maxLength={PROJECT_LIMITS.longDescription.max}
                    defaultValue={project?.longDescription ?? ""}
                    hint="The case study's opening prose. Omit it and the detail page falls back to the description."
                />

                <Field
                    name="role"
                    label="Role"
                    disabled={disabled}
                    maxLength={PROJECT_LIMITS.role.max}
                    defaultValue={project?.role ?? ""}
                    hint='The ROLE row of the spec sheet, e.g. "University capstone, four-person team". Left empty the row is omitted entirely — better than guessing at one.'
                />

                <CheckboxField
                    name="featured"
                    label="Featured"
                    defaultChecked={Boolean(project?.featured)}
                    disabled={disabled}
                    hint="Appears in the homepage's Featured Projects section. /projects lists everything either way."
                />
            </Section>

            <Section
                title="Links"
                note="GitHub stats — language, stars, last push — are overlaid at request time from the repo and are never stored here."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        name="githubRepo"
                        label="GitHub repo name"
                        mono
                        disabled={disabled}
                        maxLength={PROJECT_LIMITS.githubRepo.max}
                        defaultValue={project?.githubRepo ?? ""}
                        hint="Bare name, not a URL. This is what live stats match on."
                    />
                    <Field
                        name="githubUrl"
                        label="GitHub URL"
                        mono
                        type="url"
                        disabled={disabled}
                        maxLength={PROJECT_LIMITS.githubUrl.max}
                        defaultValue={project?.githubUrl ?? ""}
                        error={state.errors.githubUrl}
                    />
                </div>

                <Field
                    name="liveUrl"
                    label="Live URL"
                    mono
                    type="url"
                    disabled={disabled}
                    maxLength={PROJECT_LIMITS.liveUrl.max}
                    defaultValue={project?.liveUrl ?? ""}
                    error={state.errors.liveUrl}
                    hint="Omit it and the card shows no live-demo affordance, which is the honest state for a desktop app or coursework."
                />
            </Section>

            <Section title="Stack">
                <ListField
                    name="technologies"
                    label="Technologies"
                    values={project?.technologies ?? []}
                    disabled={disabled}
                    placeholder="Next.js"
                    hint="One per row. Drives the card's chips and the /projects technology filter, so spelling has to match across projects — “Tailwind CSS”, not “TailwindCSS”."
                />
            </Section>

            <Section
                title="Narrative"
                note="All four lists are optional and each renders as its own block. An empty list is omitted from the file rather than written as []."
            >
                <ListField
                    name="keyFeatures"
                    label="Key features"
                    multiline
                    values={project?.keyFeatures ?? []}
                    disabled={disabled}
                    hint="What it does. The longest list on most entries."
                />
                <ListField
                    name="disclaimers"
                    label="Disclaimers"
                    multiline
                    values={project?.disclaimers ?? []}
                    disabled={disabled}
                    hint="Scope limits a visitor should know before clicking the live link: what it deliberately does not do, whether the demo is shared, whether the work was solo. Its own plate in the detail page's rail — a caveat nobody reads is not a caveat."
                />
                <ListField
                    name="challenges"
                    label="Challenges"
                    multiline
                    values={project?.challenges ?? []}
                    disabled={disabled}
                />
                <ListField
                    name="lessonsLearned"
                    label="Lessons learned"
                    multiline
                    values={project?.lessonsLearned ?? []}
                    disabled={disabled}
                />
                <ListField
                    name="futureImprovements"
                    label="Future improvements"
                    multiline
                    values={project?.futureImprovements ?? []}
                    disabled={disabled}
                />
            </Section>

            <Section
                title="Demo credentials"
                note="Rendered as a structured list on the detail page, never embedded in prose. Fill both or neither."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        name="credentialsPassword"
                        label="Shared password"
                        mono
                        disabled={disabled}
                        maxLength={PROJECT_LIMITS.credentialsPassword.max}
                        defaultValue={project?.testCredentials?.password ?? ""}
                        error={state.errors.credentialsPassword}
                        hint="Published publicly. Only ever a throwaway demo password."
                    />
                </div>

                <ListField
                    name="credentialsAccounts"
                    label="Accounts"
                    mono
                    values={project?.testCredentials?.accounts ?? []}
                    disabled={disabled}
                    placeholder="admin@example.com"
                />

                {state.errors.credentialsAccounts && (
                    <p className="text-sm text-danger">{state.errors.credentialsAccounts}</p>
                )}
            </Section>

            <Section
                title="Screenshots"
                note="Existing paths are editable as text; a new file is committed alongside this entry in a single commit, so the file and the path referencing it always arrive together."
            >
                <ListField
                    name="screenshots"
                    label="Screenshot paths"
                    mono
                    values={project?.screenshots ?? []}
                    disabled={disabled}
                    placeholder="/images/projects/example.jpg"
                    hint="Must live under /images/projects/."
                />

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="screenshotFile"
                        className="flex items-center gap-2 text-sm font-medium text-ink"
                    >
                        <ImageIcon size={15} aria-hidden="true" />
                        Upload a screenshot
                    </label>
                    <input
                        id="screenshotFile"
                        name="screenshotFile"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={disabled}
                        aria-describedby="screenshotFile-hint"
                        aria-invalid={state.errors.screenshot ? true : undefined}
                        className={controlStyles}
                    />
                    {state.errors.screenshot && (
                        <p className="text-sm text-danger">{state.errors.screenshot}</p>
                    )}
                    <p id="screenshotFile-hint" className="text-xs leading-relaxed text-ink-muted">
                        JPEG, PNG or WebP, 4 MB max. The destination filename is built from the slug
                        — the uploaded file&rsquo;s own name is never used. Resize and compress
                        before uploading; nothing here processes images.
                    </p>
                </div>
            </Section>

            {project?.slug && (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <a
                        href={`/projects/${project.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bp-focus inline-flex items-center gap-1.5 rounded-sm text-accent underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                    >
                        View the live page
                        <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    <span>Shows the previous deploy until the next build finishes.</span>
                </p>
            )}

            <SaveBar
                label={isCreate ? "Create project" : "Save project"}
                note="commits data/projects.ts"
            />

            <DeployStatus result={state} />

            {state.status === "success" && state.warnings.length > 0 && (
                <ul className="flex flex-col gap-2 rounded-sm border border-line bg-surface-alt p-3.5">
                    {state.warnings.map((warning) => (
                        <li
                            key={warning}
                            className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-muted"
                        >
                            <Info
                                size={15}
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-signal"
                            />
                            {warning}
                        </li>
                    ))}
                </ul>
            )}
        </form>
    );
}

/** A titled group of fields. The note explains what the group does to the site. */
function Section({
    title,
    note,
    children,
}: {
    title: string;
    note?: string;
    children: React.ReactNode;
}) {
    return (
        <Card plain className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
                <h2 className="bp-meta text-ink-muted">{title}</h2>
                {note && <p className="text-xs leading-relaxed text-ink-muted">{note}</p>}
            </div>
            {children}
        </Card>
    );
}
