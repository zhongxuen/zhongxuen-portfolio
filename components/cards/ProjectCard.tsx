import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import type { Project } from "@/types/project";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProjectVisual } from "@/components/projects/ProjectVisual";
import { cn, formatMonthYear } from "@/lib/utils";

/**
 * `sizes` hints for the two grids this card lands in. Both live inside a
 * `max-w-6xl` Container (72rem, less 2rem of lg padding = 1088px of content),
 * so a three-up cell tops out at (1088 - 2x24px gap) / 3 = ~347px — 21rem is
 * the nearest round hint above that. Conditions are widest-first because the
 * browser takes the first match, not the best one.
 *
 * The two differ only in where the three-column grid starts: the homepage goes
 * 1 -> 2 (sm) -> 3 (lg); /projects goes 1 -> 2 (md) -> 3 (xl).
 */
export const HOME_CARD_SIZES = "(min-width: 1024px) 21rem, (min-width: 640px) 50vw, 100vw";
export const CATALOGUE_CARD_SIZES = "(min-width: 1280px) 21rem, (min-width: 768px) 50vw, 100vw";
/** The bento feature cell spans two columns and their gap: 2 x 347 + 24 = ~45rem. */
export const FEATURE_CARD_SIZES = "(min-width: 1280px) 45rem, (min-width: 768px) 50vw, 100vw";

export interface ProjectCardProps {
    project: Project;
    /** Layout hint for the visual — pass the constant matching the grid. */
    sizes?: string;
    /**
     * The bento feature cell (docs/uiux.md §4.5): taller visual, larger title.
     * Only one card per result set should carry it.
     */
    feature?: boolean;
    className?: string;
}

const iconLink =
    "bp-focus relative z-content inline-flex h-8 w-8 items-center justify-center rounded-xs border border-line bg-surface-alt text-ink-muted transition-[color,border-color] duration-fast ease-bp hover:border-accent hover:text-accent";

/**
 * A single project, as a drafting plate (docs/uiux.md §4.5).
 *
 * The whole card is one click target: the title's link stretches over the plate
 * via an `::after`, so the visual, the copy and the tags all lead to the case
 * study while the accessible name stays just the project title. The repo and
 * live-demo links sit above that overlay as small ticked icon buttons — as two
 * full-size Buttons they competed with the card's own primary action and made
 * every card in a grid shout equally loudly.
 *
 * `language`, `stars` and `lastUpdated` are GitHub-derived (types/project.ts)
 * and simply absent for a project with no matched repo, so the spec strip
 * renders whichever of them exist and nothing at all when none do.
 */
export function ProjectCard({
    project,
    sizes = HOME_CARD_SIZES,
    feature = false,
    className,
}: ProjectCardProps) {
    const {
        slug,
        title,
        description,
        technologies,
        githubUrl,
        liveUrl,
        stars,
        language,
        lastUpdated,
        featured,
    } = project;

    /*
     * Values are ink-muted, separators ink-faint. docs/uiux.md §4.5 asks for the
     * whole strip at --bp-ink-faint, but that token is documented in
     * app/globals.css as decorative-only (2.76:1) and must never be the sole
     * carrier of information — which these three fields are, since they appear
     * nowhere else on the card. The faint dividers keep the intended weight.
     */
    interface Spec {
        key: string;
        label: string;
        /** Read before the value, so the strip is not three bare tokens aloud. */
        srLabel: string;
        icon?: boolean;
    }

    const specs: Spec[] = [
        language ? { key: "language", label: language, srLabel: "Primary language" } : undefined,
        stars !== undefined
            ? { key: "stars", label: String(stars), srLabel: "GitHub stars", icon: true }
            : undefined,
        lastUpdated
            ? { key: "updated", label: formatMonthYear(lastUpdated), srLabel: "Last updated" }
            : undefined,
    ].filter((entry): entry is Spec => Boolean(entry));

    return (
        <Card interactive className={cn("group/card flex h-full flex-col p-0", className)}>
            {/*
             * Aspect ratio is reserved in CSS, so the box occupies its final
             * height from the first paint whether it ends up holding an image
             * or an inline SVG. Zero CLS either way.
             */}
            <ProjectVisual
                project={project}
                sizes={sizes}
                className={cn(
                    "w-full shrink-0 rounded-t-xl border-b border-line",
                    feature ? "aspect-[16/9] lg:aspect-[2/1]" : "aspect-[16/10]",
                )}
            />

            {featured && (
                <>
                    {/*
                     * Amber corner flag rather than a Badge pill (§4.5). Drawn
                     * as a border triangle so it costs no extra box and can sit
                     * flush in the plate's corner.
                     */}
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 right-0 h-0 w-0 border-t-[26px] border-l-[26px] border-t-signal border-l-transparent"
                    />
                    <span className="sr-only">Featured project.</span>
                </>
            )}

            <div className="flex flex-1 flex-col gap-4 p-6">
                <Link
                    href={`/projects/${slug}`}
                    className="bp-focus after:absolute after:inset-0 after:content-['']"
                >
                    <CardTitle
                        className={cn(
                            "transition-colors duration-fast ease-bp group-hover/card:text-accent",
                            feature && "text-h2 lg:text-4xl",
                        )}
                    >
                        {title}
                    </CardTitle>
                </Link>

                <CardDescription className={cn(feature && "text-body-lg")}>
                    {description}
                </CardDescription>

                <div className="flex flex-wrap gap-2">
                    {technologies.map((tech) => (
                        <Badge key={tech}>{tech}</Badge>
                    ))}
                </div>

                <div className="mt-auto flex items-end justify-between gap-4 pt-2">
                    {specs.length > 0 && (
                        <p className="bp-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
                            {specs.map((spec, index) => (
                                <span key={spec.key} className="inline-flex items-center gap-2">
                                    {index > 0 && (
                                        <span aria-hidden="true" className="text-ink-faint">
                                            ·
                                        </span>
                                    )}
                                    {spec.icon && <Star size={12} aria-hidden="true" />}
                                    <span className="sr-only">{spec.srLabel}:</span>
                                    {spec.label}
                                </span>
                            ))}
                        </p>
                    )}

                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        {githubUrl && (
                            <a
                                href={githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${title} source on GitHub`}
                                className={iconLink}
                            >
                                <SiGithub size={15} aria-hidden="true" />
                            </a>
                        )}
                        {liveUrl && (
                            <a
                                href={liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${title} live demo`}
                                className={cn(iconLink, "text-success hover:text-accent")}
                            >
                                <ExternalLink size={15} aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
