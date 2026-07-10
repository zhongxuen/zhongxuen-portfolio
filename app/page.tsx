import { notFound } from "next/navigation";
import { projects } from "@/data/projects";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buildMetadata } from "@/lib/metadata";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { ExternalLink } from "lucide-react";

interface Props {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const project = projects.find((p) => p.slug === slug);
    if (!project) return buildMetadata();
    return buildMetadata({
        title: project.title,
        description: project.description,
        path: `/projects/${slug}`,
    });
}

export default async function ProjectDetailPage({ params }: Props) {
    const { slug } = await params;
    const project = projects.find((p) => p.slug === slug);
    if (!project) notFound();

    return (
        <Container as="section" className="flex flex-col gap-10 py-20 md:py-28">
            <div className="flex flex-col gap-4">
                <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">
                    {project.title}
                </h1>
                <p className="max-w-2xl text-muted">{project.longDescription ?? project.description}</p>
                <div className="flex flex-wrap gap-2">
                    {project.technologies.map((t) => (
                        <Badge key={t}>{t}</Badge>
                    ))}
                </div>
                <div className="flex gap-3 pt-2">
                    <Button href={project.githubUrl} variant="outline" size="sm">
                        <SiGithub size={16} />
                        Code
                    </Button>
                    {project.liveUrl && (
                        <Button href={project.liveUrl} variant="primary" size="sm">
                            Live Demo
                            <ExternalLink size={16} />
                        </Button>
                    )}
                </div>
            </div>

            {project.keyFeatures && (
                <section className="flex flex-col gap-3">
                    <h2 className="font-heading text-xl font-semibold">Key Features</h2>
                    <ul className="flex flex-col gap-1.5 text-sm text-muted">
                        {project.keyFeatures.map((f) => (
                            <li key={f}>• {f}</li>
                        ))}
                    </ul>
                </section>
            )}

            {project.challenges && (
                <section className="flex flex-col gap-3">
                    <h2 className="font-heading text-xl font-semibold">Challenges</h2>
                    <ul className="flex flex-col gap-1.5 text-sm text-muted">
                        {project.challenges.map((c) => (
                            <li key={c}>• {c}</li>
                        ))}
                    </ul>
                </section>
            )}

            {project.lessonsLearned && (
                <section className="flex flex-col gap-3">
                    <h2 className="font-heading text-xl font-semibold">Lessons Learned</h2>
                    <ul className="flex flex-col gap-1.5 text-sm text-muted">
                        {project.lessonsLearned.map((l) => (
                            <li key={l}>• {l}</li>
                        ))}
                    </ul>
                </section>
            )}
        </Container>
    );
}