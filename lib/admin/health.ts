import "server-only";

import { listDirectory, screenshotTarget } from "@/lib/admin/github";
import type { Project } from "@/types/project";

/**
 * The checks that answer "is anything on this site quietly broken?"
 * (docs/admin-plan.md §17.8).
 *
 * **Why a page and not a test.** Everything here depends on the state of the
 * world outside this repository — whether a demo deployment still answers,
 * whether a GitHub repo is still public, what is actually sitting in
 * `public/images/projects/` on `main` right now. A test asserting any of that
 * would fail in CI for reasons nobody in the pull request caused, on a schedule
 * set by other people's hosting. So it is a button, pressed when it is useful.
 *
 * **The rot this catches is the most common kind on a portfolio.** A free demo
 * host sleeps a project after ninety days; a repository gets renamed or made
 * private; a screenshot is removed from an entry and its file stays in the
 * repository forever. None of these produce an error anywhere. The site keeps
 * building, keeps deploying, and keeps linking a recruiter to a 404.
 */

/** Per-request ceiling, so one unreachable host cannot hold the page open. */
const TIMEOUT_MS = 8000;

/** How many checks run at once. Polite to the hosts being probed, and to this function's own runtime. */
const CONCURRENCY = 6;

export type LinkVerdict = "ok" | "redirect" | "broken" | "unreachable" | "blocked";

export interface LinkCheck {
    /** Which project claims this URL. */
    slug: string;
    title: string;
    field: "liveUrl" | "githubUrl";
    url: string;
    verdict: LinkVerdict;
    /** HTTP status, when there was one. */
    status?: number;
    /** Where a redirect landed, when it moved somewhere worth knowing about. */
    location?: string;
    /** Round-trip time in ms, for spotting a demo that technically answers but takes nine seconds. */
    ms?: number;
}

/**
 * Probes one URL.
 *
 * **`HEAD` first, then `GET` on 405.** A HEAD is the polite way to ask "are you
 * there" and most hosts answer it, but a meaningful minority — including some
 * app platforms that only route the verbs a framework declared — reject it with
 * 405 or 501. Reporting those as broken would be this checker's own bug shown as
 * the site's, which is worse than not checking at all.
 *
 * `redirect: "manual"` because a redirect is *information*: a live demo that now
 * 301s to a parked domain is exactly the failure this is for, and following it
 * silently would report the parking page's cheerful 200.
 */
async function probe(
    url: string,
): Promise<{ verdict: LinkVerdict; status?: number; location?: string; ms: number }> {
    const started = Date.now();

    async function attempt(method: "HEAD" | "GET") {
        return fetch(url, {
            method,
            redirect: "manual",
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            /*
             * A plain, honest user agent. Several hosts serve a challenge page to
             * an unidentified client, which would come back as a 403 and read as
             * "your link is broken" when the link is fine.
             */
            headers: { "user-agent": "zhongxuen-portfolio-admin-linkcheck" },
        });
    }

    try {
        let response = await attempt("HEAD");

        if (response.status === 405 || response.status === 501) {
            response = await attempt("GET");
        }

        const ms = Date.now() - started;
        const status = response.status;

        if (status >= 200 && status < 300) {
            return { verdict: "ok", status, ms };
        }

        if (status >= 300 && status < 400) {
            return {
                verdict: "redirect",
                status,
                location: response.headers.get("location") ?? undefined,
                ms,
            };
        }

        /*
         * 401/403 is "something is there, and it will not tell us" — a private
         * repo, a password-protected preview, a bot challenge. Reporting it as
         * broken would send the operator hunting for a dead link that is not
         * dead; reporting it as fine would hide a repo that went private.
         */
        if (status === 401 || status === 403 || status === 429) {
            return { verdict: "blocked", status, ms };
        }

        return { verdict: "broken", status, ms };
    } catch {
        // DNS failure, TLS failure, connection refused, or the timeout above.
        return { verdict: "unreachable", ms: Date.now() - started };
    }
}

/** Runs `worker` over `items`, at most `CONCURRENCY` at a time, preserving input order. */
async function mapLimited<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;

    async function lane() {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            results[index] = await worker(items[index]);
        }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, lane));

    return results;
}

/**
 * Checks every outbound URL the projects claim.
 *
 * Both fields, because they fail differently and both matter: `liveUrl` is the
 * one a reader clicks first, and `githubUrl` is the one that silently 404s the
 * day a repository is renamed.
 */
export async function checkProjectLinks(projects: readonly Project[]): Promise<LinkCheck[]> {
    const targets = projects.flatMap((project) =>
        (["liveUrl", "githubUrl"] as const)
            .filter((field) => Boolean(project[field]))
            .map((field) => ({
                slug: project.slug,
                title: project.title,
                field,
                url: project[field] as string,
            })),
    );

    return mapLimited(targets, async (target) => ({ ...target, ...(await probe(target.url)) }));
}

export interface AssetReport {
    /** Files in the repo that no project references. Safe to delete. */
    orphans: string[];
    /** Paths a project references that are not in the repo. Render as a broken image. */
    missing: { slug: string; path: string }[];
    /** Referenced files this console could not have written, so it will not offer to delete them. */
    unmanaged: string[];
    /** True when the listing came back empty because there is no token, not because there are no files. */
    unavailable: boolean;
}

const SCREENSHOT_DIR = "public/images/projects";

/**
 * Reconciles `data/projects.ts` against what is actually in
 * `public/images/projects/`.
 *
 * Two directions, and the second one is the one nobody thinks of. *Orphans* are
 * files nothing references — harmless except that they accumulate forever, which
 * they did until deletion existed. *Missing* is the opposite and worse: an entry
 * pointing at a file that is not there renders a broken image on a project page,
 * and Next does not fail the build over a missing file in `public/`, so nothing
 * anywhere says so.
 *
 * `unmanaged` is the third category and exists so the delete button can be
 * honest. A file whose name this console could not have produced — anything
 * `screenshotTarget` refuses — is left strictly alone, listed, and never
 * offered for deletion.
 */
export async function checkAssets(
    projects: readonly Project[],
    canRead: boolean,
): Promise<AssetReport> {
    if (!canRead) {
        return { orphans: [], missing: [], unmanaged: [], unavailable: true };
    }

    const files = await listDirectory(SCREENSHOT_DIR);
    const present = new Set(files.map((name) => `/images/projects/${name}`));

    const referenced = new Map<string, string>();

    for (const project of projects) {
        for (const path of project.screenshots ?? []) {
            if (!referenced.has(path)) {
                referenced.set(path, project.slug);
            }
        }
    }

    const missing = [...referenced.entries()]
        .filter(([path]) => !present.has(path))
        .map(([path, slug]) => ({ slug, path }));

    const unreferenced = [...present].filter((path) => !referenced.has(path));

    return {
        orphans: unreferenced.filter((path) => screenshotTarget(path) !== null),
        unmanaged: unreferenced.filter((path) => screenshotTarget(path) === null),
        missing,
        unavailable: false,
    };
}
