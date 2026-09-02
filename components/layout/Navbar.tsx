"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { navigation } from "@/data/navigation";
import { useScroll } from "@/hooks/useScroll";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { AUTHOR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";
import { Monogram } from "@/components/ui/Monogram";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { AvailabilityPill } from "@/components/ui/AvailabilityPill";
import { NavLink } from "@/components/layout/NavLink";
import { NavUnderline } from "@/components/layout/NavUnderline";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CommandPaletteTrigger } from "@/components/ui/CommandPaletteTrigger";
import type { PaletteProject } from "@/lib/commandPalette";
import type { ResumeMeta } from "@/lib/resume";

const MOBILE_PANEL_ID = "primary-navigation-panel";

/**
 * Section ids observed for the active-nav indicator. Defined at module scope
 * because useActiveSection takes the array as an effect dependency and needs a
 * stable reference.
 */
const SECTION_IDS = navigation.map((item) => item.id);

export interface NavbarProps {
    /** Command-palette entries for every project, narrowed in app/layout.tsx. */
    projects: PaletteProject[];
    /** Measured resume metadata, for the palette's download command. */
    resume: ResumeMeta;
}

/**
 * Primary site navigation.
 *
 * Blueprint treatment (docs/uiux.md §4.1): monogram in a ticked box, an
 * availability pill, a 2px scroll-progress bar on the bottom edge, and an
 * active-section underline that slides between items rather than cutting.
 *
 * The bar slims from 64px to 56px once scrolled. `main` keeps a fixed 64px
 * top padding regardless — the header is `fixed`, so shrinking it moves
 * nothing below.
 *
 * Section links are plain fragment anchors (see NavLink): the scroll, the
 * history entry and the Back behaviour are all the browser's, driven by the
 * `scroll-behavior` / `scroll-padding-top` rules in app/globals.css. Nothing
 * here intercepts the click except to close the mobile panel.
 *
 * Both animations here used to come from Framer Motion and no longer do. The
 * sliding underline moved to NavUnderline (one transitioned marker instead of
 * a `layoutId` cross-fade), and the mobile panel's enter/exit moved to CSS —
 * `display` is transitioned with `allow-discrete` plus an `@starting-style`
 * entry state, which is what lets the closed panel stay `display: none` and
 * therefore out of the tab order without an AnimatePresence to unmount it.
 * That last part matters: the panel is now always in the DOM, so `hidden`
 * state is expressed purely in CSS and read by `useFocusTrap`'s
 * visibility filter rather than by conditional rendering.
 *
 * The ⌘K trigger sits between the availability pill and the theme toggle. It
 * is the whole always-present cost of the palette — the palette itself is a
 * separate chunk fetched on first open (see CommandPaletteTrigger). The two
 * props below exist only to feed it: they are resolved on the server in
 * app/layout.tsx so that data/projects.ts and node:fs stay out of the client
 * bundle, and narrowed to the fields the command list actually reads.
 */
export function Navbar({ projects, resume }: NavbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    // The trap spans the whole header, not just the panel, so the hamburger
    // toggle stays reachable by keyboard while the menu is open — and so a
    // press on the toggle does not also register as an outside click, which
    // would close and reopen the panel in one gesture.
    const headerRef = useRef<HTMLElement>(null);
    const desktopNavRef = useRef<HTMLElement>(null);
    const { isScrolled } = useScroll();
    const pathname = usePathname();
    const isHome = pathname === "/";
    const activeSection = useActiveSection(SECTION_IDS, isHome);

    const closeMenu = useCallback(() => setIsOpen(false), []);

    useFocusTrap(isOpen, headerRef, closeMenu);
    useOutsideClick(isOpen, headerRef, closeMenu);
    useBodyScrollLock(isOpen);

    /*
     * A route change leaves the panel orphaned over the new page. Every nav
     * link already calls closeMenu, but browser back/forward changes the
     * pathname without one, so the reset is derived during render (React's
     * "adjusting state when a prop changes" pattern) rather than run in an
     * effect, which would render the stale open panel for a frame first.
     */
    const [renderedPathname, setRenderedPathname] = useState(pathname);
    if (renderedPathname !== pathname) {
        setRenderedPathname(pathname);
        setIsOpen(false);
    }

    const activeId = isHome ? activeSection : null;

    return (
        <header
            ref={headerRef}
            className={cn(
                "fixed inset-x-0 top-0 z-nav transition-colors duration-base ease-bp",
                isScrolled || isOpen
                    ? "border-b border-line bg-void/85 backdrop-blur-md"
                    : "border-b border-transparent bg-transparent",
            )}
        >
            {/* Relative wrapper so the progress bar tracks the bar's own
                bottom edge rather than the header's, which grows when the
                mobile panel expands below it. */}
            <div className="relative">
                <Container
                    className={cn(
                        "flex items-center justify-between gap-4 transition-[height] duration-base ease-bp",
                        isScrolled ? "h-14" : "h-16",
                    )}
                >
                    <Link
                        href="/"
                        onClick={closeMenu}
                        aria-label={`${AUTHOR.name} — home`}
                        className="bp-focus bp-ticks bp-ticks-live inline-flex items-center justify-center border border-line p-1.5 text-ink transition-colors hover:border-line-strong hover:text-accent"
                    >
                        <Monogram />
                    </Link>

                    <nav
                        ref={desktopNavRef}
                        aria-label="Primary"
                        className="relative hidden items-center gap-7 md:flex"
                    >
                        {navigation.map((item) => {
                            const isActive = activeId === item.id;

                            return (
                                <NavLink
                                    key={item.id}
                                    href={item.href}
                                    onClick={closeMenu}
                                    data-nav-id={item.id}
                                    /* "location", not "page": the link
                                       addresses a section of the page already
                                       shown, not a different page. */
                                    aria-current={isActive ? "location" : undefined}
                                    className={cn(
                                        "bp-focus relative py-1 text-sm font-medium transition-colors",
                                        isActive ? "text-ink" : "text-ink-muted hover:text-ink",
                                    )}
                                >
                                    {item.label}
                                </NavLink>
                            );
                        })}

                        <NavUnderline activeId={activeId} navRef={desktopNavRef} />
                    </nav>

                    <div className="flex items-center gap-3">
                        {/* xl rather than lg: the ⌘K trigger expands to its
                            full search lockup at lg, and the two together
                            crowd the six nav links at that width. The pill
                            also renders unconditionally in the mobile panel
                            and in the footer, so nothing is lost between. */}
                        <AvailabilityPill className="hidden xl:inline-flex" />

                        <CommandPaletteTrigger projects={projects} resume={resume} />

                        <ThemeToggle />

                        <button
                            type="button"
                            onClick={() => setIsOpen((prev) => !prev)}
                            className="bp-focus inline-flex items-center justify-center rounded-sm p-2 text-ink transition-colors hover:bg-surface md:hidden"
                            aria-label={isOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isOpen}
                            aria-controls={MOBILE_PANEL_ID}
                        >
                            {isOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </Container>

                <ScrollProgress />
            </div>

            <div
                id={MOBILE_PANEL_ID}
                data-open={isOpen ? "true" : "false"}
                className="bp-nav-panel border-t border-line bg-void md:hidden"
            >
                <nav aria-label="Primary, mobile">
                    <Container className="flex flex-col gap-1 py-4">
                        {navigation.map((item) => {
                            const isActive = activeId === item.id;

                            return (
                                <NavLink
                                    key={item.id}
                                    href={item.href}
                                    onClick={closeMenu}
                                    aria-current={isActive ? "location" : undefined}
                                    className={cn(
                                        "bp-focus rounded-sm border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                                        isActive
                                            ? "border-accent bg-surface text-ink"
                                            : "border-transparent text-ink-muted hover:bg-surface hover:text-ink",
                                    )}
                                >
                                    {item.label}
                                </NavLink>
                            );
                        })}

                        <AvailabilityPill className="mt-3 self-start" />
                    </Container>
                </nav>
            </div>
        </header>
    );
}
