/**
 * Shared types for the admin console (docs/admin-plan.md).
 *
 * Deliberately free of server-only code: client components import
 * `ActionResult` and the form state shapes, so anything added here ships to the
 * browser. The same discipline lib/contact.ts documents.
 */

/**
 * A verified admin session. There is exactly one operator, so `sub` is a
 * constant rather than a user id — it exists so the signed payload is
 * self-describing rather than an opaque timestamp pair.
 */
export interface AdminSession {
    sub: "admin";
    /** Issued-at, epoch seconds. */
    iat: number;
    /** Expiry, epoch seconds. Rejected before the payload is trusted for anything. */
    exp: number;
    /**
     * Revocation generation, from `ADMIN_SESSION_EPOCH`. A token whose epoch is
     * not the configured one is rejected however valid its signature — that is
     * the "sign out everywhere" lever, and it takes effect without rotating the
     * signing secret. Optional so tokens minted before the field existed still
     * verify; see `DEFAULT_SESSION_EPOCH` in lib/admin/session.ts.
     */
    epoch?: number;
}

/**
 * The outcome of a commit to GitHub.
 *
 * `url` is the commit's html_url, surfaced in the UI so every save is one click
 * from its own audit record.
 */
export interface CommitResult {
    sha: string;
    url: string;
}

/**
 * What every admin Server Action returns.
 *
 * `status: "conflict"` is its own case rather than an error string because it
 * has a specific remedy the UI has to offer: the repo moved under us (a stale
 * blob sha, §6.2), so the page must re-read before the save can be retried.
 * Lumping it in with "error" would invite a retry that fails the same way.
 *
 * Nothing here may carry a token, an API response body or anything about
 * secret state — action return values are serialized straight to the client.
 */
export type ActionStatus = "idle" | "success" | "error" | "conflict";

export interface ActionResult {
    status: ActionStatus;
    /** Human-readable outcome, announced in an aria-live region. Empty while idle. */
    message: string;
    /** Set on success, when the action committed something. */
    commit?: CommitResult;
}

export const IDLE_ACTION: ActionResult = { status: "idle", message: "" };

/** A repo that has no local project entry — proposed as a new one. */
export interface SyncAddition {
    kind: "added";
    /** Normalized repo name, used as the new project's slug. */
    slug: string;
    title: string;
    description: string;
    technologies: string[];
    githubUrl: string;
    githubRepo: string;
    liveUrl?: string;
}

/** A matched project whose stored fields disagree with the live repo. */
export interface SyncChange {
    kind: "changed";
    slug: string;
    title: string;
    field: "liveUrl" | "githubUrl";
    /** What data/projects.ts says today. Absent when the field is unset. */
    current?: string;
    /** What the repo says. */
    proposed: string;
}

/** A project whose `githubRepo` no longer resolves. Flagged, never auto-deleted. */
export interface SyncOrphan {
    kind: "orphaned";
    slug: string;
    title: string;
    githubRepo: string;
}

export type SyncEntry = SyncAddition | SyncChange | SyncOrphan;

export interface SyncPlan {
    added: SyncAddition[];
    changed: SyncChange[];
    orphaned: SyncOrphan[];
}

/**
 * Stable identifier for one entry of a `SyncPlan`, used as the checkbox value
 * in the review form and re-derived server-side when the selection comes back.
 * A form cannot post an object, and posting the whole plan would let the client
 * choose what gets written.
 */
export function syncEntryId(entry: SyncEntry): string {
    return entry.kind === "changed"
        ? `changed:${entry.slug}:${entry.field}`
        : `${entry.kind}:${entry.slug}`;
}

/**
 * State of the login form.
 *
 * `username` is echoed back so a rejected attempt does not wipe it — React
 * resets an uncontrolled form once its action settles. The password is
 * deliberately *not* echoed: it would travel back down the wire and sit in the
 * RSC payload for no benefit, and retyping it is the correct cost of getting it
 * wrong.
 */
export interface LoginState {
    status: "idle" | "error";
    message: string;
    username: string;
}

export const INITIAL_LOGIN_STATE: LoginState = { status: "idle", message: "", username: "" };

/** A rendered-but-uncommitted résumé, returned for review. */
export interface ResumePreview {
    /** `data:application/pdf;base64,…`, for the in-page <object> preview. */
    dataUrl: string;
    pageCount: number;
    byteLength: number;
}

/**
 * State of the résumé page's actions.
 *
 * Lives here rather than beside the actions because a `"use server"` module may
 * only export async functions — a type or a constant exported from one is a build
 * error, not a style preference.
 *
 * `preview` is what makes regeneration safe: the render action returns bytes and
 * a page count and commits nothing, so replacing a résumé already sent to someone
 * takes a second, explicit press.
 */
export interface ResumeActionState extends ActionResult {
    preview?: ResumePreview;
}

export const IDLE_RESUME: ResumeActionState = { status: "idle", message: "" };

/**
 * How a Vercel build is doing, for the banner that a save leaves behind.
 *
 * `"unknown"` and `"pending"` are deliberately different. Pending means the
 * deployment has not appeared yet and one more poll is worth making; unknown
 * means this deployment has no Vercel token configured, or the API could not be
 * reached, and no amount of waiting will produce an answer. Collapsing them
 * would make the UI either spin forever on an unconfigured deploy or give up on
 * a commit that was two seconds old.
 */
export type DeployState = "pending" | "building" | "ready" | "error" | "canceled" | "unknown";

export interface DeployStatusResult {
    state: DeployState;
    /** The build log. On a failure this is the only useful destination. */
    inspectorUrl?: string;
    /** The deployment's own URL. */
    url?: string;
    /** Epoch ms. */
    createdAt?: number;
}

/**
 * What the health page's link sweep returns.
 *
 * Lives here rather than beside the action for the reason `ResumeActionState`
 * documents: a `"use server"` module's exports are the action surface, and
 * keeping it to async functions means nothing has to reason about which of them
 * is erased at compile time and which becomes a callable endpoint.
 *
 * `LinkCheck` is imported from lib/admin/health.ts as a type only — that module
 * is `server-only`, and a type import is erased before any of it could reach a
 * client bundle.
 */
export interface LinkCheckResult extends ActionResult {
    checks?: import("@/lib/admin/health").LinkCheck[];
    /** When the sweep ran, so a stale result left on screen is visibly stale. */
    ranAt?: number;
}
