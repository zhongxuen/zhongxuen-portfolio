import { Document, Page, Text, View } from "@react-pdf/renderer";
import { AUTHOR } from "@/lib/constants";
import { skills } from "@/data/skills";
import { mm, styles } from "@/lib/resume/theme";
import { CornerTicks, PdfLink, QrBlock } from "@/lib/resume/sections/Primitives";
import { Summary } from "@/lib/resume/sections/Summary";
import { Experience } from "@/lib/resume/sections/Experience";
import { Projects } from "@/lib/resume/sections/Projects";
import { Skills } from "@/lib/resume/sections/Skills";
import { Education } from "@/lib/resume/sections/Education";
import { Certifications } from "@/lib/resume/sections/Certifications";
import { Additional } from "@/lib/resume/sections/Additional";
import type { ResumeModel } from "@/lib/resume/model";

/**
 * The résumé document (docs/admin-plan.md §8.3).
 *
 * Layout only — every decision about what appears and in what order was made by
 * `buildResumeModel()`. One column at full width, flowing across up to
 * `resumeConfig.maxPages` pages: header and headline figures, then Profile
 * Summary → Work Experience → Technical Skills → Projects → Education →
 * Certifications → Additional Information.
 *
 * Skills sit above Projects for two reasons: a recruiter screening for a stack
 * finds it in the first half of page one, and the table's small unbreakable
 * rows fill the space a whole project entry (`wrap={false}`) would otherwise
 * leave empty at the foot of the page.
 *
 * **Why one column.** The earlier layout put skills and education in a tinted
 * rail beside the main column. That works on exactly one page — `@react-pdf`
 * cannot flow two side-by-side columns across a page break — and one page is
 * what forced every project down to a single trimmed line. A single column
 * flows cleanly, and extracted text order is simply document order, which is
 * the best possible case for an ATS.
 *
 * The rest of the ATS contract, all of it visible below:
 *   - every character is real embedded text; nothing is an image, no icon fonts,
 *     no text inside SVG. The header QR is the single exception and carries no
 *     information of its own — the portfolio URL is printed in the contact row.
 *   - conventional section names (EXPERIENCE, PROJECTS, SKILLS, EDUCATION),
 *     styled unconventionally.
 *   - contact details in the body, never in a running header, because some
 *     parsers discard a repeating header entirely. Only the footer repeats, and
 *     it carries nothing that is not also in the body.
 *   - document metadata set, because some parsers read it first.
 */
export function ResumeDocument({
    model,
    size = "A4",
}: {
    model: ResumeModel;
    /**
     * A4 by default — the Malaysian and European standard. `"LETTER"` is the
     * one-line change a US application would need, and this is that line; nothing
     * else in the layout is sized in absolute page units.
     */
    size?: React.ComponentProps<typeof Page>["size"];
}) {
    return (
        <Document
            title={`${AUTHOR.name} — Résumé`}
            author={AUTHOR.name}
            subject={`${AUTHOR.role} · Full-Stack Developer`}
            /* Keywords from data/skills.ts rather than a hand-written list, so the metadata cannot drift from the skills on the page. */
            keywords={skills.map((skill) => skill.name).join(", ")}
            creator="zhongxuen-portfolio admin console"
            producer="@react-pdf/renderer"
        >
            <Page size={size} style={styles.page}>
                <CornerTicks />

                <Text style={styles.documentCode}>{model.documentCode}</Text>

                <View>
                    <View style={styles.headerRow}>
                        <View style={{ flexGrow: 1, flexBasis: 0 }}>
                            <Text style={styles.name}>{model.name}</Text>
                            <Text style={styles.headline}>{model.headline}</Text>
                        </View>

                        {model.includeQrCode && (
                            <View>
                                <QrBlock url={absoluteSiteUrl(model.siteUrl)} size={mm(15)} />
                                <Text style={styles.qrCaption}>PORTFOLIO</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerRule} />

                    {/*
                     * Contacts as one wrapping mono row with · separators. The
                     * separators are their own <Text> nodes so they are visibly
                     * punctuation rather than part of an address — a parser reading
                     * "gohzx2006@gmail.com·+60" would get neither.
                     */}
                    <View style={styles.contactRow}>
                        {model.contacts.map((contact, index) => (
                            <View key={contact.label} style={{ flexDirection: "row" }}>
                                {index > 0 && <Text style={styles.contactSeparator}>·</Text>}
                                {contact.href ? (
                                    <PdfLink href={contact.href}>{contact.value}</PdfLink>
                                ) : (
                                    <Text>{contact.value}</Text>
                                )}
                            </View>
                        ))}
                    </View>

                    {model.stats.length > 0 && (
                        <View style={styles.statRow}>
                            {model.stats.map((stat, index) => (
                                <View
                                    key={stat.label}
                                    style={[
                                        styles.statCell,
                                        index === 0 ? { borderLeftWidth: 0 } : {},
                                    ]}
                                >
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.body}>
                    <Summary
                        text={model.summary}
                        highlights={model.highlights}
                        availability={model.availability}
                    />
                    <Experience roles={model.experience} />
                    <Projects
                        projects={model.projects}
                        more={model.moreProjects}
                        siteUrl={model.siteUrl}
                    />
                    <Education entries={model.education} />
                    <Skills groups={model.skills} />
                    <Certifications entries={model.certifications} />
                    <Additional facts={model.additional} />
                </View>

                {/*
                 * The footer is `fixed` and absolutely positioned, so it repeats on
                 * every page outside the flow. The page counter is a `render` Text,
                 * which is why the Page style must carry no `lineHeight` (see
                 * `styles.page`) — with one inherited, this node renders nothing.
                 */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{`${model.name} · ${model.siteUrl}`}</Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
}

/**
 * The model prints the URL without its scheme, but a QR code has to encode a
 * complete one — a phone camera scanning "zhongxuen-portfolio.vercel.app" may
 * offer a search instead of a page.
 */
function absoluteSiteUrl(displayUrl: string): string {
    return displayUrl.startsWith("http") ? displayUrl : `https://${displayUrl}`;
}
