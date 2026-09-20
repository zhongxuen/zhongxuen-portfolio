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
import type { ResumeModel } from "@/lib/resume/model";

/**
 * The résumé document (docs/admin-plan.md §8.3).
 *
 * Layout only — every decision about what appears and in what order was made by
 * `buildResumeModel()`. Two zones: a main column at roughly 64% carrying Summary,
 * Experience and Projects, and a tinted rail at 32% carrying Skills, Education and
 * Certifications.
 *
 * **The main column is first in the element tree, and that is load-bearing.**
 * Extracted text order follows the tree, so an ATS reading this as plain text gets
 * Summary → Experience → Projects → Skills → Education — a correctly ordered
 * résumé. Putting the rail first would look identical and parse as gibberish.
 *
 * The rest of the ATS contract, all of it visible below:
 *   - every character is real embedded text; nothing is an image, no icon fonts,
 *     no text inside SVG. The footer QR is the single exception and carries no
 *     information of its own — the URL is printed as text beside it.
 *   - conventional section names (EXPERIENCE, PROJECTS, SKILLS, EDUCATION),
 *     styled unconventionally.
 *   - contact details in the body, never in a running header, because some
 *     parsers discard a repeating header entirely.
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
                    <Text style={styles.name}>{model.name}</Text>
                    <Text style={styles.headline}>{model.headline}</Text>
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
                </View>

                <View style={styles.body}>
                    {/* Main column — FIRST in the tree. See the note above. */}
                    <View style={styles.main}>
                        <Summary text={model.summary} />
                        <Experience roles={model.experience} />
                        <Projects projects={model.projects} />
                    </View>

                    <View style={styles.rail}>
                        <Skills groups={model.skills} />
                        <Education entries={model.education} />
                        <Certifications entries={model.certifications} />
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: mm(2.5) }}>
                        {model.includeQrCode && <QrBlock url={absoluteSiteUrl(model.siteUrl)} />}
                        <Text style={styles.footerText}>{model.siteUrl}</Text>
                    </View>

                    {/*
                     * `render` gives the callback the real page numbers, so a
                     * document that runs long says "2 / 2" rather than lying.
                     *
                     * Deliberately **not** `fixed`. A `fixed` child inside this flex
                     * row is dropped from the output entirely — the first version of
                     * this file shipped a footer with no page number at all, which
                     * only showed up when the rendered PDF's text was extracted. It
                     * would also have been the wrong behaviour: the footer itself is
                     * in normal flow, so a page counter that repeated while the URL
                     * and QR beside it did not would be stranded on page two.
                     */}
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
