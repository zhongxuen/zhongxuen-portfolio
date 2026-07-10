"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { projects } from "@/data/projects";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

const sortedProjects = [...projects].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
);

export function ProjectsSection() {
    return (
        <Container as="section" id="projects" className="flex flex-col gap-10 py-20 md:py-28">
            <SectionHeading
                eyebrow="Projects"
                title="Selected work"
                description="A mix of full-stack apps, desktop tools, and CLI systems — from requirements through deployment."
            />

            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={defaultViewport}
                variants={staggerContainer}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
                {sortedProjects.map((project) => (
                    <motion.div key={project.slug} variants={fadeInUp}>
                        <ProjectCard project={project} />
                    </motion.div>
                ))}
            </motion.div>
        </Container>
    );
}