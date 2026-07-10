"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkillCard } from "@/components/cards/SkillCard";
import { skills } from "@/data/skills";
import { Skill, SkillCategory } from "@/types/skill";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

/**
 * Preserves category order as it first appears in data/skills.ts rather
 * than alphabetizing, so the intentional ordering there (Programming
 * Languages first, etc.) is respected.
 */
function groupByCategory(): [SkillCategory, Skill[]][] {
    const order: SkillCategory[] = [];
    const groups = new Map<SkillCategory, Skill[]>();

    for (const skill of skills) {
        if (!groups.has(skill.category)) {
            groups.set(skill.category, []);
            order.push(skill.category);
        }
        groups.get(skill.category)!.push(skill);
    }

    return order.map((category) => [category, groups.get(category)!]);
}

export function SkillsSection() {
    const grouped = groupByCategory();

    return (
        <Container as="section" id="skills" className="flex flex-col gap-12 py-20 md:py-28">
            <SectionHeading
                eyebrow="Skills"
                title="What I work with"
                description="Organized by category rather than proficiency bars — depth varies, but these are the tools I reach for."
            />

            <div className="flex flex-col gap-10">
                {grouped.map(([category, categorySkills]) => (
                    <div key={category} className="flex flex-col gap-4">
                        <h3 className="font-heading text-lg font-semibold text-foreground">
                            {category}
                        </h3>

                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={defaultViewport}
                            variants={staggerContainer}
                            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                        >
                            {categorySkills.map((skill) => (
                                <motion.div key={skill.id} variants={fadeInUp}>
                                    <SkillCard skill={skill} />
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                ))}
            </div>
        </Container>
    );
}