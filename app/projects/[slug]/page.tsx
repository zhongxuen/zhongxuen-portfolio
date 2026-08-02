import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { Container } from "@/components/ui/Container";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { projects } from "@/data/projects";
import { buildMetadata } from "@/lib/metadata";
import { buildProjectStructuredData } from "@/lib/structuredData";
import { getPortfolioRepos } from "@/services/githubService";
import { mergeProjectsWithRepos } from "@/adapters/githubProjectAdapter";

const getEnrichedProjectBySlug = cache(async (slug: string) => {
    const repos = await getPortfolioRepos();
    const enrichedProjects = mergeProjectsWithRepos(projects, repos);
    return enrichedProjects.find((item) => item.slug === slug);
});

export async function generateStaticParams() {
    const repos = await getPortfolioRepos();
    const enrichedProjects = mergeProjectsWithRepos(projects, repos);

    return enrichedProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const project = await getEnrichedProjectBySlug(slug);

    if (!project) {
        return buildMetadata({
            title: "Project Not Found",
            description: "The requested project could not be found.",
            path: "/projects",
        });
    }

    return buildMetadata({
        title: project.title,
        description: project.description,
        path: `/projects/${project.slug}`,
    });
}

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const project = await getEnrichedProjectBySlug(slug);

    if (!project) {
        notFound();
    }

    const heroDescription = project.longDescription ?? project.description;
    const featuredImage = project.screenshots?.[0] ?? "/og/default.png";

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(buildProjectStructuredData(project)),
                }}
            />

            <Container as="section" className="py-16 md:py-24">
                <div className="mb-8">
                    <Button href="/projects" variant="ghost" size="sm" className="mb-6">
                        <ArrowLeft size={16} />
                        Back to projects
                    </Button>

                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <Badge variant="success">Case study</Badge>
                        {project.featured && <Badge variant="secondary">Featured project</Badge>}
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h1 className="font-heading text-4xl font-semibold text-foreground sm:text-5xl">
                                    {project.title}
                                </h1>
                                <p className="max-w-3xl text-lg leading-relaxed text-muted">
                                    {heroDescription}
                                </p>
                            </div>

                            {project.testCredentials && (
                                <div className="max-w-3xl rounded-lg border border-muted/10 bg-muted/5 p-4 text-sm text-muted">
                                    <p className="mb-2 font-medium text-foreground">
                                        Test accounts (password:{" "}
                                        <code className="rounded bg-muted/10 px-1 py-0.5 text-foreground">
                                            {project.testCredentials.password}
                                        </code>{" "}
                                        for all):
                                    </p>
                                    <ul className="list-disc space-y-1 pl-5">
                                        {project.testCredentials.accounts.map((account) => (
                                            <li key={account}>
                                                <code className="rounded bg-muted/10 px-1 py-0.5 text-foreground">
                                                    {account}
                                                </code>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                {project.githubUrl && (
                                    <Button href={project.githubUrl} external variant="primary">
                                        <SiGithub size={16} />
                                        View repository
                                    </Button>
                                )}
                                {project.liveUrl && (
                                    <Button href={project.liveUrl} external variant="outline">
                                        <ExternalLink size={16} />
                                        Live demo
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {project.technologies.map((tech) => (
                                    <Badge key={tech}>{tech}</Badge>
                                ))}
                            </div>
                        </div>

                        <Card className="space-y-4">
                            <CardTitle>Project snapshot</CardTitle>
                            <CardDescription>
                                A focused overview of the stack, delivery goals, and implementation scope for this project.
                            </CardDescription>
                            <ul className="space-y-3 text-sm text-muted">
                                {project.githubUrl && (
                                    <li>
                                        <span className="font-medium text-foreground">Repository:</span>{" "}
                                        <a
                                            href={project.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary transition-colors hover:text-primary/80"
                                        >
                                            {project.githubUrl}
                                        </a>
                                    </li>
                                )}
                                <li>
                                    <span className="font-medium text-foreground">Stack:</span>{" "}
                                    {project.technologies.join(", ")}
                                </li>
                                <li>
                                    <span className="font-medium text-foreground">Visibility:</span>{" "}
                                    {project.featured ? "Featured project" : "Portfolio highlight"}
                                </li>
                            </ul>
                        </Card>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <Card className="space-y-4">
                        <CardTitle>What I built</CardTitle>
                        <CardDescription>
                            The core functionality and user experience delivered in this work.
                        </CardDescription>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
                            {project.keyFeatures?.map((feature) => (
                                <li key={feature}>{feature}</li>
                            ))}
                        </ul>
                    </Card>

                    <Card className="space-y-4">
                        <CardTitle>Implementation notes</CardTitle>
                        <CardDescription>
                            A brief look at the constraints, trade-offs, and lessons that shaped the build.
                        </CardDescription>
                        <div className="space-y-4 text-sm text-muted">
                            {project.challenges && project.challenges.length > 0 && (
                                <div>
                                    <h3 className="mb-2 font-medium text-foreground">Challenges</h3>
                                    <ul className="list-disc space-y-1 pl-5">
                                        {project.challenges.map((challenge) => (
                                            <li key={challenge}>{challenge}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {project.lessonsLearned && project.lessonsLearned.length > 0 && (
                                <div>
                                    <h3 className="mb-2 font-medium text-foreground">Lessons learned</h3>
                                    <ul className="list-disc space-y-1 pl-5">
                                        {project.lessonsLearned.map((lesson) => (
                                            <li key={lesson}>{lesson}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <Card className="space-y-4">
                        <CardTitle>Project visuals</CardTitle>
                        <CardDescription>
                            A lightweight preview surface for the work until additional screenshots are added to the project data.
                        </CardDescription>
                        <div className="relative h-64 w-full overflow-hidden rounded-lg border border-muted/10">
                            <Image
                                src={featuredImage}
                                alt={`Preview for ${project.title}`}
                                fill
                                className="object-cover"
                                sizes="(min-width: 1024px) 50vw, 100vw"
                            />
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <CardTitle>Future direction</CardTitle>
                        <CardDescription>
                            Potential improvements or extensions that could expand this project further.
                        </CardDescription>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
                            {project.futureImprovements?.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </Container>
        </>
    );
}
