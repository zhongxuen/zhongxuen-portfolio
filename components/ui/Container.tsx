import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
    /** Renders a <section> instead of a <div> — use for top-level page sections */
    as?: "div" | "section";
}

/**
 * Consistent max-width + horizontal padding wrapper. Every section
 * component (HeroSection, AboutSection, etc.) should wrap its content
 * in this rather than redefining max-w/px values inline, per
 * master_prompt.md's "generous whitespace" and "consistent spacing."
 */
export function Container({ as = "div", className, ...props }: ContainerProps) {
    const Tag = as;

    return (
        <Tag
            className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
            {...props}
        />
    );
}