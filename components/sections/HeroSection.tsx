"use client";

import { motion } from "framer-motion";
import { Download, Mail } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AUTHOR, SITE_DESCRIPTION } from "@/lib/constants";
import { skills } from "@/data/skills";
import { projects } from "@/data/projects";
import { experience } from "@/data/experience";
import { fadeInUp, staggerContainer } from "@/lib/animations";

/**
 * Assumes a resume file will live at /public/resume/resume.pdf — update
 * once the actual filename is confirmed (public/resume/ exists but its
 * contents weren't shown in progress.md).
 */
const RESUME_PATH = "/resume/resume.pdf";

const featuredSkills = skills.filter((skill) => skill.featured);

/**
 * Stats are counts derived directly from data/*.ts — no fabricated
 * "years of experience" figure, since that isn't something CV.md states.
 */
const stats = [
    { label: "Projects Built", value: projects.length },
    { label: "Technologies", value: skills.length },
    { label: "Roles Held", value: experience.length },
];

export function HeroSection() {
    return (
        <Container
            as="section"
            className="flex min-h-[calc(100vh-4rem)] flex-col justify-center gap-10 py-20"
        >
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="flex flex-col gap-6"
            >
                <motion.span
                    variants={fadeInUp}
                    className="text-sm font-medium uppercase tracking-wider text-primary"
                >
                    {AUTHOR.role}
                </motion.span>

                <motion.h1
                    variants={fadeInUp}
                    className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl"
                >
                    Hi, I&apos;m {AUTHOR.name.split(" ")[0]}.
                </motion.h1>

                <motion.p variants={fadeInUp} className="max-w-xl text-base text-muted sm:text-lg">
                    {SITE_DESCRIPTION}
                </motion.p>

                <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                    <Button href="#projects" variant="primary" size="lg">
                        View Projects
                    </Button>
                    <Button href="#contact" variant="outline" size="lg">
                        <Mail size={18} />
                        Get in Touch
                    </Button>
                    <Button href={RESUME_PATH} variant="ghost" size="lg" external>
                        <Download size={18} />
                        Resume
                    </Button>
                </motion.div>

                <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 pt-2">
                    {featuredSkills.map((skill) => (
                        <Badge key={skill.id} variant="outline">
                            {skill.name}
                        </Badge>
                    ))}
                </motion.div>
            </motion.div>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="flex flex-wrap gap-10 border-t border-muted/10 pt-8"
            >
                {stats.map((stat) => (
                    <motion.div key={stat.label} variants={fadeInUp} className="flex flex-col gap-1">
                        <span className="font-heading text-3xl font-semibold text-foreground">
                            {stat.value}+
                        </span>
                        <span className="text-sm text-muted">{stat.label}</span>
                    </motion.div>
                ))}
            </motion.div>
        </Container>
    );
}