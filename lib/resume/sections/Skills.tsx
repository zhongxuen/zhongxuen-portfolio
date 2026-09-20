import { Text, View } from "@react-pdf/renderer";
import { Chips, RailLabel } from "@/lib/resume/sections/Primitives";
import { styles } from "@/lib/resume/theme";
import type { ResumeSkillGroup } from "@/lib/resume/model";

/**
 * Skills, in the rail, grouped by the categories `resumeConfig` selects.
 *
 * Chips rather than comma-separated text: a 32%-wide column turns a comma list
 * into ragged prose, and a bordered chip is scannable at 6.8pt where a comma is
 * not. Every name is real text, so an ATS reads them as a word list either way.
 */
export function Skills({ groups }: { groups: ResumeSkillGroup[] }) {
    if (groups.length === 0) {
        return null;
    }

    return (
        <View style={styles.railGroup}>
            <RailLabel>Skills</RailLabel>

            {groups.map((group) => (
                <View key={group.category}>
                    <Text style={styles.railCategory}>{group.category}</Text>
                    <Chips items={group.items} />
                </View>
            ))}
        </View>
    );
}
