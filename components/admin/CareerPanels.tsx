"use client";

import { useActionState } from "react";
import {
    saveCertifications,
    saveEducation,
    saveExperience,
    saveSkills,
} from "@/app/(admin)/actions/career";
import { CheckboxField, Field, SelectField } from "@/components/admin/Field";
import { DeployStatus } from "@/components/admin/DeployStatus";
import { EntryList } from "@/components/admin/EntryList";
import { ListField } from "@/components/admin/ListField";
import { SaveBar } from "@/components/admin/SaveBar";
import { Card } from "@/components/ui/Card";
import {
    CAREER_LIMITS,
    EMPLOYMENT_TYPES,
    INITIAL_CAREER_FORM,
    PRESENT,
    SKILL_CATEGORIES,
    type CareerFormState,
} from "@/lib/admin/careerForm";
import type { Certification } from "@/types/certification";
import type { Education } from "@/types/education";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";

/**
 * The four career editors (docs/admin-plan.md §17.1).
 *
 * One file, four exported panels, following `SettingsPanels.tsx`: each is a
 * small form over one action, and splitting them across four files would be four
 * imports to say the same thing. Each owns its own `useActionState` so one
 * panel's result never replaces another's — and, more importantly, so a failed
 * save in one section does not discard the unsaved edits in the other three.
 *
 * Every panel is one form over the *whole* list. That is what the actions
 * expect, and it is also the honest UI for the underlying file: these are
 * ordered arrays in a TypeScript module, not rows in a table, and pretending
 * otherwise would mean inventing per-entry identity on top of an `id` the
 * operator is editing in the same form.
 */

/** Today, for a blank row's date default. Computed per press, not at module load. */
function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export function ExperiencePanel({
    entries,
    canWrite,
}: {
    entries: Experience[];
    canWrite: boolean;
}) {
    const [state, action, pending] = useActionState(saveExperience, INITIAL_CAREER_FORM);
    const disabled = pending || !canWrite;

    return (
        <Panel
            id="experience"
            title="Experience"
            note="components/sections/ExperienceSection.tsx and, through lib/resume/model.ts, the generated résumé. Order here is the order there."
            state={state}
            saveNote="commits data/experience.ts"
        >
            <form action={action} className="flex flex-col gap-4">
                <EntryList<Experience>
                    entries={entries}
                    disabled={disabled}
                    addLabel="Add a role"
                    emptyNote="No roles. The experience section renders nothing at all, and the résumé loses its whole Experience block."
                    blank={() => ({
                        id: "",
                        role: "",
                        company: "",
                        startDate: today(),
                        description: "",
                        featured: false,
                    })}
                    title={(entry) => entry.role}
                    subtitle={(entry) => entry.company}
                >
                    {({ entry, index, name, disabled: rowDisabled }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    name={name("id")}
                                    label="Id"
                                    mono
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.id}
                                    maxLength={CAREER_LIMITS.id.max}
                                    error={state.errors[`${index}.id`]}
                                    hint="Stable key. Lowercase, hyphenated."
                                />
                                <Field
                                    name={name("role")}
                                    label="Role"
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.role}
                                    maxLength={CAREER_LIMITS.shortText.max}
                                    error={state.errors[`${index}.role`]}
                                />
                                <Field
                                    name={name("company")}
                                    label="Company"
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.company}
                                    maxLength={CAREER_LIMITS.shortText.max}
                                    error={state.errors[`${index}.company`]}
                                />
                                <Field
                                    name={name("companyUrl")}
                                    label="Company URL"
                                    type="url"
                                    mono
                                    disabled={rowDisabled}
                                    defaultValue={entry.companyUrl ?? ""}
                                    maxLength={CAREER_LIMITS.url.max}
                                    error={state.errors[`${index}.companyUrl`]}
                                />
                                <Field
                                    name={name("location")}
                                    label="Location"
                                    disabled={rowDisabled}
                                    defaultValue={entry.location ?? ""}
                                    maxLength={CAREER_LIMITS.shortText.max}
                                />
                                <SelectField
                                    name={name("employmentType")}
                                    label="Employment type"
                                    options={EMPLOYMENT_TYPES}
                                    allowEmpty
                                    disabled={rowDisabled}
                                    defaultValue={entry.employmentType ?? ""}
                                />
                                <Field
                                    name={name("startDate")}
                                    label="Start date"
                                    type="date"
                                    mono
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.startDate}
                                    error={state.errors[`${index}.startDate`]}
                                />
                                <Field
                                    name={name("endDate")}
                                    label="End date"
                                    type="date"
                                    mono
                                    disabled={rowDisabled}
                                    defaultValue={
                                        entry.endDate === PRESENT ? "" : (entry.endDate ?? "")
                                    }
                                    error={state.errors[`${index}.endDate`]}
                                    hint="Ignored entirely while the box below is ticked."
                                />
                            </div>

                            <CheckboxField
                                name={name("current")}
                                label="Still in this role"
                                disabled={rowDisabled}
                                defaultChecked={entry.endDate === PRESENT}
                                hint={`Writes "${PRESENT}". The section derives "current" from that exact string, so a real future date would render this as finished history.`}
                            />

                            <Field
                                name={name("description")}
                                label="Description"
                                multiline
                                rows={3}
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.description}
                                maxLength={CAREER_LIMITS.description.max}
                                error={state.errors[`${index}.description`]}
                                hint="One summary line. Shown on the card and used by the résumé."
                            />

                            <ListField
                                name={name("responsibilities")}
                                label="Responsibilities"
                                values={entry.responsibilities ?? []}
                                disabled={rowDisabled}
                                multiline
                                hint="Bullet points, in order. The résumé takes the first few."
                            />

                            <ListField
                                name={name("technologies")}
                                label="Technologies"
                                values={entry.technologies ?? []}
                                disabled={rowDisabled}
                                hint="Optional. Distinct from data/skills.ts — these are what this role used."
                            />

                            <CheckboxField
                                name={name("featured")}
                                label="Featured"
                                disabled={rowDisabled}
                                defaultChecked={entry.featured ?? false}
                            />
                        </>
                    )}
                </EntryList>

                <SaveBar note="commits data/experience.ts" label="Save experience" />
            </form>
        </Panel>
    );
}

export function EducationPanel({ entries, canWrite }: { entries: Education[]; canWrite: boolean }) {
    const [state, action, pending] = useActionState(saveEducation, INITIAL_CAREER_FORM);
    const disabled = pending || !canWrite;

    return (
        <Panel
            id="education"
            title="Education"
            note="components/sections/EducationSection.tsx and the résumé's Education block."
            state={state}
            saveNote="commits data/education.ts"
        >
            <form action={action} className="flex flex-col gap-4">
                <EntryList<Education>
                    entries={entries}
                    disabled={disabled}
                    addLabel="Add a programme"
                    emptyNote="No education entries. The section renders nothing."
                    blank={() => ({
                        id: "",
                        degree: "",
                        institution: "",
                        startDate: today(),
                        featured: false,
                    })}
                    title={(entry) => entry.degree}
                    subtitle={(entry) => entry.institution}
                >
                    {({ entry, index, name, disabled: rowDisabled }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    name={name("id")}
                                    label="Id"
                                    mono
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.id}
                                    maxLength={CAREER_LIMITS.id.max}
                                    error={state.errors[`${index}.id`]}
                                />
                                <Field
                                    name={name("degree")}
                                    label="Degree or programme"
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.degree}
                                    maxLength={CAREER_LIMITS.description.max}
                                    error={state.errors[`${index}.degree`]}
                                />
                                <Field
                                    name={name("institution")}
                                    label="Institution"
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.institution}
                                    maxLength={CAREER_LIMITS.shortText.max}
                                    error={state.errors[`${index}.institution`]}
                                    hint="Non-Latin characters render on the site but are stripped from the PDF."
                                />
                                <Field
                                    name={name("institutionUrl")}
                                    label="Institution URL"
                                    type="url"
                                    mono
                                    disabled={rowDisabled}
                                    defaultValue={entry.institutionUrl ?? ""}
                                    maxLength={CAREER_LIMITS.url.max}
                                    error={state.errors[`${index}.institutionUrl`]}
                                />
                                <Field
                                    name={name("location")}
                                    label="Location"
                                    disabled={rowDisabled}
                                    defaultValue={entry.location ?? ""}
                                    maxLength={CAREER_LIMITS.shortText.max}
                                />
                                <Field
                                    name={name("gpa")}
                                    label="GPA"
                                    mono
                                    disabled={rowDisabled}
                                    defaultValue={entry.gpa ?? ""}
                                    maxLength={16}
                                />
                                <Field
                                    name={name("startDate")}
                                    label="Start date"
                                    type="date"
                                    mono
                                    required
                                    disabled={rowDisabled}
                                    defaultValue={entry.startDate}
                                    error={state.errors[`${index}.startDate`]}
                                />
                                <Field
                                    name={name("endDate")}
                                    label="End date"
                                    type="date"
                                    mono
                                    disabled={rowDisabled}
                                    defaultValue={
                                        entry.endDate === PRESENT ? "" : (entry.endDate ?? "")
                                    }
                                    error={state.errors[`${index}.endDate`]}
                                />
                            </div>

                            <CheckboxField
                                name={name("current")}
                                label="Still enrolled"
                                disabled={rowDisabled}
                                defaultChecked={entry.endDate === PRESENT}
                                hint={`Writes "${PRESENT}". Keep it ticked until the award is actually conferred, not merely until the work is done.`}
                            />

                            <Field
                                name={name("description")}
                                label="Description"
                                multiline
                                rows={2}
                                disabled={rowDisabled}
                                defaultValue={entry.description ?? ""}
                                maxLength={CAREER_LIMITS.description.max}
                            />

                            <ListField
                                name={name("relevantCourses")}
                                label="Relevant courses"
                                values={entry.relevantCourses ?? []}
                                disabled={rowDisabled}
                            />

                            <ListField
                                name={name("honors")}
                                label="Honours and results"
                                values={entry.honors ?? []}
                                disabled={rowDisabled}
                                multiline
                            />

                            <CheckboxField
                                name={name("featured")}
                                label="Featured"
                                disabled={rowDisabled}
                                defaultChecked={entry.featured ?? false}
                            />
                        </>
                    )}
                </EntryList>

                <SaveBar note="commits data/education.ts" label="Save education" />
            </form>
        </Panel>
    );
}

export function SkillsPanel({ entries, canWrite }: { entries: Skill[]; canWrite: boolean }) {
    const [state, action, pending] = useActionState(saveSkills, INITIAL_CAREER_FORM);
    const disabled = pending || !canWrite;

    return (
        <Panel
            id="skills"
            title="Skills"
            note="Grouped by category on the site, so the order within a category is the order here."
            state={state}
            saveNote="commits data/skills.ts"
        >
            <form action={action} className="flex flex-col gap-4">
                <EntryList<Skill>
                    entries={entries}
                    disabled={disabled}
                    addLabel="Add a skill"
                    emptyNote="No skills. The skills section renders nothing."
                    blank={() => ({
                        id: "",
                        name: "",
                        category: "Programming Languages",
                        icon: "",
                        featured: false,
                    })}
                    title={(entry) => entry.name}
                    subtitle={(entry) => entry.category}
                >
                    {({ entry, index, name, disabled: rowDisabled }) => (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                name={name("id")}
                                label="Id"
                                mono
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.id}
                                maxLength={CAREER_LIMITS.id.max}
                                error={state.errors[`${index}.id`]}
                            />
                            <Field
                                name={name("name")}
                                label="Display name"
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.name}
                                maxLength={CAREER_LIMITS.shortText.max}
                                error={state.errors[`${index}.name`]}
                            />
                            <SelectField
                                name={name("category")}
                                label="Category"
                                required
                                options={SKILL_CATEGORIES}
                                disabled={rowDisabled}
                                defaultValue={entry.category}
                                error={state.errors[`${index}.category`]}
                            />
                            <Field
                                name={name("icon")}
                                label="Icon key"
                                mono
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.icon}
                                maxLength={CAREER_LIMITS.shortText.max}
                                error={state.errors[`${index}.icon`]}
                                hint="Must resolve in skillIconMap, or the card falls back to a generic glyph."
                            />
                            <CheckboxField
                                name={name("featured")}
                                label="Featured"
                                disabled={rowDisabled}
                                defaultChecked={entry.featured ?? false}
                                hint="Featured skills appear in the home page's overview strip."
                            />
                        </div>
                    )}
                </EntryList>

                <SaveBar note="commits data/skills.ts" label="Save skills" />
            </form>
        </Panel>
    );
}

export function CertificationsPanel({
    entries,
    canWrite,
}: {
    entries: Certification[];
    canWrite: boolean;
}) {
    const [state, action, pending] = useActionState(saveCertifications, INITIAL_CAREER_FORM);
    const disabled = pending || !canWrite;

    return (
        <Panel
            id="certifications"
            title="Certifications"
            note="Empty is a real state — the strip in EducationSection renders nothing rather than placeholder rows."
            state={state}
            saveNote="commits data/certifications.ts"
        >
            <form action={action} className="flex flex-col gap-4">
                <EntryList<Certification>
                    entries={entries}
                    disabled={disabled}
                    addLabel="Add a certification"
                    emptyNote="None recorded, which is the current honest state — nothing in the CV is a certification. Adding the first one needs no component changes."
                    blank={() => ({ id: "", name: "", issuer: "", date: today() })}
                    title={(entry) => entry.name}
                    subtitle={(entry) => entry.issuer}
                >
                    {({ entry, index, name, disabled: rowDisabled }) => (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                name={name("id")}
                                label="Id"
                                mono
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.id}
                                maxLength={CAREER_LIMITS.id.max}
                                error={state.errors[`${index}.id`]}
                            />
                            <Field
                                name={name("name")}
                                label="Credential name"
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.name}
                                maxLength={CAREER_LIMITS.shortText.max}
                                error={state.errors[`${index}.name`]}
                            />
                            <Field
                                name={name("issuer")}
                                label="Awarding body"
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.issuer}
                                maxLength={CAREER_LIMITS.shortText.max}
                                error={state.errors[`${index}.issuer`]}
                            />
                            <Field
                                name={name("date")}
                                label="Award date"
                                type="date"
                                mono
                                required
                                disabled={rowDisabled}
                                defaultValue={entry.date}
                                error={state.errors[`${index}.date`]}
                            />
                            <Field
                                name={name("credentialUrl")}
                                label="Verification URL"
                                type="url"
                                mono
                                disabled={rowDisabled}
                                defaultValue={entry.credentialUrl ?? ""}
                                maxLength={CAREER_LIMITS.url.max}
                                error={state.errors[`${index}.credentialUrl`]}
                                hint="Omit when there is no online record — the strip then renders plain text rather than a dead link."
                            />
                        </div>
                    )}
                </EntryList>

                <SaveBar note="commits data/certifications.ts" label="Save certifications" />
            </form>
        </Panel>
    );
}

/**
 * Shared chrome: a titled section, the action's result banner, and any advisory
 * warnings the save produced.
 *
 * Warnings render *after* a successful commit, which is the only moment they are
 * actionable — the same rule the project editor follows. A warning shown before
 * the save would be indistinguishable from an error that blocked it.
 */
function Panel({
    id,
    title,
    note,
    state,
    children,
}: {
    id: string;
    title: string;
    note: string;
    state: CareerFormState;
    saveNote: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="flex scroll-mt-6 flex-col gap-3">
            <div>
                <h2 className="font-display text-h4 font-bold text-ink">{title}</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">{note}</p>
            </div>

            <Card plain className="p-4 sm:p-5">
                {children}
            </Card>

            <DeployStatus result={state} />

            {state.status === "success" && state.warnings.length > 0 && (
                <ul className="flex flex-col gap-1.5 rounded-sm border border-signal/30 bg-signal/6 px-4 py-3">
                    {state.warnings.map((warning) => (
                        <li key={warning} className="text-xs leading-relaxed text-ink-muted">
                            {warning}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
