import { ExternalLink, Star } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { Project } from "@/types/project";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface ProjectCardProps {
    project: Project;
}

/**
 * Displays a single project summary: title, description, tech stack,
 * and links to the repo / live demo. `stars` and `language` are
 * GitHub-derived fields (types/project.ts) — they render only when
 * present, since local-only project entries won't have them until
 * merged via adapters/githubProjectAdapter.ts.
 */
export function ProjectCard({ project }: ProjectCardProps) {
    const {
        title,
        description,
        technologies,
        githubUrl,
        liveUrl,
        stars,
        language,
        featured,
    } = project;

    return (
        <Card interactive className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
                <CardTitle>{title}</CardTitle>
                {featured && <Badge variant="success">Featured</Badge>}
            </div>

            <CardDescription>{description}</CardDescription>

            <div className="flex flex-wrap gap-2">
                {technologies.map((tech) => (
                    <Badge key={tech}>{tech}</Badge>
                ))}
            </div>

            {(language || stars !== undefined) && (
                <div className="flex items-center gap-4 text-xs text-muted">
                    {language && <span>{language}</span>}
                    {stars !== undefined && (
                        <span className="inline-flex items-center gap-1">
                            <Star size={14} />
                            {stars}
                        </span>
                    )}
                </div>
            )}

            <div className="mt-auto flex gap-3 pt-2">
                <Button href={githubUrl} variant="outline" size="sm">
                    <SiGithub size={16} />
                    Code
                </Button>
                {liveUrl && (
                    <Button href={liveUrl} variant="primary" size="sm">
                        Live Demo
                        <ExternalLink size={16} />
                    </Button>
                )}
            </div>
        </Card>
    );
}