import { FactRow, Section } from "@/lib/resume/sections/Primitives";
import type { ResumeFact } from "@/lib/resume/model";

/** Languages and interests — résumé-only facts from `data/resume.ts`. */
export function Additional({ facts }: { facts: ResumeFact[] }) {
    if (facts.length === 0) {
        return null;
    }

    return (
        <Section label="Additional Information">
            {facts.map((fact) => (
                <FactRow key={fact.label} label={fact.label}>
                    {fact.value}
                </FactRow>
            ))}
        </Section>
    );
}
