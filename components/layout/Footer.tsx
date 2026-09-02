import Link from "next/link";
import { socials } from "@/data/socials";
import { navigation } from "@/data/navigation";
import { AUTHOR, SITE_DESCRIPTION, SITE_LAST_MODIFIED } from "@/lib/constants";
import { Container } from "@/components/ui/Container";
import { Monogram } from "@/components/ui/Monogram";
import { AvailabilityPill } from "@/components/ui/AvailabilityPill";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { NavLink } from "@/components/layout/NavLink";

/**
 * Site footer (docs/uiux.md §4.9).
 *
 * Three columns — identity + availability, navigation, elsewhere — over an
 * oversized low-contrast wordmark that closes the page, with a mono build
 * stamp in the base rule.
 *
 * The stamp reads SITE_LAST_MODIFIED rather than `new Date()`: that constant
 * is bumped deliberately when content changes, and rendering today's date
 * instead would claim a fresh deploy on every rebuild.
 */
export function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="relative z-content mt-16 overflow-hidden border-t border-line bg-void">
            <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
                <div className="flex flex-col items-start gap-4">
                    <Link
                        href="/"
                        aria-label={`${AUTHOR.name} — home`}
                        className="bp-focus bp-ticks bp-ticks-live inline-flex items-center gap-3 border border-line p-2 text-ink transition-colors hover:border-line-strong hover:text-accent"
                    >
                        <Monogram size={20} />
                        <span className="bp-meta">{AUTHOR.name}</span>
                    </Link>

                    <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
                        {SITE_DESCRIPTION}
                    </p>

                    <AvailabilityPill />
                </div>

                <nav aria-label="Footer navigation" className="flex flex-col gap-3">
                    <h2 className="bp-meta text-ink-muted">Navigate</h2>
                    <ul className="flex flex-col gap-2">
                        {navigation.map((item) => (
                            <li key={item.id}>
                                {/* NavLink, not Link: navigation hrefs are bare
                                    `#section`, which resolve against the
                                    current path — dead on /projects/[slug]. */}
                                <NavLink
                                    href={item.href}
                                    className="bp-focus text-sm text-ink-muted transition-colors hover:text-accent"
                                >
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="flex flex-col gap-3">
                    <h2 className="bp-meta text-ink-muted">Elsewhere</h2>
                    <ul className="flex flex-wrap gap-2">
                        {socials.map((social) => (
                            <li key={social.id}>
                                <a
                                    href={social.url}
                                    target={
                                        social.url.startsWith("mailto:") ? undefined : "_blank"
                                    }
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="bp-focus bp-ticks bp-ticks-live inline-flex h-10 w-10 items-center justify-center border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-accent"
                                >
                                    <SocialIcon icon={social.icon} label={social.label} />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </Container>

            {/*
             * Closing wordmark. Purely typographic chrome at --bp-line
             * contrast, clipped by the footer's overflow-hidden; the same name
             * is already announced by the identity link above.
             */}
            <div
                aria-hidden="true"
                className="pointer-events-none px-4 select-none sm:px-6 lg:px-8"
            >
                <span className="block translate-y-[0.13em] font-display text-[clamp(2.5rem,13.5vw,11rem)] leading-none font-bold tracking-tighter whitespace-nowrap text-line">
                    {AUTHOR.name.toUpperCase()}
                </span>
            </div>

            <Container className="flex flex-col items-center justify-between gap-2 border-t border-line py-5 sm:flex-row">
                <p className="text-xs text-ink-muted">
                    © {year} {AUTHOR.name}. All rights reserved.
                </p>
                <p className="bp-meta text-ink-muted">
                    Last deployed · {SITE_LAST_MODIFIED}
                </p>
            </Container>
        </footer>
    );
}
