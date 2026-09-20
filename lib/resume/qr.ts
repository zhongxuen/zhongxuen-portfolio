import QRCode from "qrcode";

/**
 * Turns a URL into rectangles a PDF can draw (docs/admin-plan.md §8.3).
 *
 * **Why not an image.** `qrcode` will happily produce a PNG data URL, and
 * `@react-pdf` will happily embed it — but the résumé's ATS rules say nothing is
 * rendered as an image, and a raster QR at print resolution is both a 20 KB blob
 * and slightly soft. Taking the module matrix and drawing filled rects keeps the
 * code vector, crisp at any zoom, and free of a binary asset.
 *
 * **Run-length, not per-module.** A version-3 QR is 29×29 = 841 modules, and 841
 * `<View>` elements is a real cost in a layout engine that measures every node.
 * Collapsing each row's consecutive dark modules into one rect takes that to
 * roughly a hundred, draws identically, and scans identically.
 */

export interface QrRect {
    /** All four values are fractions of the code's width, 0–1, so the caller picks the size. */
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface QrCode {
    /** Modules per side, including the quiet zone added below. */
    size: number;
    rects: QrRect[];
}

/**
 * Quiet zone, in modules.
 *
 * The specification asks for 4. Printed at 14 mm that is a third of the code's
 * width spent on nothing, so this uses 2 — enough for every scanner tested
 * against a white page, and the code sits on white paper with the nearest ink
 * several millimetres away.
 */
const QUIET_ZONE = 2;

/**
 * Builds the rectangles.
 *
 * Error correction level M — the default, and the right one here: L is 7%
 * recovery, which a fold line through a printed résumé can exceed, and Q/H make
 * the code denser for a URL that is already short.
 */
export function buildQrCode(text: string): QrCode {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
    const inner = modules.size;
    const size = inner + QUIET_ZONE * 2;
    const unit = 1 / size;

    const rects: QrRect[] = [];

    for (let row = 0; row < inner; row += 1) {
        let runStart: number | null = null;

        for (let column = 0; column <= inner; column += 1) {
            /*
             * The loop runs one past the last column on purpose: `dark` is false
             * there, which closes a run that reaches the right edge without
             * needing a second flush after the loop.
             */
            const dark = column < inner && modules.get(row, column) === 1;

            if (dark && runStart === null) {
                runStart = column;
                continue;
            }

            if (!dark && runStart !== null) {
                rects.push({
                    x: (runStart + QUIET_ZONE) * unit,
                    y: (row + QUIET_ZONE) * unit,
                    width: (column - runStart) * unit,
                    height: unit,
                });

                runStart = null;
            }
        }
    }

    return { size, rects };
}
