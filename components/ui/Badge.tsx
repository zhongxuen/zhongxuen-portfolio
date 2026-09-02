import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
    | "default"
    | "outline"
    | "success"
    | "secondary"
    | "signal";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: "border border-line bg-surface-alt text-ink-muted",
    outline: "border border-accent/45 bg-accent/8 text-accent",
    success: "border border-success/40 bg-success/10 text-success",
    secondary: "border border-line-strong bg-surface text-ink",
    signal: "border border-signal/45 bg-signal/10 text-signal",
};

/**
 * Small tag label. Used for technology tags on ProjectCard, skill categories,
 * and status indicators (e.g. "Featured").
 *
 * Mono and square-cornered rather than a pill, per docs/uiux.md §2.3 — tech
 * tags belong to the annotation layer. Not force-uppercased: the same
 * component labels coursework and employment types, and long prose strings
 * become unreadable in caps. Add `uppercase tracking-widest` at the call site
 * where a true blueprint annotation is wanted.
 */
export function Badge({ variant = "default", className, ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-xs px-2 py-0.5 font-mono text-xs leading-5 font-medium",
                variantStyles[variant],
                className
            )}
            {...props}
        />
    );
}
