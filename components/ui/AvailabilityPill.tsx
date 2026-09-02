import { AUTHOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface AvailabilityPillProps {
    className?: string;
}

/**
 * "Currently open to work" signal for the navbar and footer (docs/uiux.md
 * §4.1). Renders nothing when `AUTHOR.availability.open` is false, so turning
 * it off is a one-line edit in lib/constants.ts rather than a markup change.
 *
 * A no-JS server component: the pulse is CSS.
 *
 * Note on the motion budget (§3.4 bans infinite loops except the ⌘K caret):
 * this is the deliberate second exception, called for explicitly by §4.1. It
 * is the only element on the page that has to read as *live* rather than
 * merely present. The reduced-motion backstop in globals.css stops it dead.
 */
export function AvailabilityPill({ className }: AvailabilityPillProps) {
    const { open, label } = AUTHOR.availability;

    if (!open) return null;

    return (
        <span
            className={cn(
                "bp-meta inline-flex items-center gap-2 rounded-xs border border-line bg-surface/70 px-2.5 py-1 text-ink-muted",
                className
            )}
        >
            <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {label}
        </span>
    );
}
