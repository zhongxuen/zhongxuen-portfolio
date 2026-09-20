import { cn } from "@/lib/utils";

/**
 * One labelled control for the admin forms.
 *
 * The public site has exactly one form and no reusable field primitive — its
 * `Field` is local to `components/forms/ContactForm.tsx`, four fields wide and
 * hardcoded to that form's union of field names. This is the general version:
 * same label / control / `aria-describedby` wiring, same `controlStyles`, but
 * free of `ContactField`, and it carries a hint line because most project
 * fields need one sentence explaining where the value ends up on the site.
 *
 * Not a client component. It renders an uncontrolled input with a
 * `defaultValue`, and the form it lives in is what owns state.
 */

/**
 * Control chrome, shared by every input, textarea and select here.
 *
 * `border-line-ui` rather than the decorative `border-line`: the palette notes
 * in app/globals.css require any border that identifies an interactive control
 * to clear 3:1. Focus is the shared `bp-focus` utility with no `outline-none`,
 * and the transition names its properties rather than using
 * `transition-colors`, which would include `outline-color` and make the focus
 * ring fade up instead of snapping on.
 */
export const controlStyles =
    "bp-focus w-full rounded-sm border border-line-ui bg-surface-alt px-3 py-2 text-sm text-ink transition-[border-color,background-color] duration-fast ease-bp placeholder:text-ink-muted hover:border-line-strong disabled:opacity-60 aria-[invalid=true]:border-danger";

export interface FieldProps {
    name: string;
    label: string;
    /** One sentence on what this value does. Rendered below the control, and referenced by aria-describedby. */
    hint?: string;
    error?: string;
    defaultValue?: string;
    disabled?: boolean;
    required?: boolean;
    maxLength?: number;
    placeholder?: string;
    type?: string;
    rows?: number;
    /** Renders a <textarea>. `rows` only applies here. */
    multiline?: boolean;
    /** Mono type for the control — slugs, URLs, paths, anything that is an identifier rather than prose. */
    mono?: boolean;
    className?: string;
}

export function Field({
    name,
    label,
    hint,
    error,
    defaultValue = "",
    disabled = false,
    required = false,
    maxLength,
    placeholder,
    type = "text",
    rows = 4,
    multiline = false,
    mono = false,
    className,
}: FieldProps) {
    const errorId = `${name}-error`;
    const hintId = `${name}-hint`;
    const invalid = Boolean(error);

    const shared = {
        id: name,
        name,
        defaultValue,
        disabled,
        required,
        maxLength,
        placeholder,
        "aria-invalid": invalid || undefined,
        /*
         * Both, in that order, when both exist. The error is what changed, so a
         * screen reader should reach it before the standing explanation.
         */
        "aria-describedby":
            [invalid ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined,
    };

    const controlClass = cn(controlStyles, mono && "font-mono");

    return (
        <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
            <label htmlFor={name} className="text-sm font-medium text-ink">
                {label}
                {!required && <span className="ml-2 text-xs text-ink-muted">optional</span>}
            </label>

            {multiline ? (
                <textarea {...shared} rows={rows} className={cn(controlClass, "resize-y")} />
            ) : (
                <input {...shared} type={type} className={controlClass} />
            )}

            {error && (
                <p id={errorId} className="text-sm text-danger">
                    {error}
                </p>
            )}

            {hint && (
                <p id={hintId} className="text-xs leading-relaxed text-ink-muted">
                    {hint}
                </p>
            )}
        </div>
    );
}

/** Checkbox row. Its own component because the label sits after the control, not before it. */
export function CheckboxField({
    name,
    label,
    hint,
    defaultChecked = false,
    disabled = false,
}: {
    name: string;
    label: string;
    hint?: string;
    defaultChecked?: boolean;
    disabled?: boolean;
}) {
    const hintId = `${name}-hint`;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
                <input
                    id={name}
                    name={name}
                    type="checkbox"
                    defaultChecked={defaultChecked}
                    disabled={disabled}
                    aria-describedby={hint ? hintId : undefined}
                    className="bp-focus size-4 shrink-0 rounded-xs border border-line-ui accent-accent"
                />
                <label htmlFor={name} className="text-sm font-medium text-ink">
                    {label}
                </label>
            </div>

            {hint && (
                <p id={hintId} className="text-xs leading-relaxed text-ink-muted">
                    {hint}
                </p>
            )}
        </div>
    );
}
