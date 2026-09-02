import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { EducationSection } from "@/components/sections/EducationSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { getProjects } from "@/services/projectService";
import { getResumeMeta } from "@/lib/resume";

/**
 * How many projects the homepage falls back to when nothing is flagged
 * `featured` in data/projects.ts — the section should degrade to a short
 * curated-looking grid, never to an empty one.
 */
const FEATURED_FALLBACK_COUNT = 6;

export default async function HomePage() {
    const projects = await getProjects();

    /*
     * The homepage shows featured work only; /projects owns the complete,
     * filterable list. Both read the same getProjects() result, so the hero's
     * count is the real total even though the grid below it is a subset.
     */
    const featured = projects.filter((project) => project.featured);
    const showcase = featured.length > 0 ? featured : projects.slice(0, FEATURED_FALLBACK_COUNT);

    /*
     * The hero's project count and resume file size are resolved here, on the
     * server, and passed down. Both are facts about real artifacts — the merged
     * project list and the PDF on disk — and neither should be re-derived or
     * hardcoded inside a client component.
     */
    const resume = getResumeMeta();

    return (
        <>
            <HeroSection projectCount={projects.length} resume={resume} />
            <AboutSection />
            <SkillsSection />
            <ProjectsSection projects={showcase} totalCount={projects.length} />
            <ExperienceSection />
            <EducationSection />
            <ContactSection />
        </>
    );
}
