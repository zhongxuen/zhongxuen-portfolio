import { Text, View } from "@react-pdf/renderer";
import { Bullet, Section } from "@/lib/resume/sections/Primitives";
import { styles } from "@/lib/resume/theme";
import type { ResumeEducation } from "@/lib/resume/model";

/**
 * Education, newest first, in the same accent-barred blocks as Experience.
 *
 * The degree names in `data/education.ts` are long and printed in full anyway —
 * a truncated qualification is a different qualification.
 */
export function Education({ entries }: { entries: ResumeEducation[] }) {
    if (entries.length === 0) {
        return null;
    }

    return (
        <Section label="Education">
            {entries.map((entry) => (
                <View
                    key={`${entry.institution}-${entry.degree}`}
                    style={styles.entry}
                    wrap={false}
                >
                    <View style={styles.entryHeader}>
                        <Text style={{ ...styles.entryTitle, flexShrink: 1, lineHeight: 1.3 }}>
                            {entry.degree}
                        </Text>
                        <Text style={styles.entryDates}>{entry.dates}</Text>
                    </View>

                    <Text style={styles.entryMeta}>
                        {[entry.institution, entry.location].filter(Boolean).join(" · ")}
                    </Text>

                    {entry.details.map((detail) => (
                        <Bullet key={detail}>{detail}</Bullet>
                    ))}

                    {entry.coursework && (
                        <Bullet>{`Relevant coursework: ${entry.coursework}`}</Bullet>
                    )}
                </View>
            ))}
        </Section>
    );
}
