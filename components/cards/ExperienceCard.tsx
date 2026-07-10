import { Calendar, MapPin } from "lucide-react";
import { Experience } from "@/types/experience";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateRange } from "@/lib/utils";

export interface ExperienceCardProps {
    experience: Experience;
}

/**
 * Displays a single work experience entry: role, company, date range,
 * responsibilities, and technologies used. Used in a vertical list
 * within ExperienceSection.
 */
export function ExperienceCard({ experience }: ExperienceCardProps) {
    const {
        role,
        company,
        location,
        employmentType,
        startDate,
        endDate,
        description,
        responsibilities,
        technologies,
    } = experience;

    return (
        <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <CardTitle>{role}</CardTitle>
                    <p className="text-sm font-medium text-primary">{company}</p>
                </div>
                {employmentType && <Badge variant="outline">{employmentType}</Badge>}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDateRange(startDate, endDate)}
                </span>
                {location && (
                    <span className="inline-flex items-center gap-1">
                        <MapPin size={14} />
                        {location}
                    </span>
                )}
            </div>

            <CardDescription>{description}</CardDescription>

            {responsibilities && responsibilities.length > 0 && (
                <ul className="flex flex-col gap-1.5 text-sm text-muted">
                    {responsibilities.map((item) => (
                        <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            {item}
                        </li>
                    ))}
                </ul>
            )}

            {technologies && technologies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {technologies.map((tech) => (
                        <Badge key={tech}>{tech}</Badge>
                    ))}
                </div>
            )}
        </Card>
    );
}