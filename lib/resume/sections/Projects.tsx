import { Text, View } from "@react-pdf/renderer";
import { Bullet, Chips, PdfLink, Section } from "@/lib/resume/sections/Primitives";
import { styles } from "@/lib/resume/theme";
import type { ResumeProject } from "@/lib/resume/model";

/**
 * Selected projects — featured first, capped by `resumeConfig.maxProjects` —
 * then one line naming the rest.
 *
 * Per entry: title with its links right-aligned on the same row (the live
 * domain printed in full, the repository as "GitHub" — both real hyperlinks),
 * the role when it was a team effort, the summary, the first key features as
 * bullets, then tech chips. `wrap={false}` keeps an entry on one page.
 */
export function Projects({
    projects,
    more,
    siteUrl,
}: {
    projects: ResumeProject[];
    more: string[];
    siteUrl: string;
}) {
    if (projects.length === 0) {
        return null;
    }

    return (
        <Section label="Projects">
            {projects.map((project) => (
                <View key={project.title} style={styles.entry} wrap={false}>
                    <View style={styles.entryHeader}>
                        <Text style={styles.entryTitle}>{project.title}</Text>

                        {project.links.length > 0 && (
                            <View style={styles.linkRow}>
                                {project.links.map((link) => (
                                    <Text key={link.href}>
                                        <Text style={styles.linkLabel}>{`${link.label} `}</Text>
                                        <PdfLink href={link.href}>{link.value}</PdfLink>
                                    </Text>
                                ))}
                            </View>
                        )}
                    </View>

                    {project.role && <Text style={styles.entryNote}>{project.role}</Text>}

                    <Text style={{ fontSize: 8.5, lineHeight: 1.45, marginTop: 1.5 }}>
                        {project.summary}
                    </Text>

                    {project.features.map((feature) => (
                        <Bullet key={feature}>{feature}</Bullet>
                    ))}

                    <Chips items={project.technologies} />
                </View>
            ))}

            {more.length > 0 && (
                <Text style={styles.entryNote}>
                    {`Also built: ${more.join(", ")}. Case studies for all ${
                        projects.length + more.length
                    } projects at ${siteUrl}.`}
                </Text>
            )}
        </Section>
    );
}
