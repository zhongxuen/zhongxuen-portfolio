import { FactRow, Section } from "@/lib/resume/sections/Primitives";
import type { ResumeSkillGroup } from "@/lib/resume/model";

/**
 * Skills as a two-column table: category on the left, the names as one
 * comma-separated line on the right.
 *
 * Text rather than chips here: seven categories of chips run to a third of a
 * page, and a comma list at full column width reads as a list, not as prose.
 * Every name is real text, so an ATS reads it as a word list either way.
 */
export function Skills({ groups }: { groups: ResumeSkillGroup[] }) {
    if (groups.length === 0) {
        return null;
    }

    return (
        <Section label="Technical Skills & Tools">
            {groups.map((group) => (
                <FactRow key={group.category} label={group.category}>
                    {group.items.join(", ")}
                </FactRow>
            ))}
        </Section>
    );
}
