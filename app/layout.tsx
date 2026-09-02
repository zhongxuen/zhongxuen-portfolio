import type { Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { buildMetadata } from "@/lib/metadata";
import {
    buildWebsiteStructuredData,
    buildPersonStructuredData,
    serializeJsonLd,
} from "@/lib/structuredData";
import { HOME_META_DESCRIPTION } from "@/lib/constants";
import { projects } from "@/data/projects";
import { toPaletteProjects } from "@/lib/commandPalette";
import { getResumeMeta } from "@/lib/resume";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { THEME_COLORS, THEME_SCRIPT } from "@/lib/theme";
import { ThemeProvider } from "@/hooks/useTheme";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

/**
 * Three families, per docs/uiux.md §2.3 — Space Grotesk (display),
 * Inter (body), IBM Plex Mono (annotation). This replaces the previous
 * Poppins + Inter + JetBrains Mono set; the count is unchanged, the pairing
 * becomes technical rather than generic.
 *
 * Space Grotesk and Inter are variable, so no `weight` is needed. IBM Plex
 * Mono is not, so its two used weights are listed explicitly.
 *
 * Preload: display and body only. Both paint above the fold on first view, so
 * a swap on either is a visible LCP defect. The mono face carries nothing but
 * small annotations, so it loads unpreloaded and swaps in unnoticed — one
 * fewer render-blocking hint than preloading all three.
 */
const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    subsets: ["latin"],
    display: "swap",
});

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
    variable: "--font-ibm-plex-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
    display: "swap",
    preload: false,
});

export const metadata = buildMetadata({
    isHome: true,
    description: HOME_META_DESCRIPTION,
    keywords: [
        "Full-Stack Developer",
        "Next.js",
        "React",
        "TypeScript",
        "Java",
        "Python",
        "Supabase",
        "Asia Pacific University",
        "APU",
    ],
});

/**
 * Two media-scoped tags rather than one colour, so the browser chrome matches
 * the palette a first-time visitor actually gets. They are emitted at build
 * time and so can only know the OS preference; ThemeProvider repoints both to
 * the resolved theme once an explicit choice exists.
 */
export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
        { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            /* The theme script below sets data-theme / data-theme-mode on this
               element before React ever sees it. */
            suppressHydrationWarning
            className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col bg-void text-ink">
                {/*
                 * Must stay the first node in the body: it is a blocking script,
                 * so it resolves the theme while the parser is still ahead of
                 * every pixel of content, and nothing paints in the wrong
                 * palette. See lib/theme.ts for what it writes and why.
                 */}
                <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

                {/*
                 * Two nodes, one entity graph: WebSite references the Person
                 * by @id rather than restating it, so the pair resolves to a
                 * single author across every page. serializeJsonLd escapes
                 * `<`, `>` and `&` so no data string can break out of the tag.
                 */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: serializeJsonLd(buildWebsiteStructuredData()),
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: serializeJsonLd(buildPersonStructuredData()),
                    }}
                />

                {/*
                 * First focusable element on the page, per docs/uiux.md §5.3.
                 * Visually hidden until focused, then pinned above everything.
                 */}
                <a
                    href="#main"
                    className="sr-only bp-meta focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-toast focus-visible:rounded-sm focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:font-medium focus-visible:text-accent-ink"
                >
                    Skip to content
                </a>

                {/* Decorative drafting grid — chrome only. */}
                <div className="bp-grid" aria-hidden="true" />

                <ThemeProvider>
                    {/*
                     * Resolved here, on the server, so the ⌘K palette can list
                     * every project and annotate the resume with its real size
                     * without data/projects.ts or node:fs following it into
                     * the client bundle. Only the narrowed rows cross over.
                     */}
                    <Navbar projects={toPaletteProjects(projects)} resume={getResumeMeta()} />
                    <main id="main" className="relative z-content flex-1 pt-16">
                        {children}
                    </main>
                    <Footer />
                </ThemeProvider>

                {/*
                 * Analytics counts visits; Speed Insights reports the field
                 * Core Web Vitals (LCP, INP, CLS) from real sessions. Both are
                 * needed -- traffic alone cannot say whether a rendering change
                 * helped, which is the question every performance edit in this
                 * tree is trying to answer.
                 */}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
