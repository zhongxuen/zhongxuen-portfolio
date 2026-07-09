import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /** Adds a subtle hover lift/border highlight — use for clickable/linked cards (ProjectCard) */
    interactive?: boolean;
}

/**
 * Base surface primitive for ProjectCard, SkillCard, ExperienceCard,
 * EducationCard. Deliberately unopinionated about internal layout —
 * each card component composes its own content inside this shell.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ interactive = false, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl border border-muted/10 bg-card p-6",
                    interactive &&
                        "transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5",
                    className
                )}
                {...props}
            />
        );
    }
);

Card.displayName = "Card";

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn("font-heading text-lg font-semibold text-foreground", className)}
            {...props}
        />
    );
}

export function CardDescription({
    className,
    ...props
}: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("text-sm text-muted leading-relaxed", className)} {...props} />;
}