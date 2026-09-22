import { Text, View } from "@react-pdf/renderer";
import { Bullet, Chips, Section } from "@/lib/resume/sections/Primitives";
import { styles } from "@/lib/resume/theme";
import type { ResumeRole } from "@/lib/resume/model";

/**
 * Employment, newest first.
 *
 * Each entry is an accent-barred block (echoing `BlueprintPlate`) whose title row
 * is a flex row with the dates right-aligned — so the eye gets a clean right edge
 * down the column, which is the `MeasureLine` treatment in print.
 *
 * "EXPERIENCE", conventionally named and unconventionally styled. That is the
 * whole ATS strategy: a parser matches the heading text, a human sees the design.
 *
 * `wrap={false}` keeps a block from being split across a page break, which would
 * orphan a company name from its bullets.
 */
export function Experience({ roles }: { roles: ResumeRole[] }) {
    if (roles.length === 0) {
        return null;
    }

    return (
        <Section label="Work Experience">
            {roles.map((role) => (
                <View key={`${role.company}-${role.role}`} style={styles.entry} wrap={false}>
                    <View style={styles.entryHeader}>
                        <Text style={styles.entryTitle}>{role.role}</Text>
                        <Text style={styles.entryDates}>{role.dates}</Text>
                    </View>

                    <Text style={styles.entryMeta}>
                        {[role.company, role.employmentType, role.location]
                            .filter(Boolean)
                            .join(" · ")}
                    </Text>

                    {role.bullets.map((bullet) => (
                        <Bullet key={bullet}>{bullet}</Bullet>
                    ))}

                    <Chips items={role.technologies} />
                </View>
            ))}
        </Section>
    );
}
