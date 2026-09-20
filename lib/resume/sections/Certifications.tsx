import { Text, View } from "@react-pdf/renderer";
import { RailLabel } from "@/lib/resume/sections/Primitives";
import { styles } from "@/lib/resume/theme";
import type { ResumeCertification } from "@/lib/resume/model";

/**
 * Certifications, in the rail.
 *
 * Renders nothing at all while `data/certifications.ts` is empty — which it is,
 * deliberately: nothing in the CV is a credential, and the site's certifications
 * strip makes the same choice rather than showing placeholder rows. Adding the
 * first real one is a push to that file and no change here.
 */
export function Certifications({ entries }: { entries: ResumeCertification[] }) {
    if (entries.length === 0) {
        return null;
    }

    return (
        <View style={styles.railGroup}>
            <RailLabel>Certifications</RailLabel>

            {entries.map((entry) => (
                <View key={entry.name} style={{ marginBottom: 6 }}>
                    <Text style={styles.railEntryTitle}>{entry.name}</Text>
                    <Text style={styles.railEntryMeta}>{entry.issuer}</Text>
                    <Text style={styles.railEntryDates}>{entry.year}</Text>
                </View>
            ))}
        </View>
    );
}
