import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { isAdminConfigured, sessionEpoch, sessionSecret } from "@/lib/admin/auth";
import {
    SESSION_COOKIE,
    SESSION_MAX_AGE_SECONDS,
    createSessionToken,
    verifySessionToken,
} from "@/lib/admin/session";
import type { AdminSession } from "@/types/admin";

/**
 * The admin console's data access layer (docs/admin-plan.md §4.3).
 *
 * `verifySession()` is the **authoritative** authorization check and must be the
 * first statement of every admin page and every admin Server Action.
 * `proxy.ts` performs the same check optimistically, but the Next 16 proxy docs
 * are explicit that it cannot be the security boundary:
 *
 *   "Server Functions are not separate routes… a Proxy matcher that excludes a
 *   path will also skip Server Function calls on that path… Always verify
 *   authentication and authorization inside each Server Function rather than
 *   relying on Proxy alone."
 *
 * A Server Action is a public POST endpoint reachable by replay — the same
 * reasoning already written into app/actions/contact.ts. An action that forgets
 * the first line below is the vulnerability this module exists to prevent, so
 * tests/admin/actionGuards.test.ts asserts by static check that every exported
 * action calls it.
 */

/**
 * Returns the verified session, or redirects to the login page.
 *
 * It redirects in both contexts rather than returning a rejection state in
 * actions, which keeps one name and one behaviour: a `redirect()` thrown inside
 * a Server Action is turned into a client navigation by Next, so an expired
 * session lands the operator on the login form instead of on a form that
 * silently refuses to save. The alternative — a rejection string per action —
 * would be a second code path that the static guard test could not see.
 *
 * Wrapped in React `cache()` so it runs once per render pass no matter how many
 * pages, layouts and components ask.
 *
 * An unconfigured deployment 404s rather than redirecting (§9.4): there is no
 * login page to send anyone to, and a redirect would advertise the console's
 * existence on a deploy that has no credentials for it.
 */
export const verifySession = cache(async (): Promise<AdminSession> => {
    if (!isAdminConfigured()) {
        notFound();
    }

    const session = await readSession();

    if (!session) {
        redirect("/admin/login");
    }

    return session;
});

/**
 * Reads and verifies the cookie without redirecting.
 *
 * For the two callers that need the answer rather than the enforcement: the
 * login page (already signed in → go to the dashboard) and the layout's nav,
 * which must not fight `verifySession()` over who redirects first.
 */
export const readSession = cache(async (): Promise<AdminSession | null> => {
    const store = await cookies();

    return verifySessionToken(
        store.get(SESSION_COOKIE)?.value,
        sessionSecret(),
        Date.now(),
        sessionEpoch(),
    );
});

/**
 * Cookie attributes, in one place so the login action and the logout action
 * cannot disagree about them.
 *
 * `secure` is conditional on purpose: an unconditional `Secure` cookie is
 * silently dropped by the browser over plain http, which would make local
 * development look like a broken password rather than a cookie policy.
 * `sameSite: "lax"` rather than `"strict"`, so arriving at /admin from an
 * external link still carries the session.
 */
function cookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
    };
}

/** Mints a fresh session cookie. Only called from the login action. */
export async function startSession(): Promise<void> {
    const secret = sessionSecret();

    if (!secret) {
        throw new Error("startSession called without ADMIN_SESSION_SECRET");
    }

    const store = await cookies();

    store.set(SESSION_COOKIE, createSessionToken(secret, Date.now(), sessionEpoch()), {
        ...cookieOptions(),
        maxAge: SESSION_MAX_AGE_SECONDS,
    });
}

/**
 * Clears the session cookie.
 *
 * Deletion is by overwrite-then-expire rather than `store.delete()` so the
 * response carries an explicit `Max-Age=0` for the same name, path and
 * attributes the cookie was set with.
 */
export async function endSession(): Promise<void> {
    const store = await cookies();

    store.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
