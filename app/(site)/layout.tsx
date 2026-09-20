import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * Layout for every public route: /, /projects and /projects/[slug].
 *
 * Not a root layout — app/layout.tsx still owns <html>, <body>, the fonts, the
 * pre-paint theme script, the JSON-LD graph and the analytics scripts, so
 * navigating between (site) and (admin) is a normal client transition rather
 * than the full page reload two root layouts would force.
 *
 * Everything here is chrome the admin console must not inherit. See
 * components/layout/SiteChrome.tsx for why the contents are a component.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return <SiteChrome>{children}</SiteChrome>;
}
