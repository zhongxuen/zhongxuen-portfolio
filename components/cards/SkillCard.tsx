import Link from "next/link";
import {
    ArrowUpRight,
    Coffee,
    Bot,
    Workflow,
    Fingerprint,
    MemoryStick,
    HardDrive,
    Palette,
    FileText,
    Users,
    Layers,
    Drama,
    Code2,
    type LucideIcon,
} from "lucide-react";
import {
    SiPython,
    SiTypescript,
    SiJavascript,
    SiPhp,
    SiHtml5,
    SiCss,
    SiMysql,
    SiSupabase,
    SiFiles,
    SiGit,
    SiGithub,
    SiFigma,
    SiCisco,
    SiRust,
    SiNextdotjs,
    SiReact,
    SiExpo,
    SiTailwindcss,
    SiFastapi,
    SiTauri,
    SiZod,
    SiXyflow,
    SiPostgresql,
    SiSqlite,
    SiFirebase,
    SiClaude,
    SiGooglegemini,
    SiOllama,
    SiVitest,
} from "@icons-pack/react-simple-icons";
import { Skill } from "@/types/skill";
import { cn } from "@/lib/utils";

type IconComponent = LucideIcon | (({ size }: { size?: number }) => React.JSX.Element);

/**
 * Maps Skill.icon (a Simple Icons-style slug, per types/skill.ts) to a
 * renderable icon component.
 *
 * Most resolve to their real brand mark via @icons-pack/react-simple-icons.
 * A few fall back to a themed lucide icon because no brand icon exists in
 * that package for them:
 * - "java": Simple Icons has no official Java mark (Oracle trademark) —
 *   OpenJDK exists as a separate icon but doesn't represent the same brand.
 * - "css3", "canva": present under different slugs (SiCss, not SiCss3;
 *   Canva itself isn't cataloged — only "Canvas"/"PlayCanvas" are).
 * - "microsoftoffice", "microsoftteams": no Microsoft-family icons are in
 *   this package at all.
 * - "botpress", "joget", "autopsy", "volatility", "ftkimager": niche tools
 *   not cataloged in Simple Icons; mapped to a conceptually fitting lucide
 *   icon instead (verified against the installed package — see chat).
 * - "zustand", "playwright": not in this package either; Layers (a state
 *   store) and Drama (the playwright's masks) stand in.
 * - "reactnative": Simple Icons files React Native under the React mark, so
 *   it reuses SiReact. "xyflow" is React Flow's parent project.
 *
 * `Code2` is the catch-all fallback for any skill added later without a
 * matching entry here, so a missing mapping degrades gracefully instead
 * of crashing.
 */
export const skillIconMap: Record<string, IconComponent> = {
    python: SiPython,
    java: Coffee,
    typescript: SiTypescript,
    javascript: SiJavascript,
    php: SiPhp,
    html5: SiHtml5,
    css3: SiCss,
    mysql: SiMysql,
    supabase: SiSupabase,
    files: SiFiles,
    botpress: Bot,
    joget: Workflow,
    git: SiGit,
    github: SiGithub,
    figma: SiFigma,
    canva: Palette,
    microsoftoffice: FileText,
    microsoftteams: Users,
    cisco: SiCisco,
    autopsy: Fingerprint,
    volatility: MemoryStick,
    ftkimager: HardDrive,
    rust: SiRust,
    nextdotjs: SiNextdotjs,
    react: SiReact,
    reactnative: SiReact,
    expo: SiExpo,
    tailwindcss: SiTailwindcss,
    fastapi: SiFastapi,
    tauri: SiTauri,
    zustand: Layers,
    zod: SiZod,
    xyflow: SiXyflow,
    postgresql: SiPostgresql,
    sqlite: SiSqlite,
    firebase: SiFirebase,
    claude: SiClaude,
    googlegemini: SiGooglegemini,
    ollama: SiOllama,
    vitest: SiVitest,
    playwright: Drama,
};

export interface SkillCardProps {
    skill: Skill;
    /**
     * Where the tile leads — the /projects filter for this skill. Omitted for a
     * skill no listed project uses, which stays a plain, inert tile.
     */
    href?: string;
    /** How many projects `href` resolves to; spoken in the link's name. */
    projectCount?: number;
    className?: string;
}

const tileClass =
    "group/tile relative flex h-full flex-col items-center gap-2 overflow-hidden rounded-md border border-line bg-surface-alt px-2 py-4 text-center transition-[border-color,background-color,translate] duration-base ease-bp hover:-translate-y-1 hover:border-line-strong hover:bg-surface focus-within:-translate-y-1 focus-within:border-line-strong";

const plural = (count: number) => `${count} ${count === 1 ? "project" : "projects"}`;

/**
 * One skill tile inside a category panel (docs/uiux.md §4.4).
 *
 * Not built on `Card`: these sit *inside* a plate, and nesting a bordered,
 * ticked surface in another one produces a double frame. A flat cell with its
 * own hairline is the right register here.
 *
 * Featured skills take an amber corner tick rather than a border change, so the
 * grid keeps one border weight throughout. The tick is decorative, so the same
 * fact is also stated in text for anyone who cannot see it — colour is never
 * the only carrier.
 *
 * A tile with an `href` is a link into the /projects technology filter and
 * carries a small arrow in its top-left corner, opposite the featured tick, so
 * the difference is visible without hovering — there is no hover on a phone. A
 * tile without one still has no action, and so still takes no tab stop: giving
 * inert tiles `tabindex="0"` would add stops that do nothing. The annotation
 * reveals on `focus-within`, which a focused link tile matches itself.
 */
export function SkillCard({ skill, href, projectCount, className }: SkillCardProps) {
    const Icon = skillIconMap[skill.icon] ?? Code2;

    const content = (
        <>
            {skill.featured && (
                <>
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-signal"
                    />
                    <span className="sr-only">Core skill.</span>
                </>
            )}

            {href && (
                <ArrowUpRight
                    size={12}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1.5 left-1.5 text-ink-faint transition-colors duration-fast ease-bp group-hover/tile:text-accent group-focus-visible/tile:text-accent"
                />
            )}

            {/*
             * `bp-pop` scales the glyph and takes it to the accent while the
             * tile is hovered. Wrapped rather than applied to the icon itself
             * because the icon components spread className onto an <svg> whose
             * own `color` these tiles do not otherwise set — the span is the
             * one element guaranteed to be the tile's direct child, which is
             * what the rule's child combinator keys off.
             */}
            <span className="bp-pop">
                <Icon size={26} aria-hidden="true" />
            </span>

            <span className="text-sm font-medium text-ink">{skill.name}</span>

            {/*
             * Drafting annotation: the skill's machine name, the same treatment
             * the SLUG carries on a project card — or, on a linked tile, how
             * many projects the link leads to. Decorative and hidden (the
             * link's own name says the same), and it reserves no height, so
             * revealing it never reflows the grid.
             */}
            <span
                aria-hidden="true"
                className="bp-meta pointer-events-none absolute inset-x-0 bottom-1 text-[0.5625rem] text-ink-faint opacity-0 transition-opacity duration-fast ease-bp group-hover/tile:opacity-100 group-focus-within/tile:opacity-100"
            >
                {href && projectCount ? plural(projectCount) : skill.id}
            </span>
        </>
    );

    if (href) {
        const count = projectCount === undefined ? "" : `, ${plural(projectCount)}`;

        return (
            <Link
                href={href}
                aria-label={`${skill.name}${skill.featured ? " (core skill)" : ""}: view projects${count}`}
                className={cn(tileClass, "bp-focus", className)}
            >
                {content}
            </Link>
        );
    }

    return <div className={cn(tileClass, className)}>{content}</div>;
}
