import { join } from "node:path";
import { Font, StyleSheet } from "@react-pdf/renderer";

/**
 * The résumé PDF's design system (docs/admin-plan.md §8.3).
 *
 * These are the site's **light** theme tokens from `app/globals.css`, restated as
 * `@react-pdf` values — so the PDF is the same design language rather than a
 * lookalike. Always the light palette, whatever the site is currently showing: a
 * dark résumé is a printer's enemy and an ATS parser's indifference.
 *
 * Restated rather than read from the CSS because there is nothing to read from —
 * the tokens are custom properties resolved by a browser, and `@react-pdf` has no
 * cascade. The pairing is maintained by hand, and this comment is the only thing
 * keeping the two in step, so: **if the light palette in app/globals.css
 * changes, change these.**
 */

/** Light-theme tokens, verbatim from `:root[data-theme="light"]` in app/globals.css. */
export const ink = {
    ink: "#0b1220",
    muted: "#52627a",
    faint: "#7c8ca1",
    accent: "#0369a1",
    signal: "#9a4506",
    line: "#d3dce8",
    lineStrong: "#a9b8cc",
    rail: "#eef2f7",
    paper: "#ffffff",
} as const;

const FONT_DIR = join(process.cwd(), "public", "fonts");

/**
 * Registers the site's three faces.
 *
 * `@react-pdf` ships Helvetica and cannot see `next/font`'s build-time downloads
 * — those live inside `.next/` under hashed names, and `.woff2` is not a format
 * it reads. So `public/fonts/` holds latin-subset TTFs for exactly this purpose;
 * see public/fonts/README.md.
 *
 * Reading them off disk needs `outputFileTracingIncludes` in next.config.ts,
 * because nothing statically imports a `.ttf` and Next's tracer would otherwise
 * leave the directory out of the function bundle. If that ever proves unreliable
 * the documented fallback is registering by URL — `Font.register` accepts one and
 * the files are already served from `/fonts/` — at the cost of a network hop
 * inside the action.
 *
 * Idempotent: the module is imported once per cold start, but a warm Fluid
 * Compute instance re-enters it, and re-registering the same family is a no-op
 * that `@react-pdf` tolerates. The flag makes that explicit rather than
 * incidental.
 */
let registered = false;

export function registerResumeFonts(): void {
    if (registered) {
        return;
    }

    Font.register({
        family: "SpaceGrotesk",
        fonts: [{ src: join(FONT_DIR, "SpaceGrotesk-Bold.ttf"), fontWeight: 700 }],
    });

    Font.register({
        family: "Inter",
        fonts: [
            { src: join(FONT_DIR, "Inter-Regular.ttf"), fontWeight: 400 },
            { src: join(FONT_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
        ],
    });

    Font.register({
        family: "PlexMono",
        fonts: [
            { src: join(FONT_DIR, "IBMPlexMono-Regular.ttf"), fontWeight: 400 },
            { src: join(FONT_DIR, "IBMPlexMono-Medium.ttf"), fontWeight: 500 },
        ],
    });

    /**
     * Hyphenation off.
     *
     * `@react-pdf` hyphenates by default and will break "TypeScript" across a
     * line as "Type-Script", which on a résumé reads as a typo in a technology
     * name. Returning the word unsplit disables it globally — one line, and the
     * single highest-value configuration call in this file.
     */
    Font.registerHyphenationCallback((word) => [word]);

    registered = true;
}

/**
 * A4, 14 mm margins. `@react-pdf` units are PostScript points, so millimetres are
 * converted rather than guessed at.
 *
 * A4 because that is the Malaysian and European default. US Letter is a one-line
 * `size` change on `<Page>` if a US application ever needs it.
 */
export const mm = (value: number) => value * 2.834645669;

export const PAGE_MARGIN = mm(14);

/** Top margin. Tighter than the sides: the corner ticks already frame the page. */
export const PAGE_TOP = mm(12);

/** Room for the fixed footer, so flowing content never runs under it. */
export const PAGE_BOTTOM = mm(16);

/**
 * The type scale.
 *
 * Small by web standards and normal by print standards: 9pt body on A4 is the
 * same apparent size as 12px on screen at arm's length. Nothing here goes below
 * 7pt, which is the floor for reliable laser printing.
 */
/*
 * SPACING NOTE. The generous web rhythm (`--bp-section-y` is 72–128px) does not
 * transfer to A4: the budget is `resumeConfig.maxPages`, and whitespace spent
 * between sections is content that does not fit. The values here are the print
 * equivalents — roughly 2.6 mm between sections, 1.7 mm between entries — and
 * lowering them further starts to run blocks together. `data/resume.ts` is the
 * lever to pull after that, not this file.
 */
export const styles = StyleSheet.create({
    /**
     * NO `lineHeight` HERE, AND IT MUST STAY THAT WAY.
     *
     * A unitless `lineHeight` inherited from the Page silently breaks
     * `@react-pdf`'s dynamic text: a `<Text render={...}>` anywhere in the
     * document renders *nothing at all*. That is how the first version of this
     * file shipped a footer with no page number — no warning, no error, just an
     * absent element that only surfaced when the PDF's text was extracted. An
     * explicit `lineHeight` on the dynamic node does not rescue it; the page-level
     * one has to be absent. Every style that wraps to more than one line
     * therefore declares its own.
     */
    page: {
        backgroundColor: ink.paper,
        color: ink.ink,
        fontFamily: "Inter",
        fontSize: 9,
        paddingTop: PAGE_TOP,
        paddingBottom: PAGE_BOTTOM,
        paddingHorizontal: PAGE_MARGIN,
    },

    /** `CV · GZX · 2026-09`, echoing the site's plate annotations. */
    documentCode: {
        fontFamily: "PlexMono",
        fontSize: 7,
        color: ink.faint,
        letterSpacing: 0.5,
        textAlign: "right",
        marginBottom: mm(3),
    },

    name: {
        fontFamily: "SpaceGrotesk",
        fontWeight: 700,
        fontSize: 24,
        letterSpacing: -0.6,
        lineHeight: 1.05,
        color: ink.ink,
    },

    headline: {
        fontSize: 10,
        color: ink.muted,
        marginTop: mm(1),
    },

    /** The accent hairline under the name. The header's one piece of colour. */
    headerRule: {
        height: 0.8,
        backgroundColor: ink.accent,
        marginTop: mm(2.5),
        marginBottom: mm(2),
    },

    contactRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        fontFamily: "PlexMono",
        fontSize: 7.5,
        lineHeight: 1.6,
        color: ink.muted,
    },

    contactLink: {
        color: ink.accent,
        textDecoration: "none",
    },

    contactSeparator: {
        color: ink.faint,
        marginHorizontal: 4,
    },

    /** Name block on the left, QR on the right. */
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: mm(4),
    },

    qrCaption: {
        fontFamily: "PlexMono",
        fontSize: 6,
        letterSpacing: 0.4,
        color: ink.faint,
        textAlign: "center",
        marginTop: mm(0.8),
    },

    /**
     * The headline figures. Bordered cells in a row — the print form of the
     * site's spec-sheet readouts — with the number in the display face and the
     * accent, because it is the first thing a skimming reader should land on.
     */
    statRow: {
        flexDirection: "row",
        marginTop: mm(3),
        borderWidth: 0.5,
        borderColor: ink.lineStrong,
        backgroundColor: ink.rail,
    },

    statCell: {
        flexGrow: 1,
        flexBasis: 0,
        paddingVertical: mm(1.6),
        paddingHorizontal: mm(2.5),
        borderLeftWidth: 0.5,
        borderLeftColor: ink.lineStrong,
    },

    statValue: {
        fontFamily: "SpaceGrotesk",
        fontWeight: 700,
        fontSize: 15,
        lineHeight: 1.1,
        color: ink.accent,
    },

    statLabel: {
        fontFamily: "PlexMono",
        fontSize: 6.5,
        letterSpacing: 0.4,
        color: ink.muted,
        textTransform: "uppercase",
        marginTop: mm(0.5),
    },

    /** 4 mm under the header, less the first section's own top margin. */
    body: {
        marginTop: mm(4 - 2.6),
    },

    /**
     * Mono, uppercase, over a hairline spanning the column. Echoes `SectionHeading`.
     *
     * **`letterSpacing` is capped at 0.6 for a reason, and it is not taste.** A PDF
     * text extractor inserts a space wherever the gap between two glyphs exceeds a
     * fraction of the em, so tracking a label out far enough turns "EXPERIENCE"
     * into "E X P E R I E N C E" in the extracted text — which defeats the whole
     * point of naming the sections conventionally, since an ATS matches the string.
     * Measured against pdf.js at 7.5pt: 0.6 extracts as one word, 0.8 does not.
     * The site's own `bp-meta` uses 0.14em because a browser has no such problem.
     */
    sectionLabel: {
        fontFamily: "PlexMono",
        fontWeight: 500,
        fontSize: 7.5,
        letterSpacing: 0.6,
        color: ink.muted,
        textTransform: "uppercase",
        paddingBottom: mm(0.8),
        borderBottomWidth: 0.5,
        borderBottomColor: ink.lineStrong,
        marginBottom: mm(1.5),
    },

    /**
     * Spacing goes *above* a section, not below. A bottom margin on the last
     * section still counts against the page, and on the two-page layout those
     * 7pt were exactly what pushed Additional Information onto a third page.
     */
    section: {
        marginTop: mm(2.6),
    },

    /** An experience or project block: 2pt accent bar down the left edge, echoing `BlueprintPlate`. */
    entry: {
        borderLeftWidth: 2,
        borderLeftColor: ink.accent,
        paddingLeft: mm(2.5),
        marginBottom: mm(1.7),
    },

    entryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: mm(2),
    },

    entryTitle: {
        fontWeight: 600,
        fontSize: 9.5,
        color: ink.ink,
    },

    entryMeta: {
        fontSize: 8.5,
        lineHeight: 1.35,
        color: ink.muted,
    },

    /** Dates, right-aligned on the title's row so the eye gets a clean right edge. */
    entryDates: {
        fontFamily: "PlexMono",
        fontSize: 7.5,
        color: ink.faint,
        textAlign: "right",
        flexShrink: 0,
    },

    bulletRow: {
        flexDirection: "row",
        marginTop: mm(0.6),
    },

    /** A 2.5pt accent square, not a bullet glyph — the treatment `ProjectCallouts` uses. */
    bulletMark: {
        width: 2.5,
        height: 2.5,
        backgroundColor: ink.accent,
        marginTop: 4.5,
        marginRight: mm(1.6),
        flexShrink: 0,
    },

    bulletText: {
        flexGrow: 1,
        flexBasis: 0,
        fontSize: 8.5,
        lineHeight: 1.35,
    },

    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: mm(1.2),
        marginTop: mm(1.4),
    },

    /** Bordered, square-cornered, mono — `Badge` in print. */
    chip: {
        fontFamily: "PlexMono",
        fontSize: 6.8,
        color: ink.muted,
        borderWidth: 0.5,
        borderColor: ink.lineStrong,
        borderRadius: 2,
        paddingHorizontal: 3,
        paddingVertical: 1.2,
    },

    link: {
        color: ink.accent,
        textDecoration: "none",
        fontFamily: "PlexMono",
        fontSize: 7.5,
    },

    /** Project role, "More projects" — secondary lines inside an entry. */
    entryNote: {
        fontSize: 8,
        lineHeight: 1.35,
        color: ink.muted,
        marginTop: mm(0.4),
    },

    /** Live / Code links, right-aligned on a project's title row. */
    linkRow: {
        flexDirection: "row",
        gap: mm(3),
        flexShrink: 0,
        marginTop: 1.5,
    },

    linkLabel: {
        fontFamily: "PlexMono",
        fontSize: 7,
        color: ink.faint,
    },

    /**
     * A label/value table row — skills, additional information. A fixed mono
     * label column gives the eye one clean left edge to scan down, which a
     * paragraph of "Languages: …, Frameworks: …" does not.
     */
    factRow: {
        flexDirection: "row",
        paddingVertical: mm(0.55),
        borderBottomWidth: 0.4,
        borderBottomColor: ink.line,
    },

    factLabel: {
        width: mm(36),
        flexShrink: 0,
        fontFamily: "PlexMono",
        fontWeight: 500,
        fontSize: 7.2,
        lineHeight: 1.5,
        color: ink.muted,
    },

    factValue: {
        flexGrow: 1,
        flexBasis: 0,
        fontSize: 8.5,
        lineHeight: 1.4,
    },

    /**
     * Pinned to the bottom of every page, outside the flow — `fixed` plus
     * absolute, so it repeats on page two and cannot push content. The page's
     * bottom padding (`PAGE_BOTTOM`) reserves its height.
     */
    footer: {
        position: "absolute",
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        bottom: mm(7),
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: mm(1.5),
        borderTopWidth: 0.5,
        borderTopColor: ink.line,
    },

    footerText: {
        fontFamily: "PlexMono",
        fontSize: 7,
        color: ink.faint,
    },
});

/**
 * Four 6 mm hairlines at the page corners, echoing `BlueprintFrame`.
 *
 * Absolutely positioned and `fixed`, so they repeat if the document ever runs to
 * a second page. Pure decoration with no text content, which is the only kind of
 * ornament an ATS-safe document can afford.
 */
export const tick = {
    length: mm(6),
    thickness: 0.5,
    color: ink.lineStrong,
    inset: mm(6),
} as const;
