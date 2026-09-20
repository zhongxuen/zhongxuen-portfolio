import { Text, View } from "@react-pdf/renderer";
import { RailLabel } from "@/lib/resume/sections/Primitives";
import { styles } from "@/lib/resume/theme";
import type { ResumeEducation } from "@/lib/resume/model";

/**
 * Education, in the rail, newest first.
 *
 * The degree names in `data/education.ts` are long — "Diploma in Information &
 * Communication Technology (Software Engineering)" wraps to three lines here —
 * and they are printed in full anyway. A truncated qualification is a different
 * qualification.
 */
export function Education({ entries }: { entries: ResumeEducation[] }) {
    if (entries.length === 0) {
        return null;
    }

    return (
        <View style={styles.railGroup}>
            <RailLabel>Education</RailLabel>

            {entries.map((entry) => (
                <View key={`${entry.institution}-${entry.degree}`} style={{ marginBottom: 7 }}>
                    <Text style={styles.railEntryTitle}>{entry.degree}</Text>
                    <Text style={styles.railEntryMeta}>{entry.institution}</Text>
                    <Text style={styles.railEntryDates}>{entry.dates}</Text>
                    {entry.detail && <Text style={styles.railEntryDates}>{entry.detail}</Text>}
                </View>
            ))}
        </View>
    );
}
