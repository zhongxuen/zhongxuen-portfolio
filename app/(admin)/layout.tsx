import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdminConfigured } from "@/lib/admin/auth";

/**
 * Layout for the admin console.
 *
 * Not a root layout — app/layout.tsx still owns <html>, <body>, the fonts and
 * the theme. This group exists so the console does not inherit the portfolio's
 * navbar, footer, drafting grid, pointer effects or scroll choreography
 * (docs/admin-plan.md §3.1). The per-page chrome is
 * components/admin/AdminShell.tsx; the pages compose it themselves, because the
 * login page must not have a nav rail.
 *
 * **The 404 here is the important line.** When the credential variables are
 * unset, every route under /admin does not exist — not "shows a login page".
 * An admin console with no configured password should not be a reachable
 * surface, and a preview deploy that lacks the secrets should not advertise
 * one (§9.4). The check is repeated in `verifySession()` and in the auth
 * actions, because a layout is not a security boundary for a Server Action.
 */
export const metadata: Metadata = {
    /*
     * Belt and braces with the `X-Robots-Tag` header in next.config.ts and the
     * `disallow: "/admin"` in app/robots.ts. Three mechanisms for one outcome
     * because they fail differently: a header can be dropped by a proxy,
     * robots.txt is advisory, and this tag is the one that travels with the
     * document itself.
     */
    robots: { index: false, follow: false, nocache: true },
    title: "Console",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    if (!isAdminConfigured()) {
        notFound();
    }

    return children;
}
