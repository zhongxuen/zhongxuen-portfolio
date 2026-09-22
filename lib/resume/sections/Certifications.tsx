import { FactRow, Section } from "@/lib/resume/sections/Primitives";
import type { ResumeCertification } from "@/lib/resume/model";

/**
 * Certifications, one table row each: year on the left, credential and issuer
 * on the right.
 *
 * Renders nothing at all while `data/certifications.ts` is empty — the site's
 * certifications strip makes the same choice rather than showing placeholder
 * rows. Adding the first real one is a push to that file and no change here.
 */
export function Certifications({ entries }: { entries: ResumeCertification[] }) {
    if (entries.length === 0) {
        return null;
    }

    return (
        <Section label="Certifications">
            {entries.map((entry) => (
                <FactRow key={entry.name} label={entry.year}>
                    {`${entry.name} — ${entry.issuer}`}
                </FactRow>
            ))}
        </Section>
    );
}
