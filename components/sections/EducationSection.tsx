import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Timeline, type TimelineNode } from "@/components/ui/Timeline";
import { CertificationsStrip } from "@/components/sections/CertificationsStrip";
import { education } from "@/data/education";
import { formatDateRange, sortByStartDateDesc } from "@/lib/utils";

/**
 * Academic history on the same timeline as Experience (docs/uiux.md §4.7), so
 * the two sections read as one continuous record rather than two card stacks
 * with slightly different anatomy.
 *
 * Honours map to the node's bullet list and coursework to its tags — the same
 * two slots responsibilities and technologies fill on the experience side.
 */
const nodes: TimelineNode[] = sortByStartDateDesc(education).map((entry) => ({
    id: entry.id,
    period: formatDateRange(entry.startDate, entry.endDate),
    title: entry.degree,
    subtitle: entry.institution,
    subtitleUrl: entry.institutionUrl,
    meta: [entry.location, entry.gpa ? `GPA ${entry.gpa}` : undefined],
    description: entry.description,
    points: entry.honors,
    tags: entry.relevantCourses,
    tagVariant: "outline" as const,
    current: !entry.endDate || entry.endDate === "Present",
}));

export function EducationSection() {
    return (
        <Container
            as="section"
            id="education"
            aria-labelledby="education-heading"
            className="bp-section-y flex flex-col gap-10"
        >
            <SectionHeading
                index={5}
                headingId="education-heading"
                eyebrow="Education"
                title="Academic background"
            />

            <Timeline nodes={nodes} />

            {/* Renders nothing while data/certifications.ts is empty. */}
            <CertificationsStrip />
        </Container>
    );
}
