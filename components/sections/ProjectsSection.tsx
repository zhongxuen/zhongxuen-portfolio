"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { projects as localProjects } from "@/data/projects";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";
import { getPortfolioRepos } from "@/services/githubService";
import { mergeProjectsWithRepos } from "@/adapters/githubProjectAdapter";
import type { Project } from "@/types/project";

const sortedProjects = [...localProjects].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
);

export function ProjectsSection() {
    const [projects, setProjects] = useState<Project[]>(sortedProjects);

    useEffect(() => {
        let isMounted = true;

        async function enrichProjectsWithGitHub() {
            try {
                const repos = await getPortfolioRepos();
                if (isMounted) {
                    setProjects(mergeProjectsWithRepos(sortedProjects, repos));
                }
            } catch (error) {
                console.error("Failed to fetch GitHub repos:", error);
                // sortedProjects (local) is already the current state — no fallback needed
            }
        }

        enrichProjectsWithGitHub();
        return () => {
            isMounted = false;
        };
    }, []);

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
                {projects.map((project) => (
                    <motion.div key={project.slug} variants={fadeInUp}>
                        <ProjectCard project={project} />
                    </motion.div>
                ))}
            </motion.div>
        </Container>
    );
}