import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
    eyebrow?: string;
    title: string;
    description?: string;
}

export function SectionHeading({
    eyebrow,
    title,
    description,
    className,
    ...props
}: SectionHeadingProps) {
    return (
        <div className={cn("flex flex-col gap-3", className)} {...props}>
            {eyebrow && (
                <span className="text-sm font-medium uppercase tracking-wider text-primary">
                    {eyebrow}
                </span>
            )}
            <h2 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">
                {title}
            </h2>
            {description && (
                <p className="max-w-2xl text-base text-muted">{description}</p>
            )}
        </div>
    );
}