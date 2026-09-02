import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Timeline, type TimelineNode } from "@/components/ui/Timeline";
import { experience } from "@/data/experience";
import { formatDateRange, sortByStartDateDesc } from "@/lib/utils";

/**
 * Work history on the shared timeline (docs/uiux.md §4.7).
 *
 * "Current" is `endDate` being "Present" or absent, not a comparison against
 * today's date. A clock read at module scope would be baked into the static
 * build and then quietly go stale, and an entry that records a fixed end date
 * has, by its own data, an end.
 */
const nodes: TimelineNode[] = sortByStartDateDesc(experience).map((entry) => ({
    id: entry.id,
    period: formatDateRange(entry.startDate, entry.endDate),
    title: entry.role,
    subtitle: entry.company,
    subtitleUrl: entry.companyUrl,
    meta: [entry.employmentType, entry.location],
    description: entry.description,
    points: entry.responsibilities,
    tags: entry.technologies,
    current: !entry.endDate || entry.endDate === "Present",
}));

export function ExperienceSection() {
    return (
        <Container
            as="section"
            id="experience"
            aria-labelledby="experience-heading"
            className="bp-section-y flex flex-col gap-10"
        >
            <SectionHeading
                index={4}
                headingId="experience-heading"
                eyebrow="Experience"
                title="Where I've worked"
                description="Roles that shaped how I communicate, manage time, and work with people — alongside the software work."
            />

            <Timeline nodes={nodes} />
        </Container>
    );
}
