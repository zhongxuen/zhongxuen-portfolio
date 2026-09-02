import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { PROJECTS_PATH } from "@/lib/projectFilters";
import { revealDelay, stagger } from "@/lib/reveal";
import type { Project } from "@/types/project";

interface ProjectsSectionProps {
    /** The featured subset, already selected by the caller. */
    projects: Project[];
    /**
     * Size of the full catalogue, used by the "View all" CTA. Passed in rather
     * than inferred from `projects.length` — this section is deliberately
     * showing fewer than the total.
     */
    totalCount: number;
}

/**
 * Featured work on the homepage (docs/improvements.md, Wave 3 Lane E).
 *
 * This grid used to be the same full list rendered on /projects, which left
 * the two pages duplicating each other and gave the visitor no reason to click
 * through. The homepage now shows only `featured` projects and hands off to
 * /projects, which owns the complete, filterable catalogue.
 */
export function ProjectsSection({ projects, totalCount }: ProjectsSectionProps) {
    const remaining = totalCount - projects.length;

    return (
        <Container
            as="section"
            id="projects"
            aria-labelledby="projects-heading"
            className="bp-section-y flex flex-col gap-10"
        >
            <SectionHeading
                index={3}
                headingId="projects-heading"
                eyebrow="Projects"
                title="Featured work"
                description="A mix of full-stack apps, desktop tools, and CLI systems — from requirements through deployment."
            />

            <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                    <div key={project.slug} data-reveal="up" style={revealDelay(stagger(index))}>
                        <ProjectCard project={project} />
                    </div>
                ))}
            </Reveal>

            <Reveal variant="up" className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Button href={PROJECTS_PATH} variant="secondary">
                    View all projects
                    <ArrowRight size={18} className="bp-nudge-x" />
                </Button>
                {remaining > 0 && (
                    <span className="bp-meta text-ink-muted">{remaining} more in the archive</span>
                )}
            </Reveal>
        </Container>
    );
}
