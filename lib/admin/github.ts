import "server-only";

import { AUTHOR } from "@/lib/constants";
import type { CommitResult } from "@/types/admin";

/**
 * GitHub **write** client for the admin console (docs/admin-plan.md §6).
 *
 * Separate from `lib/github.ts`, which is the read-only client on the public
 * render path, and separate for two reasons that both matter:
 *
 *  - **A different token.** `GITHUB_ADMIN_TOKEN`, not `GITHUB_TOKEN`. Giving the
 *    read token write scope would put a repo-write credential into the
 *    environment of every page render for no benefit. The admin token should be
 *    a fine-grained PAT scoped to this one repository, Contents: Read and write,
 *    with an expiry.
 *  - **`server-only`.** This module is the single place the write token is read,
 *    it has no `NEXT_PUBLIC_` anything, and no function here returns a response
 *    body to its caller — only a sha and a URL.
 *
 * Every response is fetched with `cache: "no-store"`. The read client's one-hour
 * ISR window is right for repo stats on a public page and wrong here: a stale
 * blob sha produces a 409 on save, and a stale file listing shows the operator
 * data they did not write.
 */

const API = "https://api.github.com";

const OWNER = AUTHOR.githubUsername;

/**
 * The repository the console writes to.
 *
 * Hardcoded rather than an environment variable: the console's whole model is
 * "this repo is the database" (§2), and a configurable write target is a way to
 * point a write token at the wrong repository. A fork changes this line.
 */
const REPO = "zhongxuen-portfolio";

const DEFAULT_BRANCH = "main";

/**
 * Every path the console may write, by key.
 *
 * The API below takes one of these keys — never a path string — so there is no
 * call shape in which a user-supplied value reaches a commit. That closes path
 * traversal by construction rather than by validation: there is nothing to
 * validate, because the caller cannot express a path at all.
 */
export const WRITABLE_FILES = {
    projects: "data/projects.ts",
    experience: "data/experience.ts",
    education: "data/education.ts",
    skills: "data/skills.ts",
    certifications: "data/certifications.ts",
    now: "data/now.ts",
    resumeConfig: "data/resume.ts",
    availability: "lib/constants.ts",
    resumePdf: "public/resume/resume.pdf",
} as const;

export type WritableKey = keyof typeof WRITABLE_FILES;

/** Image extensions a screenshot upload may use. Checked against real magic bytes too, at the call site. */
const SCREENSHOT_EXTENSIONS = ["jpg", "png", "webp"] as const;

export type ScreenshotExtension = (typeof SCREENSHOT_EXTENSIONS)[number];

/**
 * A commit target.
 *
 * Screenshots are the one destination that cannot be a fixed key, because the
 * filename carries a slug and an index. They are still not a free path: the slug
 * is re-checked against the same `^[a-z0-9]+(?:-[a-z0-9]+)*$` rule
 * `tests/data/integrity.test.ts` asserts, the index must be a small
 * non-negative integer, and the extension comes from a three-item union — so
 * the only strings that can be built are inside `public/images/projects/`.
 */
export type WriteTarget =
    | { kind: "known"; key: WritableKey }
    | { kind: "screenshot"; slug: string; index: number; extension: ScreenshotExtension };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function targetPath(target: WriteTarget): string {
    if (target.kind === "known") {
        return WRITABLE_FILES[target.key];
    }

    if (!SLUG_PATTERN.test(target.slug)) {
        throw new Error("Refusing to commit: screenshot slug is not URL-safe.");
    }

    if (!Number.isInteger(target.index) || target.index < 1 || target.index > 24) {
        throw new Error("Refusing to commit: screenshot index out of range.");
    }

    if (!SCREENSHOT_EXTENSIONS.includes(target.extension)) {
        throw new Error("Refusing to commit: unsupported screenshot extension.");
    }

    return `public/images/projects/${target.slug}-${target.index}.${target.extension}`;
}

/** Public href for a committed screenshot, i.e. what goes in `Project.screenshots`. */
export function screenshotHref(target: Extract<WriteTarget, { kind: "screenshot" }>): string {
    return targetPath(target).replace(/^public/, "");
}

/**
 * The inverse of `screenshotHref`: turns a stored path back into a delete
 * target, or null when it is not one this console could have written.
 *
 * **Null is the whole point.** Deletion is the one operation where a path
 * arriving from stored data reaches the API, and the allowlist above closes
 * traversal by making a path inexpressible — so a delete must re-derive its
 * target through the same constructor rather than trusting the string. Anything
 * that does not match the exact `slug-index.ext` filename the uploader produces
 * comes back null and is skipped: a hand-placed image with a different name, a
 * path with a directory segment in it, an extension the uploader never writes.
 * The caller treats null as "not mine to delete", which is the safe reading in
 * both directions.
 */
export function screenshotTarget(href: string): WriteTarget | null {
    const match = /^\/images\/projects\/([a-z0-9-]+)-(\d+)\.(jpg|png|webp)$/.exec(href);

    if (!match) {
        return null;
    }

    const [, slug, rawIndex, extension] = match;
    const target: WriteTarget = {
        kind: "screenshot",
        slug,
        index: Number(rawIndex),
        extension: extension as ScreenshotExtension,
    };

    /*
     * Built, then round-tripped through the constructor that owns the rules.
     * `targetPath` throws on a slug with a leading hyphen, an index outside
     * 1..24, or an extension outside the union — and re-deriving the href proves
     * this target names the file the caller actually meant, not a near miss.
     */
    try {
        return screenshotHref(target as Extract<WriteTarget, { kind: "screenshot" }>) === href
            ? target
            : null;
    } catch {
        return null;
    }
}

/**
 * Raised when GitHub rejects a write because the repository moved underneath us
 * — a stale blob sha on the Contents API (409), or a non-fast-forward ref
 * update. Its own class so the actions can return `status: "conflict"`, which
 * has a specific remedy (re-read, then redo) that a generic error does not.
 */
export class CommitConflictError extends Error {
    constructor(message = "The repository changed since this page loaded.") {
        super(message);
        this.name = "CommitConflictError";
    }
}

/** Raised when `GITHUB_ADMIN_TOKEN` is absent. Distinct so the UI can say what to configure. */
export class MissingTokenError extends Error {
    constructor() {
        super("GITHUB_ADMIN_TOKEN is not configured on this deployment.");
        this.name = "MissingTokenError";
    }
}

function token(): string {
    const value = process.env.GITHUB_ADMIN_TOKEN;

    if (!value) {
        throw new MissingTokenError();
    }

    return value;
}

export function isGithubWriteConfigured(): boolean {
    return Boolean(process.env.GITHUB_ADMIN_TOKEN);
}

async function request<T>(path: string, init: RequestInit & { method?: string } = {}): Promise<T> {
    const response = await fetch(`${API}${path}`, {
        ...init,
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token()}`,
            "X-GitHub-Api-Version": "2022-11-28",
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
        },
        cache: "no-store",
    });

    if (response.status === 409 || response.status === 422) {
        /*
         * 409 is the Contents API's stale-sha answer; 422 is what a
         * non-fast-forward ref update returns. Both mean the same thing to the
         * operator, and neither should be retried with the same payload.
         */
        throw new CommitConflictError();
    }

    if (!response.ok) {
        /*
         * The body is logged, never thrown: a GitHub error body can echo request
         * details, and an action's thrown message can reach the client. The
         * caller turns this into a generic sentence.
         */
        console.error(
            `[admin/github] ${init.method ?? "GET"} ${path} → ${response.status}`,
            await safeText(response),
        );

        throw new Error(`GitHub API responded ${response.status}`);
    }

    return (await response.json()) as T;
}

async function safeText(response: Response): Promise<string> {
    try {
        return (await response.text()).slice(0, 500);
    } catch {
        return "<unreadable>";
    }
}

export interface RemoteFile {
    /** UTF-8 contents. */
    text: string;
    /** Blob sha, required to update the file. Passing a stale one is how conflicts are detected. */
    sha: string;
}

/**
 * Reads a file's text and blob sha.
 *
 * Uses the raw media type rather than the JSON envelope's base64 `content`,
 * which GitHub omits for files over ~1 MB — a limit `data/projects.ts` is
 * comfortably under today and could grow into. The sha comes from a separate
 * metadata call because the raw response has no body to carry it.
 */
export async function readFile(
    target: WriteTarget,
    branch = DEFAULT_BRANCH,
): Promise<RemoteFile | null> {
    const path = targetPath(target);
    const query = `?ref=${encodeURIComponent(branch)}`;

    const response = await fetch(
        `${API}/repos/${OWNER}/${REPO}/contents/${encodePath(path)}${query}`,
        {
            headers: {
                Accept: "application/vnd.github.raw",
                Authorization: `Bearer ${token()}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
            cache: "no-store",
        },
    );

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        console.error(`[admin/github] read ${path} → ${response.status}`, await safeText(response));
        throw new Error(`GitHub API responded ${response.status}`);
    }

    const text = await response.text();
    const sha = await blobSha(path, branch);

    if (!sha) {
        throw new Error(`Read ${path} but could not resolve its blob sha.`);
    }

    return { text, sha };
}

/** The blob sha of a file, or null when it does not exist on the branch. */
export async function blobSha(path: string, branch = DEFAULT_BRANCH): Promise<string | null> {
    try {
        const meta = await request<{ sha: string }>(
            `/repos/${OWNER}/${REPO}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
        );

        return meta.sha;
    } catch {
        return null;
    }
}

/**
 * Percent-encodes each path segment while leaving the separators alone —
 * `encodeURIComponent` on the whole path would turn every `/` into `%2F`.
 */
function encodePath(path: string): string {
    return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Lists the file names directly inside a repository directory.
 *
 * Only used for `public/images/projects/`, and only to answer two questions the
 * repository can answer and the running build cannot: which screenshots exist
 * that nothing references, and which referenced screenshots do not exist. Both
 * are invisible from inside a deployment — `public/` is baked into the build, so
 * a file deleted from the repo yesterday is still on disk in a deploy from last
 * week.
 *
 * Returns an empty list for a missing directory rather than throwing. An empty
 * `public/images/projects/` is a legitimate state (no screenshots yet), and the
 * health page should report "nothing to clean up", not an error.
 */
export async function listDirectory(path: string, branch = DEFAULT_BRANCH): Promise<string[]> {
    try {
        const entries = await request<{ name: string; type: string }[]>(
            `/repos/${OWNER}/${REPO}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
        );

        if (!Array.isArray(entries)) {
            return [];
        }

        return entries.filter((entry) => entry.type === "file").map((entry) => entry.name);
    } catch {
        return [];
    }
}

export interface FileWrite {
    target: WriteTarget;
    /** Text content, or raw bytes for a binary file. */
    content: string | Uint8Array;
}

/**
 * Commits a single file through the Contents API.
 *
 * The blob `sha` is required for an update and must be the one read at page
 * load. A stale sha returns 409, which is exactly the conflict detection wanted:
 * someone edited the repo from another device, so the save fails loudly rather
 * than clobbering their change. Pass `sha: null` to create a file that does not
 * exist yet.
 */
export async function commitFile({
    target,
    content,
    sha,
    message,
    branch = DEFAULT_BRANCH,
}: FileWrite & { sha: string | null; message: string; branch?: string }): Promise<CommitResult> {
    const result = await request<{ commit: { sha: string; html_url: string } }>(
        `/repos/${OWNER}/${REPO}/contents/${encodePath(targetPath(target))}`,
        {
            method: "PUT",
            body: JSON.stringify({
                message,
                content: toBase64(content),
                branch,
                ...(sha ? { sha } : {}),
            }),
        },
    );

    return { sha: result.commit.sha, url: result.commit.html_url };
}

/**
 * Commits several files as **one** commit, through the Git Data API.
 *
 * The Contents API cannot do this: two PUTs are two commits, and the
 * intermediate one is a real state of `main` in which — for the screenshot case
 * this exists for — `data/projects.ts` references an image that has not been
 * added yet. Every deploy of that commit ships a broken image. So: create blobs,
 * build a tree on the current head, create a commit, fast-forward the ref. One
 * commit, no intermediate broken state.
 *
 * The ref update is not forced, so a push that arrived between the head read and
 * the update is rejected rather than overwritten — the same conflict guarantee
 * the single-file path gets from its blob sha.
 */
export async function commitFiles({
    files = [],
    deletions = [],
    message,
    branch = DEFAULT_BRANCH,
}: {
    files?: FileWrite[];
    /**
     * Paths to remove in the same commit.
     *
     * Deletion is a tree entry whose `sha` is null, which is why it can only be
     * expressed here and not through the Contents API path above — and why
     * removing a screenshot and the entry that referenced it is one commit
     * rather than two. Two commits would leave `main` in a state where
     * data/projects.ts points at an image that has already been deleted.
     */
    deletions?: WriteTarget[];
    message: string;
    branch?: string;
}): Promise<CommitResult> {
    if (files.length === 0 && deletions.length === 0) {
        throw new Error("commitFiles called with nothing to commit.");
    }

    const ref = await request<{ object: { sha: string } }>(
        `/repos/${OWNER}/${REPO}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    const headSha = ref.object.sha;

    const headCommit = await request<{ tree: { sha: string } }>(
        `/repos/${OWNER}/${REPO}/git/commits/${headSha}`,
    );

    const blobs = await Promise.all(
        files.map(async (file) => {
            const blob = await request<{ sha: string }>(`/repos/${OWNER}/${REPO}/git/blobs`, {
                method: "POST",
                body: JSON.stringify({ content: toBase64(file.content), encoding: "base64" }),
            });

            return {
                path: targetPath(file.target),
                mode: "100644" as const,
                type: "blob" as const,
                sha: blob.sha,
            };
        }),
    );

    /*
     * A null sha on an existing path is the Git Data API's delete. The path must
     * already be in the base tree — GitHub answers 422 otherwise, which
     * `request()` reads as a conflict — so callers filter to paths that exist
     * before getting here. `deleteFiles` below does exactly that.
     */
    const removals = deletions.map((target) => ({
        path: targetPath(target),
        mode: "100644" as const,
        type: "blob" as const,
        sha: null,
    }));

    const tree = await request<{ sha: string }>(`/repos/${OWNER}/${REPO}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: [...blobs, ...removals] }),
    });

    const commit = await request<{ sha: string; html_url: string }>(
        `/repos/${OWNER}/${REPO}/git/commits`,
        {
            method: "POST",
            body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
        },
    );

    await request(`/repos/${OWNER}/${REPO}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
    });

    return { sha: commit.sha, url: commit.html_url };
}

/**
 * Removes files, skipping any that are not in the tree.
 *
 * The existence check is not defensive tidiness: GitHub answers a delete of an
 * absent path with 422, which `request()` cannot distinguish from a genuine
 * non-fast-forward and would report to the operator as "the repository changed
 * since this page loaded" — a confusing lie about a file that was already gone.
 * Filtering first means a double-click on "delete orphans" is a no-op rather
 * than a phantom conflict.
 *
 * Returns null when nothing remained to delete, so the caller can say "already
 * clean" instead of reporting an empty commit it did not make.
 */
export async function deleteFiles({
    targets,
    message,
    branch = DEFAULT_BRANCH,
}: {
    targets: WriteTarget[];
    message: string;
    branch?: string;
}): Promise<CommitResult | null> {
    const present: WriteTarget[] = [];

    for (const target of targets) {
        if (await blobSha(targetPath(target), branch)) {
            present.push(target);
        }
    }

    if (present.length === 0) {
        return null;
    }

    return commitFiles({ deletions: present, message, branch });
}

/** base64 for the API, which takes both text and binary that way. */
function toBase64(content: string | Uint8Array): string {
    return Buffer.from(content as Uint8Array | string).toString("base64");
}

export interface CommitSummary {
    sha: string;
    url: string;
    message: string;
    /** ISO timestamp of the commit's author date. */
    date: string;
}

/**
 * Recent commits, newest first, optionally narrowed to one path.
 *
 * The dashboard shows the console's own writes and the résumé page uses the
 * `public/resume/resume.pdf` history as the PDF's real last-modified date —
 * `lib/resume.ts` can only see the file's size, not when it changed, because a
 * checkout's mtimes are the checkout's.
 *
 * Returns an empty list rather than throwing: this is annotation on a page whose
 * job is something else, and a rate-limited GitHub should not take the dashboard
 * down with it.
 */
export async function recentCommits({
    path,
    limit = 5,
    branch = DEFAULT_BRANCH,
}: { path?: string; limit?: number; branch?: string } = {}): Promise<CommitSummary[]> {
    try {
        const query = new URLSearchParams({ sha: branch, per_page: String(limit) });

        if (path) {
            query.set("path", path);
        }

        const commits = await request<
            {
                sha: string;
                html_url: string;
                commit: { message: string; author: { date: string } };
            }[]
        >(`/repos/${OWNER}/${REPO}/commits?${query.toString()}`);

        return commits.map((commit) => ({
            sha: commit.sha,
            url: commit.html_url,
            message: commit.commit.message.split("\n")[0],
            date: commit.commit.author.date,
        }));
    } catch (error) {
        console.error("[admin/github] recentCommits failed", error);

        return [];
    }
}

/**
 * Commit messages. Machine-written, human-readable, greppable — they are the
 * audit log, so they are built here rather than spelled out at each call site
 * where they would drift apart.
 */
export const commitMessage = {
    project: (title: string) => `chore(admin): update project "${title}"`,
    projectCreate: (title: string) => `chore(admin): add project "${title}"`,
    projectDelete: (title: string) => `chore(admin): remove project "${title}"`,
    reorder: (count: number) => `chore(admin): reorder ${count} projects`,
    sync: (count: number) =>
        `chore(admin): apply ${count} change${count === 1 ? "" : "s"} from GitHub sync`,
    resumeUpload: () => "chore(admin): replace resume.pdf",
    resumeGenerate: () => "chore(admin): regenerate resume.pdf from site data",
    settings: (what: string) => `chore(admin): update ${what}`,
    career: (what: string) => `chore(admin): update ${what}`,
    screenshotsDelete: (count: number) =>
        `chore(admin): remove ${count} unreferenced screenshot${count === 1 ? "" : "s"}`,
};
