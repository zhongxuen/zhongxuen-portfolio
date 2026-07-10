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
import { Card } from "@/components/ui/Card";
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
const iconMap: Record<string, IconComponent> = {
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
 * Small tile for a single skill: icon + name. Meant to sit in a grid
 * grouped by Skill.category within SkillsSection — categories instead
 * of proficiency bars, per master_prompt.md.
 */
export function SkillCard({ skill, className }: SkillCardProps) {
    const Icon = iconMap[skill.icon] ?? Code2;

    return (
        <Card
            className={cn(
                "flex flex-col items-center gap-2 py-5 text-center",
                skill.featured && "border-primary/30",
                className
            )}
        >
            <Icon size={28} />
            <span className="text-sm font-medium text-foreground">{skill.name}</span>
        </Card>
    );
}