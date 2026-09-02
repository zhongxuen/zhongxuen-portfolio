import { statSync } from "node:fs";
import { join } from "node:path";
import { RESUME_PATH } from "@/lib/constants";

export interface ResumeMeta {
    /** Public href for the PDF. */
    path: string;
    /** Human-readable size, e.g. "432 KB". Empty when the file is missing. */
    sizeLabel: string;
}

/**
 * Reads the real size of the resume PDF off disk at build time.
 *
 * The hero demotes the resume to a mono text link annotated with its file size
 * (docs/uiux.md §4.2). Hardcoding that number would silently drift the moment
 * the PDF is replaced, so it is measured instead — the definition of done
 * forbids any figure on the site that does not trace to a real source.
 *
 * SERVER ONLY. Uses node:fs, so it must be called from a Server Component and
 * the result passed down as a prop.
 */
export function getResumeMeta(): ResumeMeta {
    try {
        const { size } = statSync(join(process.cwd(), "public", RESUME_PATH));

        return {
            path: RESUME_PATH,
            sizeLabel: `${Math.round(size / 1024)} KB`,
        };
    } catch {
        // A missing PDF should degrade to an unannotated link, not a build failure.
        return { path: RESUME_PATH, sizeLabel: "" };
    }
}
