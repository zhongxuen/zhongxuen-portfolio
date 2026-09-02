import Image from "next/image";
import { BlueprintPlate } from "@/components/projects/BlueprintPlate";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

export interface ProjectVisualProps {
    project: Project;
    /**
     * Layout hint for the optimizer. Required rather than defaulted: this
     * component appears in three differently-sized boxes (card cell, bento
     * feature cell, full-bleed detail header) and a wrong hint is either a
     * wasted download or a visibly soft render.
     */
    sizes: string;
    /**
     * Preload the image in the document head. Only for the detail page header,
     * which is that route's LCP element. `priority` is deprecated in Next 16 in
     * favour of this — see the Version History table in
     * node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md.
     */
    preload?: boolean;
    /**
     * Clear the blueprint overlay when the enclosing `group/card` is hovered.
     * Off for the detail header, which has no hover state to speak of.
     */
    revealOnHover?: boolean;
    className?: string;
}

/**
 * A project's imagery, with the blueprint treatment (docs/uiux.md §4.5).
 *
 * The screenshot is the exception, not the rule — one project in
 * data/projects.ts has one — so the slug-seeded BlueprintPlate is the primary
 * path and is what most cards actually render. Either way the box is the same
 * shape and carries the same grid overlay, so a grid of mixed cards still reads
 * as one system.
 *
 * The caller owns the box's aspect ratio; this fills it absolutely, which is
 * what keeps CLS at zero regardless of when (or whether) an image decodes.
 */
export function ProjectVisual({
    project,
    sizes,
    preload = false,
    revealOnHover = true,
    className,
}: ProjectVisualProps) {
    const screenshot = project.screenshots?.[0];

    return (
        <div className={cn("relative overflow-hidden bg-surface-alt", className)}>
            {screenshot ? (
                <Image
                    src={screenshot}
                    alt={`${project.title} interface`}
                    fill
                    sizes={sizes}
                    preload={preload}
                    className="object-cover object-top"
                />
            ) : (
                <BlueprintPlate slug={project.slug} className="absolute inset-0" />
            )}

            {/*
             * Scrim + grid. Over a screenshot it is what makes the photo sit on
             * the drawing rather than on top of it; over a BlueprintPlate it is
             * nearly invisible, which is correct — that artwork is already drawn
             * in the same ink.
             */}
            <span
                aria-hidden="true"
                className={cn(
                    "bp-grid-overlay bg-void/35",
                    revealOnHover &&
                        "transition-opacity duration-base ease-bp group-hover/card:opacity-0 group-focus-within/card:opacity-0",
                )}
            />

            {/* Drafting annotation. Decorative — the slug is also the URL. */}
            <span
                aria-hidden="true"
                className="bp-meta absolute bottom-2 left-3 text-[0.625rem] text-ink-faint"
            >
                {project.slug}
            </span>
        </div>
    );
}
