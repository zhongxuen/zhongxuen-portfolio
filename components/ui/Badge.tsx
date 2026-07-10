import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "success" | "secondary";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-card text-muted border border-muted/20",
    outline: "bg-transparent text-primary border border-primary/40",
    success: "bg-success/10 text-success border border-success/30",
    secondary: "bg-secondary/10 text-secondary border border-secondary/30",
};

/**
 * Small pill label. Used for technology tags on ProjectCard, skill
 * categories, and status indicators (e.g. "Featured").
 */
export function Badge({ variant = "default", className, ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                variantStyles[variant],
                className
            )}
            {...props}
        />
    );
}