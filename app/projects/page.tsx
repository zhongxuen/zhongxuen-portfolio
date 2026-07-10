import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { projects } from "@/data/projects";
import { buildMetadata } from "@/lib/metadata";

const sortedProjects = [...projects].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
);

export const metadata: Metadata = buildMetadata({
    title: "Projects",
    description: "A curated selection of software projects spanning full-stack apps, desktop systems, and CLI tools.",
    path: "/projects",
});

export default function ProjectsPage() {
    return (
        <Container as="section" className="flex flex-col gap-10 py-16 md:py-24">
            <SectionHeading
                eyebrow="Portfolio"
                title="Selected projects"
                description="A snapshot of the systems, interfaces, and workflows I have built across coursework, personal projects, and product-focused development work."
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sortedProjects.map((project) => (
                    <ProjectCard key={project.slug} project={project} />
                ))}
            </div>
        </Container>
    );
}
