import { Mail, Briefcase, type LucideIcon } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";

/**
 * lucide-react v1 removed all brand/logo icons — see
 * https://lucide.dev/guide/react/migration. Most brand icons now come from
 * @icons-pack/react-simple-icons ("Si" + PascalCase slug), but that package
 * does NOT ship a LinkedIn icon or any Microsoft-product icon — confirmed
 * against the installed v13.11.1 export list: these were removed after a legal
 * takedown request, not omitted by this project. LinkedIn therefore keeps a
 * minimal local SVG here; GitHub resolves to SiGithub. Revisit this file if
 * react-simple-icons ever reinstates LinkedIn in a future release.
 */
function LinkedinIcon({ size = 18, color = "currentColor" }: SocialIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45Z" />
        </svg>
    );
}

export interface SocialIconProps {
    size?: number;
    color?: string;
}

export type SocialIconComponent = LucideIcon | ((props: SocialIconProps) => React.JSX.Element);

/**
 * Maps Social.icon (a string, per types/social.ts) to an actual icon
 * component. Kept as an explicit map rather than a dynamic lookup
 * (e.g. `Icons[name]`) so an unsupported icon string falls through to the
 * caller's text fallback instead of silently rendering nothing.
 *
 * Lives here rather than in Footer.tsx because the footer and the contact
 * section render the same set of links, and importing the map out of a page
 * chrome component would drag the whole footer module along with it.
 */
export const socialIconMap: Record<string, SocialIconComponent> = {
    Github: SiGithub,
    Linkedin: LinkedinIcon,
    Mail,
    Briefcase,
};

export interface SocialLinkProps {
    /** Lucide/simple-icons key from types/social.ts. */
    icon: string;
    /** Human label, used as the accessible name and as the text fallback. */
    label: string;
    size?: number;
}

/**
 * The icon for one social link, falling back to its label when the map has no
 * entry — so an unmapped icon string degrades to readable text rather than an
 * empty box.
 */
export function SocialIcon({ icon, label, size = 18 }: SocialLinkProps) {
    const Icon = socialIconMap[icon];

    if (!Icon) {
        return <span className="bp-meta">{label}</span>;
    }

    return <Icon size={size} color="currentColor" />;
}
