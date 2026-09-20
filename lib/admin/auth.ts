import "server-only";

import { readEpoch, verifyPassword, verifyUsername } from "@/lib/admin/session";
import { verifyTotp } from "@/lib/admin/totp";

/**
 * The admin console's credentials, read from the environment (docs/admin-plan.md §4.1).
 *
 * `server-only` and env-reading; lib/admin/session.ts holds the crypto and takes
 * every secret as a parameter. That split is the whole point of two files: the
 * algorithms stay testable without a fake environment, and the one module that
 * can see a secret is the one module that cannot be imported from a client
 * component.
 *
 * Every value is read through a function rather than captured in a
 * module-level constant. `process.env` is populated per invocation on Vercel,
 * and a constant evaluated at import time would freeze whatever the build saw.
 */

export function adminUsername(): string | undefined {
    return process.env.ADMIN_USERNAME;
}

export function adminPasswordHash(): string | undefined {
    return process.env.ADMIN_PASSWORD_HASH;
}

export function sessionSecret(): string | undefined {
    return process.env.ADMIN_SESSION_SECRET;
}

/**
 * The current session generation (§17.5).
 *
 * Deliberately *not* part of `isAdminConfigured()`. An unset epoch is the
 * normal, working state — it means "never revoked" — whereas an unset password
 * hash means there is no console. Requiring it would 404 every existing
 * deployment on the day this shipped.
 */
export function sessionEpoch(): number {
    return readEpoch(process.env.ADMIN_SESSION_EPOCH);
}

/**
 * Whether a second factor is required at login (§17.10).
 *
 * Presence of the secret is the switch — there is no separate "enabled" flag to
 * disagree with it. Like `sessionEpoch`, it is deliberately outside
 * `isAdminConfigured()`: absent means no second factor, which is a working
 * configuration, not a broken one.
 */
export function isTotpEnabled(): boolean {
    return Boolean(process.env.ADMIN_TOTP_SECRET);
}

/**
 * Verifies a submitted TOTP code, or returns true when no second factor is
 * configured.
 *
 * The "no secret" case returns *true* rather than false on purpose: the caller
 * asks "is this login's second factor satisfied", and on a deployment with no
 * second factor the answer is yes. Inverting it would make an unconfigured TOTP
 * lock everyone out, which is the failure mode an optional feature must not
 * have. The one place that must not rely on this is the form — it asks
 * `isTotpEnabled()` before rendering the field.
 */
export function verifySecondFactor(code: string): boolean {
    if (!isTotpEnabled()) {
        return true;
    }

    return verifyTotp(code, process.env.ADMIN_TOTP_SECRET);
}

/**
 * True when all three credential variables are present.
 *
 * **When this is false, `/admin` is a 404** — not a login page (§9.4). An admin
 * console with no configured password should not exist as a reachable surface,
 * and a preview deploy that lacks the secrets should not advertise one. The
 * check is presence only; a wrong value fails at login, loudly, where it can be
 * read as a wrong value rather than as a missing feature.
 */
export function isAdminConfigured(): boolean {
    return Boolean(adminUsername() && adminPasswordHash() && sessionSecret());
}

/**
 * Verifies a submitted username and password together.
 *
 * Both halves are always evaluated — no early return on a username mismatch —
 * so a wrong username costs the same scrypt work as a wrong password and the
 * response time says nothing about which one was wrong. The caller returns one
 * generic message for the same reason.
 */
export function verifyCredentials(username: string, password: string): boolean {
    const usernameOk = verifyUsername(username, adminUsername());
    const passwordOk = verifyPassword(password, adminPasswordHash());

    return usernameOk && passwordOk;
}

/**
 * Presence of the optional variables the console reports on its settings page
 * (§7.6). Presence only, never values — the panel exists to answer "is this
 * deploy wired up", which a boolean answers and a secret does not.
 */
export function environmentPresence(): { key: string; present: boolean; purpose: string }[] {
    return [
        {
            key: "GITHUB_ADMIN_TOKEN",
            present: Boolean(process.env.GITHUB_ADMIN_TOKEN),
            purpose: "Write access to the repo. Without it every save in this console fails.",
        },
        {
            key: "GITHUB_TOKEN",
            present: Boolean(process.env.GITHUB_TOKEN),
            purpose:
                "Read-only repo stats on the public site. Optional; raises the API rate limit.",
        },
        {
            key: "RESEND_API_KEY",
            present: Boolean(process.env.RESEND_API_KEY),
            purpose: "Contact-form email delivery. Without it the form falls back to mailto.",
        },
        {
            key: "CONTACT_FROM_EMAIL",
            present: Boolean(process.env.CONTACT_FROM_EMAIL),
            purpose: "Sender identity for contact email. Defaults to Resend's shared sender.",
        },
        {
            key: "ADMIN_SESSION_EPOCH",
            present: Boolean(process.env.ADMIN_SESSION_EPOCH),
            purpose:
                "Session generation. Raising it signs every device out at once, without rotating the signing secret.",
        },
        {
            key: "VERCEL_TOKEN",
            present: Boolean(process.env.VERCEL_TOKEN),
            purpose:
                "Read-only deployment status. Without it a save cannot report whether its build succeeded.",
        },
        {
            key: "VERCEL_PROJECT_ID",
            present: Boolean(process.env.VERCEL_PROJECT_ID),
            purpose: "Which project to read deployments from. Vercel does not inject this one.",
        },
        {
            key: "ADMIN_TOTP_SECRET",
            present: Boolean(process.env.ADMIN_TOTP_SECRET),
            purpose:
                "Base32 secret for a second factor at login. Optional; when set, a 6-digit code is required.",
        },
        {
            key: "NEXT_PUBLIC_SITE_URL",
            present: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
            purpose: "Canonical origin. Falls back to Vercel's production hostname.",
        },
    ];
}
