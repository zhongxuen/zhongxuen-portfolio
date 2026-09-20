import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { logout } from "@/app/(admin)/actions/auth";
import { Monogram } from "@/components/ui/Monogram";

/**
 * Chrome for every signed-in admin page (docs/admin-plan.md §13).
 *
 * Reuses the site's own tokens and primitives rather than importing a UI kit —
 * `surface`, `line`, `ink-muted`, `bp-focus`, `bp-meta` are all already here.
 * What it deliberately does *not* reuse is the motion system: no `Reveal`, no
 * `PointerFX`, no scroll choreography. The console is a tool, so interactive
 * states get `duration-fast` and nothing else moves.
 *
 * Layout is a fixed rail beside the content on lg and up, and a horizontal
 * scroller above it below that. `id="main"` lives here because the root layout
 * gave it up when the public chrome moved into (site) — see
 * components/layout/SiteChrome.tsx.
 */
export function AdminShell({
    title,
    eyebrow,
    description,
    actions,
    children,
}: {
    title: string;
    eyebrow: string;
    description?: string;
    /** Page-level controls rendered beside the heading — "New project", "Regenerate". */
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-full bg-void">
            {/* Own skip link: the site's lives in SiteChrome, which the admin does not render. */}
            <a
                href="#main"
                className="sr-only bp-meta focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-toast focus-visible:rounded-sm focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:font-medium focus-visible:text-accent-ink"
            >
                Skip to content
            </a>

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
                <div className="flex flex-col gap-6 lg:w-56 lg:shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <Link
                            href="/admin"
                            className="bp-focus flex items-center gap-2.5 rounded-sm"
                            aria-label="Admin dashboard"
                        >
                            <Monogram size={20} />
                            <span className="bp-meta text-ink-muted">Console</span>
                        </Link>
                    </div>

                    {/* Horizontally scrollable on small screens; the rail is short enough not to need a menu. */}
                    <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
                        <AdminNav />
                    </div>

                    <div className="hidden flex-col gap-1 border-t border-line pt-4 lg:flex">
                        <Link
                            href="/"
                            className="bp-focus flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink-muted transition-colors duration-fast ease-bp hover:text-ink"
                        >
                            <ExternalLink size={15} aria-hidden="true" />
                            View live site
                        </Link>

                        {/*
                         * A form, not a link: signing out clears a cookie, which
                         * is a state change and so must not be reachable by a
                         * prefetch or a crawler following a GET.
                         */}
                        <form action={logout}>
                            <button
                                type="submit"
                                className="bp-focus flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-ink-muted transition-colors duration-fast ease-bp hover:text-danger"
                            >
                                <LogOut size={15} aria-hidden="true" />
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>

                <main id="main" className="min-w-0 flex-1">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <AdminHeading
                                eyebrow={eyebrow}
                                title={title}
                                description={description}
                            />
                            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                        </div>

                        {children}
                    </div>

                    {/* Sign-out has to stay reachable on mobile, where the rail's footer is hidden. */}
                    <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-line pt-6 lg:hidden">
                        <Link
                            href="/"
                            className="bp-focus flex items-center gap-2 rounded-sm text-sm text-ink-muted hover:text-ink"
                        >
                            <ExternalLink size={15} aria-hidden="true" />
                            View live site
                        </Link>
                        <form action={logout}>
                            <button
                                type="submit"
                                className="bp-focus flex items-center gap-2 rounded-sm text-sm text-ink-muted hover:text-danger"
                            >
                                <LogOut size={15} aria-hidden="true" />
                                Sign out
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
