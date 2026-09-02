import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkillCard } from "@/components/cards/SkillCard";
import { SkillCategoryFilter } from "@/components/skills/SkillCategoryFilter";
import { Reveal } from "@/components/motion/Reveal";
import { skills } from "@/data/skills";
import { Skill, SkillCategory } from "@/types/skill";
import { revealDelay, stagger } from "@/lib/reveal";
import { slugify } from "@/lib/utils";

/** The `id` on the section — the filter's `:has()` rules are scoped to it. */
const SCOPE_ID = "skills";

/** Attribute each category panel carries, holding its slug. */
const PANEL_ATTRIBUTE = "data-skill-category";

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

const grouped = groupByCategory();

const categories = grouped.map(([name, categorySkills]) => ({
    name,
    slug: slugify(name),
    count: categorySkills.length,
}));

/**
 * What the author works with (docs/uiux.md §4.4).
 *
 * The flat twenty-two-tile grid is now one bordered plate per category, each
 * headed with a mono count (`FRAMEWORKS / 04`), plus a segmented filter across
 * the top. Both the grouping and the filter's options come from data/skills.ts,
 * so adding a skill needs no change here.
 *
 * Still a Server Component, and still zero client JavaScript: the filter is a
 * radio group driving CSS `:has()` rules (see SkillCategoryFilter), and the
 * entrance cascade is the shared `[data-reveal]` choreography.
 */
export function SkillsSection() {
    return (
        <Container
            as="section"
            id={SCOPE_ID}
            aria-labelledby="skills-heading"
            className="bp-section-y flex flex-col gap-10"
        >
            <SectionHeading
                index={2}
                headingId="skills-heading"
                eyebrow="Skills"
                title="What I work with"
                description="Organized by category rather than proficiency bars — depth varies, but these are the tools I reach for."
            />

            <SkillCategoryFilter
                categories={categories}
                scopeId={SCOPE_ID}
                panelAttribute={PANEL_ATTRIBUTE}
            />

            <div className="flex flex-col gap-6">
                {grouped.map(([category, categorySkills]) => {
                    const headingId = `skills-${slugify(category)}-heading`;

                    return (
                        <section
                            key={category}
                            {...{ [PANEL_ATTRIBUTE]: slugify(category) }}
                            aria-labelledby={headingId}
                            data-fx="spotlight"
                            className="bp-ticks bp-ticks-live bp-lift isolate flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 md:p-6"
                        >
                            <span aria-hidden="true" className="bp-spotlight" />

                            <h3 id={headingId} className="bp-meta flex items-center gap-3 text-ink">
                                {category}
                                <span aria-hidden="true" className="text-ink-faint">
                                    /
                                </span>
                                <span className="text-accent tabular-nums">
                                    {String(categorySkills.length).padStart(2, "0")}
                                </span>
                                <span className="sr-only">skills</span>
                                <span
                                    aria-hidden="true"
                                    className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent"
                                />
                            </h3>

                            {/*
                             * One Reveal per category, not one per card: each
                             * group gets its own observer so a category still
                             * cascades when it scrolls into view, rather than
                             * all of them firing off the first one.
                             */}
                            <Reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                {categorySkills.map((skill, index) => (
                                    <div
                                        key={skill.id}
                                        data-reveal="up"
                                        style={revealDelay(stagger(index))}
                                    >
                                        <SkillCard skill={skill} />
                                    </div>
                                ))}
                            </Reveal>
                        </section>
                    );
                })}
            </div>
        </Container>
    );
}
