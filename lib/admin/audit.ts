import "server-only";

/**
 * Structured audit logging for the admin console (docs/admin-plan.md §17.6).
 *
 * **What the dashboard says, and where it is only half right.** It says the
 * commit history *is* the audit log and there was no feature to build. That is
 * exactly true for writes — every save is a commit, signed by the token, with a
 * message, a diff and a timestamp, and no purpose-built log could improve on it.
 *
 * It says nothing about *access*. Before this module, a rejected login produced
 * `console.warn("[admin] rejected login attempt")` — no address, no timestamp
 * beyond the platform's own, no username, and no record whatsoever of a
 * **successful** one. Someone who got in left no trace until they saved
 * something, and someone who tried ten thousand times left ten thousand
 * identical lines. Those are the two questions an access log exists to answer.
 *
 * **Why a log line and not a table.** A database for this would be a database
 * the console does not otherwise have, on a project whose stated constraint is
 * that GitHub is the only store (§2). Vercel retains runtime logs and they are
 * queryable — `vercel logs`, or the Observability tab — so a single, greppable,
 * machine-parseable line per event is the whole feature. `AUDIT` as a fixed
 * prefix and JSON as the payload means one filter finds everything and no
 * regular expression has to guess at field boundaries.
 *
 * **What must never appear here.** No password, no token, no session cookie, no
 * TOTP code — not even a rejected one, since a near-miss code is a real code
 * from a real authenticator a few seconds early or late. The `outcome` plus the
 * address is the entire useful content; anything more is a secret waiting to be
 * copied into a support ticket.
 */

export type AuditEvent =
    | "login.success"
    | "login.rejected"
    | "login.rate-limited"
    | "login.totp-rejected"
    | "logout"
    | "session.revoked";

interface AuditFields {
    /** Best-effort client address. "unknown" covers all of local development. */
    ip?: string;
    /**
     * The submitted username on a rejection.
     *
     * Included because "someone is guessing `admin`" and "someone knows my
     * username" are different situations that call for different responses, and
     * the log is the only place that distinction can be drawn. Truncated,
     * because this is the one field an attacker controls end to end and an
     * unbounded one is a log-flooding primitive.
     */
    username?: string;
    /** Seconds until a rate-limit window reopens. */
    retryAfter?: number;
    /** Free-form, never user-supplied. */
    note?: string;
}

/** Long enough for any plausible username, short enough that a megabyte cannot be posted into a log. */
const MAX_LOGGED_USERNAME = 64;

/**
 * Writes one line.
 *
 * Never throws and is never awaited — an audit log that can fail a login is
 * worse than no audit log, and a login that waits on a log write is a login that
 * hangs when the platform's log sink is slow.
 */
export function audit(event: AuditEvent, fields: AuditFields = {}): void {
    try {
        const payload: Record<string, unknown> = {
            event,
            at: new Date().toISOString(),
            ...fields,
        };

        if (typeof fields.username === "string") {
            /*
             * Control characters are stripped, not escaped. A newline in a
             * username would otherwise let a submitted value forge a second,
             * entirely fake log line — the oldest trick there is, and the reason
             * this goes through JSON rather than string concatenation as well.
             */
            payload.username = fields.username
                .replace(/[\u0000-\u001F\u007F]/g, "")
                .slice(0, MAX_LOGGED_USERNAME);
        }

        const line = JSON.stringify(payload);

        if (event === "login.success" || event === "logout") {
            console.info(`[admin] AUDIT ${line}`);
        } else {
            console.warn(`[admin] AUDIT ${line}`);
        }
    } catch {
        // A logger that throws into a login handler is the bug this catch exists for.
    }
}
