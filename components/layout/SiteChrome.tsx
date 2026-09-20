import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PointerFX } from "@/components/motion/PointerFX";
import { projects } from "@/data/projects";
import { toPaletteProjects } from "@/lib/commandPalette";
import { getResumeMeta } from "@/lib/resume/meta";

/**
 * The public site's chrome: skip link, drafting grid, pointer listener, navbar,
 * `<main id="main">` and footer.
 *
 * This used to live directly in app/layout.tsx. It moved out when the tree
 * split into (site) and (admin) route groups — the admin console must not
 * inherit the portfolio's navbar, footer or scroll choreography — and it is a
 * component rather than just the body of app/(site)/layout.tsx because
 * app/not-found.tsx has to render the same chrome.
 *
 * Why not-found cannot simply live inside (site): the root app/not-found.tsx is
 * the only file Next.js guarantees will catch a URL that matches no route at
 * all (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md,
 * "the root app/not-found.js ... handle any unmatched URLs"). With two route
 * groups there is no root-most group for it to belong to, so it stays at the
 * root and composes this instead. Two callers, one definition — a 404 that
 * loses the navbar is a dead end with no way out of it.
 *
 * SERVER ONLY — `getResumeMeta()` uses node:fs.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/*
             * First focusable element on the page, per docs/uiux.md §5.3.
             * Visually hidden until focused, then pinned above everything.
             * It targets #main, which is rendered below — the two move together.
             */}
            <a
                href="#main"
                className="sr-only bp-meta focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-toast focus-visible:rounded-sm focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:font-medium focus-visible:text-accent-ink"
            >
                Skip to content
            </a>

            {/*
             * Decorative drafting grid — chrome only. `bp-grid-drift` is
             * scroll-driven and does nothing at all where `animation-timeline`
             * is unsupported, so the layer is static there rather than broken.
             */}
            <div className="bp-grid bp-grid-drift" aria-hidden="true" />

            {/*
             * One pointer listener for the whole page, feeding the card
             * spotlight and tilt. Renders nothing; see the component for why it
             * is global rather than a hook per card.
             */}
            <PointerFX />

            {/*
             * Resolved here, on the server, so the ⌘K palette can list every
             * project and annotate the resume with its real size without
             * data/projects.ts or node:fs following it into the client bundle.
             * Only the narrowed rows cross over.
             */}
            <Navbar projects={toPaletteProjects(projects)} resume={getResumeMeta()} />
            <main id="main" className="relative z-content flex-1 pt-16">
                {children}
            </main>
            <Footer />
        </>
    );
}
