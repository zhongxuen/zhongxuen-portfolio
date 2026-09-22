import { Text, View } from "@react-pdf/renderer";
import { Bullet, Section } from "@/lib/resume/sections/Primitives";

/**
 * The opening paragraph, then the highlights.
 *
 * The paragraph says who; the bullets say why keep reading; the last line says
 * when — availability is the first thing a recruiter filters on, so it is
 * printed here on page one rather than in Additional Information. All three live in
 * `data/resume.ts` because the site has no summary of its own (see
 * `ResumeConfig.summary`), and every highlight is meant to be checkable against
 * the experience, education or projects further down.
 */
export function Summary({
    text,
    highlights,
    availability,
}: {
    text: string;
    highlights: string[];
    availability: string;
}) {
    if (!text.trim() && highlights.length === 0) {
        return null;
    }

    return (
        <Section label="Profile Summary">
            {text.trim() && <Text style={{ fontSize: 8.8, lineHeight: 1.5 }}>{text}</Text>}

            {highlights.length > 0 && (
                <View style={{ marginTop: 2 }}>
                    {highlights.map((line) => (
                        <Bullet key={line}>{line}</Bullet>
                    ))}
                </View>
            )}

            {availability && (
                <Text style={{ fontSize: 8.5, lineHeight: 1.4, marginTop: 3 }}>
                    <Text style={{ fontWeight: 600 }}>Availability: </Text>
                    {availability}
                </Text>
            )}
        </Section>
    );
}
