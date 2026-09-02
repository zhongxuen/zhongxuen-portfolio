"use client";

import { useActionState } from "react";
import { CircleCheck, LoaderCircle, Mail, Send, TriangleAlert } from "lucide-react";
import { submitContactForm } from "@/app/actions/contact";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    CONTACT_LIMITS,
    HONEYPOT_FIELD,
    INITIAL_CONTACT_STATE,
    type ContactField,
} from "@/lib/contact";
import { AUTHOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Contact form.
 *
 * Submits through the `submitContactForm` Server Action, which validates
 * server-side and sends via Resend. `useActionState` drives pending, success
 * and error state; because the form posts through `<form action>` rather than
 * an onSubmit handler, it still works with JavaScript disabled.
 *
 * The previous version assigned `window.location.href = "mailto:..."`, which
 * navigated the tab away and silently did nothing on any device without a
 * configured mail client (docs/uiux.md §2 called this the site's biggest
 * defect). Mailto is still here, but only as an explicit, visible choice.
 */

/**
 * Control chrome, shared by every input and the textarea.
 *
 * `border-line-ui` rather than the decorative `border-line`: the palette notes
 * in app/globals.css require any border that identifies an interactive control
 * to clear 3:1. Focus is the shared `bp-focus` utility, the same one
 * components/ui/Button.tsx uses, so every control on the site rings
 * identically — note there is no `outline-none` here, which is what suppressed
 * the ring before.
 *
 * The transition names its properties rather than using `transition-colors`,
 * matching Button and for the same reason: `transition-colors` includes
 * `outline-color`, which makes the focus ring fade up over 180ms instead of
 * snapping on. A keyboard user should see the ring immediately.
 */
const controlStyles =
    "bp-focus w-full rounded-sm border border-line-ui bg-surface-alt px-4 py-3 text-ink transition-[border-color,background-color] duration-fast ease-bp placeholder:text-ink-muted hover:border-line-strong disabled:opacity-60 aria-[invalid=true]:border-danger";

interface FieldProps {
    name: ContactField;
    label: string;
    /** Server-side message for this field, if the last submission rejected it. */
    error?: string;
    defaultValue: string;
    disabled: boolean;
    maxLength: number;
    type?: string;
    autoComplete?: string;
    multiline?: boolean;
}

/**
 * One labelled control. Exists so `aria-invalid` and `aria-describedby` are
 * wired the same way for every field rather than four times by hand.
 */
function Field({
    name,
    label,
    error,
    defaultValue,
    disabled,
    maxLength,
    type = "text",
    autoComplete,
    multiline = false,
}: FieldProps) {
    const errorId = `${name}-error`;
    const invalid = Boolean(error);

    const shared = {
        id: name,
        name,
        defaultValue,
        disabled,
        maxLength,
        autoComplete,
        required: true,
        "aria-invalid": invalid || undefined,
        "aria-describedby": invalid ? errorId : undefined,
    };

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={name} className="text-sm font-medium text-ink">
                {label}
            </label>

            {multiline ? (
                <textarea {...shared} rows={6} className={cn(controlStyles, "resize-y")} />
            ) : (
                <input {...shared} type={type} className={controlStyles} />
            )}

            {error && (
                <p id={errorId} className="text-sm text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

export function ContactForm() {
    const [state, formAction, pending] = useActionState(submitContactForm, INITIAL_CONTACT_STATE);

    return (
        <Card className="w-full">
            <form action={formAction} className="flex flex-col gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                    <Field
                        name="name"
                        label="Name"
                        autoComplete="name"
                        error={state.errors.name}
                        defaultValue={state.values.name}
                        disabled={pending}
                        maxLength={CONTACT_LIMITS.name.max}
                    />

                    <Field
                        name="email"
                        label="Email"
                        type="email"
                        autoComplete="email"
                        error={state.errors.email}
                        defaultValue={state.values.email}
                        disabled={pending}
                        maxLength={CONTACT_LIMITS.email.max}
                    />
                </div>

                <Field
                    name="subject"
                    label="Subject"
                    error={state.errors.subject}
                    defaultValue={state.values.subject}
                    disabled={pending}
                    maxLength={CONTACT_LIMITS.subject.max}
                />

                <Field
                    name="message"
                    label="Message"
                    multiline
                    error={state.errors.message}
                    defaultValue={state.values.message}
                    disabled={pending}
                    maxLength={CONTACT_LIMITS.message.max}
                />

                {/*
                 * Honeypot. Positioned off-screen rather than `display: none`,
                 * which more bots know to skip. `aria-hidden` keeps it out of
                 * the accessibility tree and `tabIndex={-1}` keeps it out of
                 * the tab order — both are required, since a focusable element
                 * inside `aria-hidden` is itself an accessibility failure.
                 */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
                >
                    <label htmlFor={HONEYPOT_FIELD}>Company</label>
                    <input
                        id={HONEYPOT_FIELD}
                        name={HONEYPOT_FIELD}
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        defaultValue=""
                    />
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <Button type="submit" variant="primary" size="lg" disabled={pending}>
                        {pending ? (
                            <LoaderCircle size={18} aria-hidden="true" className="animate-spin" />
                        ) : (
                            <Send size={18} aria-hidden="true" />
                        )}
                        {pending ? "Sending…" : "Send Message"}
                    </Button>

                    {/*
                     * Always offered, per docs/uiux.md §4.8: mailto stays
                     * available as a deliberate choice, never as the hidden
                     * default it used to be.
                     */}
                    <p className="text-sm text-ink-muted">
                        Or email me at{" "}
                        <a
                            href={`mailto:${AUTHOR.email}`}
                            className="bp-focus rounded-sm text-accent underline decoration-line-strong underline-offset-4 transition-colors duration-fast ease-bp hover:decoration-accent"
                        >
                            {AUTHOR.email}
                        </a>
                    </p>
                </div>

                {/*
                 * Kept in the DOM at all times. A live region that is mounted
                 * at the same moment its text appears is frequently missed by
                 * screen readers, so only the contents change.
                 */}
                <div role="status" aria-live="polite">
                    {state.status === "success" && (
                        <StatusPlate tone="success" icon={CircleCheck}>
                            {state.message}
                        </StatusPlate>
                    )}

                    {state.status === "error" && (
                        <StatusPlate tone="danger" icon={TriangleAlert}>
                            {state.message}
                        </StatusPlate>
                    )}

                    {state.status === "fallback" && (
                        <StatusPlate tone="signal" icon={Mail}>
                            <p>{state.message}</p>
                            {state.mailto && (
                                <a
                                    href={state.mailto}
                                    className="bp-focus mt-2 inline-block rounded-sm font-medium text-accent underline decoration-line-strong underline-offset-4 transition-colors duration-fast ease-bp hover:decoration-accent"
                                >
                                    Open in my mail app
                                </a>
                            )}
                        </StatusPlate>
                    )}
                </div>
            </form>
        </Card>
    );
}

const toneStyles = {
    success: "border-success/40 bg-success/10 text-success",
    danger: "border-danger/40 bg-danger/10 text-danger",
    signal: "border-signal/40 bg-signal/10 text-signal",
} as const;

interface StatusPlateProps {
    tone: keyof typeof toneStyles;
    icon: React.ComponentType<{
        size?: number;
        className?: string;
        "aria-hidden"?: boolean | "true";
    }>;
    children: React.ReactNode;
}

/** Result banner. The icon is decorative — the wording alone carries the outcome. */
function StatusPlate({ tone, icon: Icon, children }: StatusPlateProps) {
    return (
        <div className={cn("flex items-start gap-3 rounded-sm border p-4", toneStyles[tone])}>
            <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="text-sm leading-relaxed text-ink">{children}</div>
        </div>
    );
}
