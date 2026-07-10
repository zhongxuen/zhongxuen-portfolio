"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ExperienceCard } from "@/components/cards/ExperienceCard";
import { experience } from "@/data/experience";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

const sortedExperience = [...experience].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
);

export function ExperienceSection() {
    return (
        <Container as="section" id="experience" className="flex flex-col gap-10 py-20 md:py-28">
            <SectionHeading
                eyebrow="Experience"
                title="Where I've worked"
                description="Roles that shaped how I communicate, manage time, and work with people — alongside the software work."
            />

            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={defaultViewport}
                variants={staggerContainer}
                className="flex flex-col gap-6"
            >
                {sortedExperience.map((entry) => (
                    <motion.div key={entry.id} variants={fadeInUp}>
                        <ExperienceCard experience={entry} />
                    </motion.div>
                ))}
            </motion.div>
        </Container>
    );
}