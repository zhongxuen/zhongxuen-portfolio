import { Text, View } from "@react-pdf/renderer";
import { Chips, PdfLink, SectionLabel } from "@/lib/resume/sections/Primitives";
import { ink, styles } from "@/lib/resume/theme";
import type { ResumeProject } from "@/lib/resume/model";

/**
 * Selected projects — featured first, capped by `resumeConfig.maxProjects`.
 *
 * One line of prose each, its own tech chips, and the live URL as a real
 * hyperlink printed without its scheme. `signal` (#9a4506) appears here and
 * nowhere else in the document, as a single mono marker on a featured entry: the
 * plan held it in reserve for exactly one job, and this is it.
 */
export function Projects({ projects }: { projects: ResumeProject[] }) {
    if (projects.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <SectionLabel>Projects</SectionLabel>

            {projects.map((project) => (
                <View key={project.title} style={styles.entry} wrap={false}>
                    <View style={styles.entryHeader}>
                        <Text style={styles.entryTitle}>{project.title}</Text>
                        {project.featured && (
                            <Text
                                style={{
                                    fontFamily: "PlexMono",
                                    fontSize: 6.5,
                                    /* Capped so an extractor reads "FEATURED", not "F E A T U R E D" — see `sectionLabel` in lib/resume/theme.ts. */
                                    letterSpacing: 0.45,
                                    color: ink.signal,
                                    flexShrink: 0,
                                }}
                            >
                                FEATURED
                            </Text>
                        )}
                    </View>

                    <Text style={{ fontSize: 8.5, lineHeight: 1.45, marginTop: 1.5 }}>
                        {project.summary}
                    </Text>

                    <Chips items={project.technologies} />

                    {project.url && project.href && (
                        <View style={{ marginTop: 3 }}>
                            <PdfLink href={project.href}>{project.url}</PdfLink>
                        </View>
                    )}
                </View>
            ))}
        </View>
    );
}
