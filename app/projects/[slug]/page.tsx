import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CATALOGUE_CARD_SIZES, ProjectCard } from "@/components/cards/ProjectCard";
import { ProjectVisual } from "@/components/projects/ProjectVisual";
import { ProjectSpecSheet } from "@/components/projects/ProjectSpecSheet";
import { ProjectCallouts } from "@/components/projects/ProjectCallouts";
import { CredentialsPlate } from "@/components/projects/CredentialsPlate";
import { ProjectGallery } from "@/components/projects/ProjectGallery";
import { ProjectPager } from "@/components/projects/ProjectPager";
import { buildMetadata } from "@/lib/metadata";
import { PROJECTS_PATH } from "@/lib/projectFilters";
import {
    buildProjectStructuredData,
    buildBreadcrumbStructuredData,
    serializeJsonLd,
} from "@/lib/structuredData";
import { SITE_URL } from "@/lib/constants";
import { getProjects, getProjectBySlug } from "@/services/projectService";

// Every project page comes from data/projects.ts, so the prerendered set is
// complete. Closing the route means an unknown slug 404s from the static
// build instead of triggering an on-demand (rate-limited) GitHub fetch.
export const dynamicParams = false;

export async function generateStaticParams() {
    const projects = await getProjects();
    return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const project = await getProjectBySlug(slug);

    if (!project) {
        return buildMetadata({
            title: "Project Not Found",
            description: "The requested project could not be found.",
            path: PROJECTS_PATH,
        });
    }

    // A case study is dated content, not a standing page: `article` lets the
    // published/modified times below be read as the piece's own dates. Both
    // come from GitHub via the adapter and are simply absent for a project
    // with no matched repo.
    return buildMetadata({
        title: project.title,
        description: project.description,
        path: `/projects/${project.slug}`,
        type: "article",
        publishedTime: project.publishedAt,
        modifiedTime: project.lastUpdated,
        keywords: [project.title, ...project.technologies, "case study"],
    });
}

/**
 * A project case study (docs/uiux.md §4.6).
 *
 * Three bands: a full-bleed header carrying the project's own imagery, a
 * two-column body with a sticky spec sheet in the left rail, and the closing
 * navigation. Everything on the page except the gallery's lightbox trigger and
 * the credential copy buttons is server-rendered.
 */
export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const project = await getProjectBySlug(slug);

    if (!project) {
        notFound();
    }

    const allProjects = await getProjects();

    const heroDescription = project.longDescription ?? project.description;
    const screenshots = project.screenshots ?? [];

    /*
     * Pager order is the curated catalogue order — the same sequence
     * getProjects() returns and /projects shows by default — so "next" means
     * the card after this one, not a second ordering the visitor never chose.
     */
    const position = allProjects.findIndex((entry) => entry.slug === project.slug);

    const relatedProjects = allProjects
        .filter((item) => item.slug !== project.slug)
        .sort((a, b) => {
            const overlap = (item: typeof project) =>
                item.technologies.filter((tech) => project.technologies.includes(tech)).length;
            return overlap(b) - overlap(a);
        })
        .slice(0, 3);

    const breadcrumbItems = [
        { name: "Home", url: SITE_URL },
        { name: "Projects", url: `${SITE_URL}${PROJECTS_PATH}` },
        { name: project.title, url: `${SITE_URL}/projects/${project.slug}` },
    ];

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: serializeJsonLd(buildProjectStructuredData(project)),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: serializeJsonLd(buildBreadcrumbStructuredData(breadcrumbItems)),
                }}
            />

            {/*
             * Full-bleed header. The visual is the page's LCP element, so it is
             * preloaded — `priority` is deprecated in Next 16 in favour of
             * `preload` (see the Version History table in
             * node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md).
             * A vertical scrim sits between the picture and the copy; without
             * it the title's contrast would depend on whatever happens to be in
             * that screenshot's top-left corner.
             */}
            <header className="relative isolate overflow-hidden border-b border-line">
                <ProjectVisual
                    project={project}
                    sizes="100vw"
                    preload
                    revealOnHover={false}
                    className="absolute inset-0 -z-10"
                />
                <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 bg-linear-to-t from-void via-void/92 to-void/70"
                />

                <Container className="flex flex-col gap-6 pt-10 pb-12 md:pt-14 md:pb-16">
                    <Link
                        href={PROJECTS_PATH}
                        className="bp-focus bp-meta inline-flex w-fit items-center gap-2 text-ink-muted transition-colors duration-fast ease-bp hover:text-accent"
                    >
                        <ArrowLeft size={14} aria-hidden="true" />
                        All projects
                    </Link>

                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="tracking-widest uppercase">
                            Case study
                        </Badge>
                        {project.featured && (
                            <Badge variant="signal" className="tracking-widest uppercase">
                                Featured
                            </Badge>
                        )}
                    </div>

                    <h1 className="max-w-4xl font-display text-h2 font-bold text-balance text-ink">
                        {project.title}
                    </h1>

                    <p className="max-w-3xl text-body-lg text-pretty text-ink-muted">
                        {heroDescription}
                    </p>

                    <div className="flex flex-wrap gap-3">
                        {project.liveUrl && (
                            <Button href={project.liveUrl} external variant="primary">
                                <ExternalLink size={16} aria-hidden="true" />
                                Open live demo
                            </Button>
                        )}
                        {project.githubUrl && (
                            <Button href={project.githubUrl} external variant="secondary">
                                <SiGithub size={16} aria-hidden="true" />
                                View repository
                            </Button>
                        )}
                    </div>
                </Container>
            </header>

            <Container className="bp-section-y flex flex-col gap-14">
                <div className="grid gap-10 lg:grid-cols-[19rem_1fr] lg:items-start">
                    {/*
                     * The rail sticks below the 64px navbar. `self-start` is
                     * what makes it work at all — a grid item stretches to the
                     * row's height by default, leaving nothing for `sticky` to
                     * slide within.
                     */}
                    <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
                        <ProjectSpecSheet project={project} />

                        {project.testCredentials && (
                            <CredentialsPlate
                                password={project.testCredentials.password}
                                accounts={project.testCredentials.accounts}
                                title={project.title}
                            />
                        )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-12">
                        <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech) => (
                                <Badge key={tech}>{tech}</Badge>
                            ))}
                        </div>

                        {project.keyFeatures && project.keyFeatures.length > 0 && (
                            <ProjectCallouts
                                title="What I built"
                                headingId="features-heading"
                                description="The core functionality and user experience delivered in this work."
                                items={project.keyFeatures}
                            />
                        )}

                        {project.challenges && project.challenges.length > 0 && (
                            <ProjectCallouts
                                title="Challenges"
                                headingId="challenges-heading"
                                description="Constraints and trade-offs that shaped the build."
                                items={project.challenges}
                            />
                        )}

                        {project.lessonsLearned && project.lessonsLearned.length > 0 && (
                            <ProjectCallouts
                                title="Lessons learned"
                                headingId="lessons-heading"
                                items={project.lessonsLearned}
                            />
                        )}

                        {project.futureImprovements && project.futureImprovements.length > 0 && (
                            <ProjectCallouts
                                title="Future direction"
                                headingId="future-heading"
                                description="Extensions that would take this further."
                                items={project.futureImprovements}
                            />
                        )}

                        {screenshots.length > 0 && (
                            <section
                                aria-labelledby="gallery-heading"
                                className="flex flex-col gap-5"
                            >
                                <h2
                                    id="gallery-heading"
                                    className="font-display text-h3 font-medium text-ink"
                                >
                                    Screens
                                </h2>
                                <ProjectGallery images={screenshots} title={project.title} />
                            </section>
                        )}
                    </div>
                </div>

                <ProjectPager
                    previous={position > 0 ? allProjects[position - 1] : undefined}
                    next={
                        position >= 0 && position < allProjects.length - 1
                            ? allProjects[position + 1]
                            : undefined
                    }
                />

                {relatedProjects.length > 0 && (
                    <section aria-labelledby="related-heading" className="flex flex-col gap-6">
                        <h2
                            id="related-heading"
                            className="font-display text-h3 font-medium text-ink"
                        >
                            Related projects
                        </h2>
                        {/* Same breakpoints as /projects, so CATALOGUE_CARD_SIZES describes this grid too. */}
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {relatedProjects.map((relatedProject) => (
                                <ProjectCard
                                    key={relatedProject.slug}
                                    project={relatedProject}
                                    sizes={CATALOGUE_CARD_SIZES}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </Container>
        </>
    );
}
