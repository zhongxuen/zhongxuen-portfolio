"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { isAdminConfigured, verifyCredentials } from "@/lib/admin/auth";
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
 */

/**
 * 5 attempts per 15 minutes per IP, sharing the courtesy brake the contact form
 * uses. lib/rateLimit.ts is honest that its counters are per-instance and lost
 * on cold start, which is weaker than a login form deserves — so the real
 * defences are elsewhere: scrypt's cost factor, a generated 24-character
 * password (scripts/hash-password.mjs), and, recommended alongside this, a
 * Vercel WAF rate-limit rule on /admin/login, which is shared across instances
 * and takes two minutes in the dashboard.
 */
const LOGIN_RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

/**
 * One message for every rejection. Never "no such user", never "wrong
 * password" — either would turn the form into an oracle for the half that was
 * right.
 */
const REJECTED = "Those credentials were not accepted.";

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
    if (!isAdminConfigured()) {
        notFound();
    }

    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    /*
     * Limited before verification, unlike the contact form — which checks its
     * limit after validation so a fumbled email format does not burn quota.
     * The reasoning inverts here: on a login form the guess *is* the expensive
     * operation to protect, and a malformed attempt is indistinguishable from a
     * cheap probe.
     */
    const limit = rateLimit(
        `admin-login:${await clientIp()}`,
        LOGIN_RATE_LIMIT.max,
        LOGIN_RATE_LIMIT.windowMs,
    );

    if (!limit.ok) {
        const minutes = Math.ceil(limit.retryAfter / 60);

        return {
            status: "error",
            message: `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
            username,
        };
    }

    if (!username || !password || !verifyCredentials(username, password)) {
        console.warn("[admin] rejected login attempt");

        return { status: "error", message: REJECTED, username };
    }

    await startSession();

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

    await endSession();
    redirect("/admin/login");
}

/**
 * Best-effort client address for the rate-limit key, identical in reasoning to
 * `clientIp()` in app/actions/contact.ts: `x-forwarded-for` is client-settable
 * and only a proxy can be trusted to overwrite it, so on Vercel the leftmost
 * entry is the real caller. Everything unidentifiable — including all of local
 * development — shares the "unknown" bucket.
 */
async function clientIp(): Promise<string> {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();

    return forwarded || headerList.get("x-real-ip")?.trim() || "unknown";
}
