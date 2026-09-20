import { Text, View } from "@react-pdf/renderer";
import { SectionLabel } from "@/lib/resume/sections/Primitives";
import { styles } from "@/lib/resume/theme";

/**
 * The opening paragraph.
 *
 * Two or three lines, not a paragraph of adjectives — and the only prose in the
 * PDF with no counterpart on the site, which is why it lives in `data/resume.ts`
 * rather than being assembled from something else (see `ResumeConfig.summary`).
 */
export function Summary({ text }: { text: string }) {
    if (!text.trim()) {
        return null;
    }

    return (
        <View style={styles.section}>
            <SectionLabel>Summary</SectionLabel>
            <Text style={{ fontSize: 8.8, lineHeight: 1.5 }}>{text}</Text>
        </View>
    );
}
