import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readEpoch, verifySessionToken } from "@/lib/admin/session";

/**
 * Optimistic session check for /admin (docs/admin-plan.md §4.3).
 *
 * **This is not the security boundary.** It exists so an unauthenticated
 * visitor gets a login page instead of a flash of admin chrome, and so a
 * navigation costs one redirect rather than a render. The authoritative check is
 * `verifySession()` in lib/admin/dal.ts, called as the first statement of every
 * admin page and every admin Server Action — because, as the Next 16 proxy docs
 * put it, "Server Functions are not separate routes… Always verify
 * authentication and authorization inside each Server Function rather than
 * relying on Proxy alone."
 *
 * `node:crypto` is reachable here because Proxy defaults to the Node.js runtime
 * in Next 16 and the `runtime` config option is not available in a proxy file
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md,
 * "Runtime"). That is what lets the session format stay dependency-free.
 *
 * The file is named `proxy.ts`, not `middleware.ts`: the middleware convention
 * is deprecated in Next 16.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // The login page is the redirect target, so guarding it would loop.
    if (pathname === "/admin/login") {
        return NextResponse.next();
    }

    /*
     * The epoch is read here too, not only in the DAL. This check is optimistic
     * and not the security boundary, but leaving it out would mean a revoked
     * cookie still got waved through to a page that then redirected — a flash of
     * admin chrome, which is the one thing this proxy exists to prevent.
     */
    const session = verifySessionToken(
        request.cookies.get(SESSION_COOKIE)?.value,
        process.env.ADMIN_SESSION_SECRET,
        Date.now(),
        readEpoch(process.env.ADMIN_SESSION_EPOCH),
    );

    if (session) {
        return NextResponse.next();
    }

    /*
     * An absolute URL built from the incoming one, so the redirect keeps the
     * deployment's own origin rather than a hardcoded host. No `?next=` return
     * path: it would be an open redirect parameter on the one route that must
     * not have one, and there are five admin pages — the dashboard is a fine
     * place to land.
     */
    return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
    /*
     * Both entries are needed in principle and harmless in practice: `:path*`
     * is zero-or-more, so it already covers the bare `/admin`, and naming it
     * explicitly means a future change to path-to-regexp's zero-match
     * behaviour cannot silently unguard the dashboard.
     *
     * Nothing else is matched. Without a matcher a proxy runs on every request
     * including `_next/static` and `public/`, which would put a cookie check in
     * front of every stylesheet and image on the public site.
     */
    matcher: ["/admin", "/admin/:path*"],
};
