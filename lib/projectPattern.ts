/**
 * Deterministic, slug-seeded blueprint artwork for project cards.
 *
 * Only one project in data/projects.ts ships a screenshot, so this is the
 * DEFAULT path for card imagery rather than an error state (docs/uiux.md §4.5).
 * It has to satisfy two things at once: every card must look deliberate, and no
 * two cards may look alike — while a given slug always renders identically, so
 * the homepage grid, /projects and the detail header agree, and so a static
 * build is reproducible. Hence a hash, not `Math.random`.
 *
 * The output is plain geometry, not markup: components/projects/BlueprintPlate
 * turns it into an SVG. Keeping the two apart is what makes the generator
 * testable without a DOM (tests/lib/projectPattern.test.ts).
 */

/** Drawing units. 16:10, matching the aspect ratio the card reserves. */
export const PATTERN_WIDTH = 160;
export const PATTERN_HEIGHT = 100;

/** Module lattice the plates are placed on. */
const COLS = 4;
const ROWS = 3;
const CELL_W = PATTERN_WIDTH / COLS;
const CELL_H = PATTERN_HEIGHT / ROWS;

/** Breathing room between a plate and its cell's edge, in drawing units. */
const CELL_INSET_X = 7;
const CELL_INSET_Y = 6;

export interface PatternPlate {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PatternNode {
    cx: number;
    cy: number;
}

export interface BlueprintPattern {
    /** The slug's hash. Exposed so callers can derive stable ids/keys from it. */
    seed: number;
    /** Bordered plates, in draw order. */
    plates: PatternPlate[];
    /** Orthogonal connectors between consecutive plates, as path data. */
    links: string[];
    /** Registration dots at plate corners. */
    nodes: PatternNode[];
    /** Diagonal hatch band filling one unused cell, as path data. */
    hatch: string;
    /** Drafting caption, e.g. "FIG.42". */
    label: string;
}

/**
 * FNV-1a over the slug's code units. Chosen over a hand-rolled sum because
 * near-identical slugs — "ecoquest" / "ecoquests" — must not land on adjacent
 * seeds and therefore near-identical drawings.
 *
 * `>>> 0` after each step keeps the value an unsigned 32-bit integer; the
 * multiply is written as shifts because `* 16777619` overflows a double's
 * exact-integer range and would quietly lose the low bits.
 */
export function hashSlug(slug: string): number {
    let hash = 0x811c9dc5;

    for (let i = 0; i < slug.length; i += 1) {
        hash ^= slug.charCodeAt(i);
        hash =
            (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
    }

    return hash >>> 0;
}

/** mulberry32 — small, fast, and well-distributed for the handful of draws here. */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Two decimals is well past what a 160-unit viewBox can resolve on screen, and
 * it keeps the emitted path strings short and byte-for-byte comparable in the
 * determinism test.
 */
function round(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Fisher-Yates against the seeded stream, so the order is part of the seed. */
function shuffle<T>(items: T[], random: () => number): T[] {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/**
 * Path for an orthogonal connector between two points: out horizontally to the
 * midpoint, down, then in. Straight diagonals would read as a chart; right
 * angles read as a wiring diagram, which is the register the rest of the site
 * is drawn in.
 */
function orthogonalLink(from: PatternNode, to: PatternNode): string {
    const midX = round((from.cx + to.cx) / 2);

    return `M${round(from.cx)} ${round(from.cy)}H${midX}V${round(to.cy)}H${round(to.cx)}`;
}

/** Parallel 45° strokes filling `cell`, drawn top-left to bottom-right. */
function hatchBand(col: number, row: number): string {
    const x = col * CELL_W + CELL_INSET_X;
    const y = row * CELL_H + CELL_INSET_Y;
    const width = CELL_W - CELL_INSET_X * 2;
    const height = CELL_H - CELL_INSET_Y * 2;
    const step = 5;
    const segments: string[] = [];

    // Offsets run from -height to width so the strokes clipped by the top and
    // left edges are drawn too, rather than leaving two bare triangles.
    for (let offset = -height; offset < width; offset += step) {
        const startX = Math.max(x + offset, x);
        const startY = offset < 0 ? y - offset : y;
        const span = Math.min(width - (startX - x), height - (startY - y));

        if (span > 0.5) {
            segments.push(`M${round(startX)} ${round(startY)}l${round(span)} ${round(span)}`);
        }
    }

    return segments.join("");
}

/**
 * Builds the drawing for `slug`. Pure: same slug in, identical object out,
 * every time and on every machine.
 */
export function buildBlueprintPattern(slug: string): BlueprintPattern {
    const seed = hashSlug(slug);
    const random = seededRandom(seed);

    const cells = shuffle(
        Array.from({ length: COLS * ROWS }, (_, index) => index),
        random,
    );

    // Three or four plates: two reads as unfinished, five crowds a 160-unit box.
    const plateCount = 3 + Math.floor(random() * 2);
    const plates: PatternPlate[] = [];
    const centres: PatternNode[] = [];
    const nodes: PatternNode[] = [];

    for (const cell of cells.slice(0, plateCount)) {
        const col = cell % COLS;
        const row = Math.floor(cell / COLS);

        const x = round(col * CELL_W + CELL_INSET_X);
        const y = round(row * CELL_H + CELL_INSET_Y);

        // Jitter the size, not the position: the plates stay on the lattice —
        // which is what makes the result read as a drawing rather than noise —
        // while no two cards get the same rhythm of box sizes. A plate may
        // overrun its cell into the next one's inset, but never past the
        // drawing's own margin, so nothing is clipped by the viewBox edge.
        const width = Math.min(
            CELL_W - CELL_INSET_X * 2 + random() * 8,
            PATTERN_WIDTH - CELL_INSET_X - x,
        );
        const height = Math.min(
            CELL_H - CELL_INSET_Y * 2 + random() * 5,
            PATTERN_HEIGHT - CELL_INSET_Y - y,
        );

        const plate = { x, y, width: round(width), height: round(height) };
        plates.push(plate);
        centres.push({ cx: round(x + plate.width / 2), cy: round(y + plate.height / 2) });
        nodes.push({ cx: x, cy: y }, { cx: round(x + plate.width), cy: round(y + plate.height) });
    }

    const links = centres.slice(1).map((centre, index) => orthogonalLink(centres[index], centre));

    // The hatch goes in a cell no plate claimed, so it never sits under one.
    const spareCell = cells[plateCount] ?? cells[0];

    return {
        seed,
        plates,
        links,
        nodes,
        hatch: hatchBand(spareCell % COLS, Math.floor(spareCell / COLS)),
        // 10–99, so the caption is always two digits and never "FIG.00".
        label: `FIG.${(seed % 90) + 10}`,
    };
}
