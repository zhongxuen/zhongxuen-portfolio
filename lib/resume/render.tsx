import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { resumeConfig } from "@/data/resume";
import { buildResumeModel } from "@/lib/resume/model";
import { ResumeDocument } from "@/lib/resume/ResumeDocument";
import { registerResumeFonts } from "@/lib/resume/theme";
import type { Project } from "@/types/project";
import type { ResumeConfig } from "@/types/resume";

/**
 * Renders the résumé PDF (docs/admin-plan.md §8.4).
 *
 * The one place `renderToBuffer` is called, and the one place the fonts are
 * registered — `registerResumeFonts()` must run before the first render of a cold
 * start or `@react-pdf` silently falls back to Helvetica, which looks like
 * nothing went wrong and is not the document this designed.
 */

export interface RenderedResume {
    bytes: Uint8Array;
    /** Rendered pages. One is the target; two means pull a lever in `data/resume.ts`. */
    pageCount: number;
}

export async function renderResume(
    projects: Project[],
    config: ResumeConfig = resumeConfig,
): Promise<RenderedResume> {
    registerResumeFonts();

    const model = buildResumeModel(projects, config);
    const bytes = await renderToBuffer(<ResumeDocument model={model} />);

    return { bytes, pageCount: countPages(bytes) };
}

/**
 * Counts pages by scanning the PDF for page objects.
 *
 * A heuristic, and openly so: it reads the raw bytes for `/Type /Page` and
 * excludes `/Type /Pages`, the tree node. That is sufficient for a warning banner
 * — the question being answered is "is this still one page?", and the answer is
 * wanted before the commit rather than after someone downloads it. A real parser
 * would be a third dependency to answer a yes/no question.
 */
function countPages(bytes: Uint8Array): number {
    /*
     * `latin1` rather than `utf8`: a PDF's byte stream is not valid UTF-8, and
     * decoding it as such replaces bytes with U+FFFD, which can eat the very
     * markers being counted. latin1 is a lossless byte-to-char mapping.
     */
    const text = Buffer.from(bytes).toString("latin1");
    const matches = text.match(/\/Type\s*\/Page(?![s/\w])/g);

    return matches?.length ?? 1;
}
