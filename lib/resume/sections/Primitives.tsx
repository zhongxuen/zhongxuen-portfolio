import { Children, type ReactNode } from "react";
import { Link, Text, View } from "@react-pdf/renderer";
import { ink, mm, styles, tick } from "@/lib/resume/theme";
import { buildQrCode } from "@/lib/resume/qr";

/**
 * The shared marks of the résumé's layout.
 *
 * One file rather than one per primitive: each of these is three to ten lines,
 * and the section components are what deserve their own files. Every one of them
 * is a print restatement of something that already exists on the site, named in
 * its docstring so the two can be kept in step.
 */

/** Mono uppercase label over a hairline. The print form of `SectionHeading`. */
export function SectionLabel({ children }: { children: string }) {
    return <Text style={styles.sectionLabel}>{children}</Text>;
}

/**
 * A titled section whose label cannot be stranded.
 *
 * The label and the first child share one unbreakable View, so when the first
 * entry moves to the next page the heading moves with it. A heading alone at
 * the foot of a page, its content overleaf, is the classic generated-CV tell —
 * and `minPresenceAhead` did not prevent it here: the first render of the
 * two-page layout left "EDUCATION" by itself at the bottom of page two.
 */
export function Section({ label, children }: { label: string; children: ReactNode }) {
    const [first, ...rest] = Children.toArray(children);

    return (
        <View style={styles.section}>
            <View wrap={false}>
                <SectionLabel>{label}</SectionLabel>
                {first}
            </View>
            {rest}
        </View>
    );
}

/** One label/value row of a table — skills, additional information. */
export function FactRow({ label, children }: { label: string; children: string }) {
    return (
        <View style={styles.factRow} wrap={false}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{children}</Text>
        </View>
    );
}

/**
 * A bullet: 2.5pt accent square, then the text.
 *
 * A square rather than "•" because the glyph belongs to the body face and reads
 * as prose punctuation, while the square reads as a drafting mark — the same
 * choice `ProjectCallouts` makes on the site. It is a `View`, so it contributes
 * no character to the extracted text and an ATS sees clean paragraph breaks.
 */
export function Bullet({ children }: { children: string }) {
    return (
        <View style={styles.bulletRow}>
            <View style={styles.bulletMark} />
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

/** Bordered mono chips, wrapping. `Badge` in print. */
export function Chips({ items }: { items: string[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <View style={styles.chipRow}>
            {items.map((item) => (
                <Text key={item} style={styles.chip}>
                    {item}
                </Text>
            ))}
        </View>
    );
}

/**
 * Four corner hairlines, echoing `BlueprintFrame`.
 *
 * `fixed` so they repeat on a second page if the one-page target is ever missed,
 * and `position: absolute` so they sit outside the flow and cannot push content.
 */
export function CornerTicks() {
    const arms = [
        { top: tick.inset, left: tick.inset, horizontal: true },
        { top: tick.inset, left: tick.inset, horizontal: false },
        { top: tick.inset, right: tick.inset, horizontal: true },
        { top: tick.inset, right: tick.inset, horizontal: false },
        { bottom: tick.inset, left: tick.inset, horizontal: true },
        { bottom: tick.inset, left: tick.inset, horizontal: false },
        { bottom: tick.inset, right: tick.inset, horizontal: true },
        { bottom: tick.inset, right: tick.inset, horizontal: false },
    ];

    return (
        <>
            {arms.map((arm, index) => (
                <View
                    key={index}
                    fixed
                    style={{
                        position: "absolute",
                        backgroundColor: tick.color,
                        width: arm.horizontal ? tick.length : tick.thickness,
                        height: arm.horizontal ? tick.thickness : tick.length,
                        ...("top" in arm && arm.top !== undefined ? { top: arm.top } : {}),
                        ...("bottom" in arm && arm.bottom !== undefined
                            ? { bottom: arm.bottom }
                            : {}),
                        ...("left" in arm && arm.left !== undefined ? { left: arm.left } : {}),
                        ...("right" in arm && arm.right !== undefined ? { right: arm.right } : {}),
                    }}
                />
            ))}
        </>
    );
}

/**
 * The header QR code, drawn as vector rectangles.
 *
 * Settled 2026-09-20 (docs/admin-plan.md §14): worth the 14 mm on a printed copy,
 * where the portfolio URL is otherwise something to retype. It is the résumé's one
 * non-text element, and it is allowed to be one because it carries no information
 * of its own — the URL it encodes is printed as text in the contact row, so a parser
 * that ignores it loses nothing.
 */
export function QrBlock({ url, size = mm(14) }: { url: string; size?: number }) {
    const { rects } = buildQrCode(url);

    return (
        <View style={{ width: size, height: size, position: "relative" }}>
            {rects.map((rect, index) => (
                <View
                    key={index}
                    style={{
                        position: "absolute",
                        left: rect.x * size,
                        top: rect.y * size,
                        width: rect.width * size,
                        height: rect.height * size,
                        backgroundColor: ink.ink,
                    }}
                />
            ))}
        </View>
    );
}

/** A real PDF hyperlink in the accent, underline-free. */
export function PdfLink({ href, children }: { href: string; children: string }) {
    return (
        <Link src={href} style={styles.link}>
            {children}
        </Link>
    );
}
