import Link from "next/link";
import { Mail, Briefcase, type LucideIcon } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { socials } from "@/data/socials";
import { navigation } from "@/data/navigation";
import { AUTHOR, SITE_DESCRIPTION } from "@/lib/constants";
import { Container } from "@/components/ui/Container";

/**
 * lucide-react v1 removed all brand/logo icons — see
 * https://lucide.dev/guide/react/migration. Most brand icons now come
 * from @icons-pack/react-simple-icons ("Si" + PascalCase slug), but that
 * package does NOT ship a LinkedIn icon or any Microsoft-product icon —
 * confirmed against the installed v13.11.1 export list: these were
 * removed after a legal takedown request, not omitted by this project.
 * LinkedIn therefore keeps a minimal local SVG here; GitHub resolves to
 * SiGithub. Revisit this file if react-simple-icons ever reinstates
 * LinkedIn in a future release.
 */
function LinkedinIcon({
    size = 18,
    color = "currentColor",
}: {
    size?: number;
    color?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={color}
            aria-hidden="true"
        >
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45Z" />
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
    LucideIcon | (({ size, color }: { size?: number; color?: string }) => React.JSX.Element)
> = {
    Github: SiGithub,
    Linkedin: LinkedinIcon,
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
                                {Icon ? <Icon size={18} color="currentColor" /> : social.label}
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