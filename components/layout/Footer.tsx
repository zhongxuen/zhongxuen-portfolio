import Link from "next/link";
import { Mail, Briefcase, type LucideIcon } from "lucide-react";
import { socials } from "@/data/socials";
import { navigation } from "@/data/navigation";
import { AUTHOR, SITE_DESCRIPTION } from "@/lib/constants";
import { Container } from "@/components/ui/Container";

/**
 * lucide-react v1 removed all brand icons (Github, Linkedin, Twitter/X,
 * etc.) — see https://lucide.dev/guide/react/migration. These are
 * reimplemented as minimal local SVGs so `iconMap` below keeps a
 * consistent component interface (size, className) without pulling in
 * a whole extra icon package for a handful of icons.
 */
function GithubIcon({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .3.2.66.79.55A11.51 11.51 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5Z" />
        </svg>
    );
}

function LinkedinIcon({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45Z" />
        </svg>
    );
}

function TwitterIcon({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M18.9 2h3.2l-7 8 8.2 12h-6.4l-5-6.9L5 22H1.8l7.5-8.6L1.4 2h6.5l4.5 6.3L18.9 2Zm-1.1 18.2h1.8L7.3 3.7H5.4l12.4 16.5Z" />
        </svg>
    );
}

/**
 * Maps Social.icon (a string, per types/social.ts) to an actual icon
 * component. Kept as an explicit map rather than dynamic lookup
 * (e.g. `Icons[name]`) so unsupported icon strings fail at compile/dev
 * time via the fallback, not silently render nothing in production.
 */
const iconMap: Record<
    string,
    LucideIcon | (({ size }: { size?: number }) => React.JSX.Element)
> = {
    Github: GithubIcon,
    Linkedin: LinkedinIcon,
    Twitter: TwitterIcon,
    Mail,
    Briefcase,
};

export function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-muted/10 bg-background">
            <Container className="flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2">
                    <span className="font-heading text-lg font-semibold text-foreground">
                        {AUTHOR.name}
                    </span>
                    <p className="max-w-xs text-sm text-muted">{SITE_DESCRIPTION}</p>
                </div>

                <nav
                    aria-label="Footer navigation"
                    className="flex flex-wrap gap-x-6 gap-y-2"
                >
                    {navigation.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="text-sm text-muted transition-colors hover:text-foreground"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex gap-4">
                    {socials.map((social) => {
                        const Icon = iconMap[social.icon];

                        return (
                            <a
                                key={social.id}
                                href={social.url}
                                target={social.url.startsWith("mailto:") ? undefined : "_blank"}
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-muted/20 text-muted transition-colors hover:border-primary hover:text-primary"
                            >
                                {Icon ? <Icon size={18} /> : social.label}
                            </a>
                        );
                    })}
                </div>
            </Container>

            <Container className="border-t border-muted/10 py-6">
                <p className="text-center text-xs text-muted">
                    © {year} {AUTHOR.name}. All rights reserved.
                </p>
            </Container>
        </footer>
    );
}