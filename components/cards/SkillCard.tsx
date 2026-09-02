import {
    Coffee,
    Bot,
    Workflow,
    Fingerprint,
    MemoryStick,
    HardDrive,
    Palette,
    FileText,
    Users,
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
};

export interface SkillCardProps {
    skill: Skill;
    className?: string;
}

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
 * A deliberate deviation from §4.4, which asks for "a real focus state" on the
 * tile: a tile has no action, and giving twenty-two of them `tabindex="0"`
 * would add twenty-two tab stops that do nothing — the standard way to make a
 * keyboard user's life worse. The annotation reveals on `focus-within` instead,
 * so it still appears if a focusable element is ever nested here, and the
 * enclosing panel's ticks already respond to focus via `bp-ticks-live`.
 */
export function SkillCard({ skill, className }: SkillCardProps) {
    const Icon = skillIconMap[skill.icon] ?? Code2;

    return (
        <div
            className={cn(
                "group/tile relative flex flex-col items-center gap-2 overflow-hidden rounded-md border border-line bg-surface-alt px-2 py-4 text-center transition-[border-color,background-color] duration-fast ease-bp hover:border-line-strong hover:bg-surface focus-within:border-line-strong",
                className,
            )}
        >
            {skill.featured && (
                <>
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-signal"
                    />
                    <span className="sr-only">Core skill.</span>
                </>
            )}

            <Icon size={26} aria-hidden="true" />

            <span className="text-sm font-medium text-ink">{skill.name}</span>

            {/*
             * Drafting annotation: the skill's machine name, the same treatment
             * the SLUG carries on a project card. Decorative and hidden — it
             * restates the label above it — and it reserves no height, so
             * revealing it never reflows the grid.
             */}
            <span
                aria-hidden="true"
                className="bp-meta pointer-events-none absolute inset-x-0 bottom-1 text-[0.5625rem] text-ink-faint opacity-0 transition-opacity duration-fast ease-bp group-hover/tile:opacity-100 group-focus-within/tile:opacity-100"
            >
                {skill.id}
            </span>
        </div>
    );
}
