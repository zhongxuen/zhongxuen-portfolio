"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import {
    isAdminConfigured,
    isTotpEnabled,
    verifyCredentials,
    verifySecondFactor,
} from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { endSession, startSession } from "@/lib/admin/dal";
import { rateLimit } from "@/lib/rateLimit";
import type { LoginState } from "@/types/admin";

/**
 * Login and logout.
 *
 * These are the only two admin actions that do **not** begin with
 * `verifySession()` — `login` is how a session is created, and `logout` destroys
 * one, so requiring a valid session would make the first impossible and the
 * second pointless. tests/admin/actionGuards.test.ts carries them as its two
 * named exemptions, which is deliberately a list a reviewer has to edit rather
 * than a pattern a new action can accidentally match.
 *
 * Both still refuse to run at all on an unconfigured deployment (§9.4).
 *
 * Every outcome is now recorded through `lib/admin/audit.ts` (§17.6). The
 * console's write history is its commit log and needs nothing more; its *access*
 * history had no record at all — not of a successful sign-in, and not of who or
 * where a rejected one came from.
 */

/**
 * 5 attempts per 15 minutes per IP, sharing the courtesy brake the contact form
 * uses. lib/rateLimit.ts is honest that its counters are per-instance and lost
 * on cold start, which is weaker than a login form deserves — so the real
 * defences are elsewhere: scrypt's cost factor, a generated 24-character
 * password (scripts/hash-password.mjs), the optional TOTP second factor
 * (`ADMIN_TOTP_SECRET`), and, recommended alongside this, a Vercel WAF
 * rate-limit rule on /admin/login, which is shared across instances and takes
 * two minutes in the dashboard.
 */
const LOGIN_RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

/**
 * One message for every rejection. Never "no such user", never "wrong
 * password", and — once a second factor is configured — never "the password was
 * right but the code was wrong". Each would turn the form into an oracle for the
 * part that was correct.
 *
 * The audit log does record which half failed, because that distinction is
 * exactly what makes the log worth having, and a server-side log is not
 * reachable by the person guessing.
 */
const REJECTED = "Those credentials were not accepted.";

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
    if (!isAdminConfigured()) {
        notFound();
    }

    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const code = String(formData.get("code") ?? "").trim();
    const ip = await clientIp();

    /*
     * Limited before verification, unlike the contact form — which checks its
     * limit after validation so a fumbled email format does not burn quota.
     * The reasoning inverts here: on a login form the guess *is* the expensive
     * operation to protect, and a malformed attempt is indistinguishable from a
     * cheap probe.
     */
    const limit = rateLimit(`admin-login:${ip}`, LOGIN_RATE_LIMIT.max, LOGIN_RATE_LIMIT.windowMs);

    if (!limit.ok) {
        const minutes = Math.ceil(limit.retryAfter / 60);

        audit("login.rate-limited", { ip, username, retryAfter: limit.retryAfter });

        return {
            status: "error",
            message: `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
            username,
        };
    }

    if (!username || !password || !verifyCredentials(username, password)) {
        audit("login.rejected", { ip, username });

        return { status: "error", message: REJECTED, username };
    }

    /*
     * The second factor is checked after the password and never before it, so a
     * caller with no password cannot use this form to probe codes — and so the
     * rejection reason in the log means what it says. `verifySecondFactor`
     * returns true when no secret is configured; see why in lib/admin/auth.ts.
     */
    if (!verifySecondFactor(code)) {
        audit("login.totp-rejected", { ip, username });

        return {
            status: "error",
            message: REJECTED,
            username,
        };
    }

    await startSession();

    audit("login.success", {
        ip,
        username,
        note: isTotpEnabled() ? "with second factor" : undefined,
    });

    /*
     * Never wrap this in a try/catch. `redirect()` works by throwing a
     * control-flow signal that Next catches; a `catch` around it swallows the
     * navigation and returns a "something went wrong" state after a
     * *successful* login.
     */
    redirect("/admin");
}

export async function logout(): Promise<void> {
    if (!isAdminConfigured()) {
        notFound();
    }

    audit("logout", { ip: await clientIp() });

    await endSession();
    redirect("/admin/login");
}

/**
 * Best-effort client address for the rate-limit key and the audit line,
 * identical in reasoning to `clientIp()` in app/actions/contact.ts:
 * `x-forwarded-for` is client-settable and only a proxy can be trusted to
 * overwrite it, so on Vercel the leftmost entry is the real caller. Everything
 * unidentifiable — including all of local development — shares the "unknown"
 * bucket.
 */
async function clientIp(): Promise<string> {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();

    return forwarded || headerList.get("x-real-ip")?.trim() || "unknown";
}
