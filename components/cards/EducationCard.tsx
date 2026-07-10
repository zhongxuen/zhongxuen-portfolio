import { Calendar, MapPin, Award } from "lucide-react";
import { Education } from "@/types/education";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateRange } from "@/lib/utils";

export interface EducationCardProps {
    education: Education;
}

/**
 * Displays a single education entry: degree, institution, date range,
 * relevant coursework, and honors. Used in a vertical list within
 * EducationSection.
 */
export function EducationCard({ education }: EducationCardProps) {
    const {
        degree,
        institution,
        institutionUrl,
        location,
        startDate,
        endDate,
        gpa,
        relevantCourses,
        honors,
        description,
    } = education;

    return (
        <Card className="flex flex-col gap-4">
            <div>
                <CardTitle>{degree}</CardTitle>
                {institutionUrl ? (
                    <a
                        href={institutionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        {institution}
                    </a>
                ) : (
                    <p className="text-sm font-medium text-primary">{institution}</p>
                )}
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
                {gpa && <span>GPA: {gpa}</span>}
            </div>

            {description && <CardDescription>{description}</CardDescription>}

            {relevantCourses && relevantCourses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {relevantCourses.map((course) => (
                        <Badge key={course} variant="outline">
                            {course}
                        </Badge>
                    ))}
                </div>
            )}

            {honors && honors.length > 0 && (
                <ul className="flex flex-col gap-1.5 text-sm text-muted">
                    {honors.map((honor) => (
                        <li key={honor} className="flex items-center gap-2">
                            <Award size={14} className="shrink-0 text-success" />
                            {honor}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}