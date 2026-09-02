import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
    /** Renders a <section> instead of a <div> — use for top-level page sections */
    as?: "div" | "section";
    /**
     * `default` is the reading measure used by every section.
     * `wide` is for full-bleed breaks (bento grids, gallery strips) that need
     * to escape the reading measure without touching the viewport edge.
     */
    width?: "default" | "wide";
}

const widthStyles = {
    default: "max-w-6xl",
    wide: "max-w-[88rem]",
} as const;

/**
 * Consistent max-width + horizontal padding wrapper. Every section
 * component (HeroSection, AboutSection, etc.) should wrap its content
 * in this rather than redefining max-w/px values inline, per
 * master_prompt.md's "generous whitespace" and "consistent spacing."
 *
 * Vertical rhythm is NOT set here — use the `bp-section-y` utility so the
 * cadence is one token (`--bp-section-y`) rather than a repeated py-20 md:py-28.
 */
export function Container({
    as = "div",
    width = "default",
    className,
    ...props
}: ContainerProps) {
    const Tag = as;

    return (
        <Tag
            className={cn(
                "mx-auto w-full px-4 sm:px-6 lg:px-8",
                widthStyles[width],
                className
            )}
            {...props}
        />
    );
}
