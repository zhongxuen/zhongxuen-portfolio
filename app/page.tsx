import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { EducationSection } from "@/components/sections/EducationSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { projects as localProjects } from "@/data/projects";
import { getPortfolioRepos } from "@/services/githubService";
import { mergeProjectsWithRepos } from "@/adapters/githubProjectAdapter";

export default async function HomePage() {
    const repos = await getPortfolioRepos();
    const projects = mergeProjectsWithRepos(localProjects, repos).sort(
        (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
    );

    return (
        <>
            <HeroSection />
            <AboutSection />
            <SkillsSection />
            <ProjectsSection projects={projects} />
            <ExperienceSection />
            <EducationSection />
            <ContactSection />
        </>
    );
}