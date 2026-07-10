"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EducationCard } from "@/components/cards/EducationCard";
import { education } from "@/data/education";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

const sortedEducation = [...education].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
);

export function EducationSection() {
    return (
        <Container as="section" id="education" className="flex flex-col gap-10 py-20 md:py-28">
            <SectionHeading eyebrow="Education" title="Academic background" />

            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={defaultViewport}
                variants={staggerContainer}
                className="flex flex-col gap-6"
            >
                {sortedEducation.map((entry) => (
                    <motion.div key={entry.id} variants={fadeInUp}>
                        <EducationCard education={entry} />
                    </motion.div>
                ))}
            </motion.div>
        </Container>
    );
}