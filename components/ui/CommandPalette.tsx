"use client";

import { createElement, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ArrowUpRight,
    Check,
    Copy,
    CornerDownLeft,
    Download,
    FolderGit2,
    Hash,
    Monitor,
    Moon,
    Search,
    Sun,
    type LucideIcon,
} from "lucide-react";
import {
    buildCommandActions,
    filterCommands,
    flattenGroups,
    groupCommandMatches,
    toLabelSegments,
    type CommandAction,
    type CommandMatch,
    type CopyCommand,
    type PaletteProject,
} from "@/lib/commandPalette";
import type { ResumeMeta } from "@/lib/resume";
import type { ThemeMode } from "@/lib/theme";
import { useTheme } from "@/hooks/useTheme";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useCopyToClipboard, type CopyStatus } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
    open: boolean;
    /** Must be stable — it is a focus-trap effect dependency. */
    onClose: () => void;
    projects: PaletteProject[];
    resume: ResumeMeta;
}

const KIND_ICONS: Record<CommandAction["kind"], LucideIcon> = {
    section: Hash,
    project: FolderGit2,
    link: ArrowUpRight,
    download: Download,
    theme: Monitor,
    copy: Copy,
};

const THEME_ICONS: Record<ThemeMode, LucideIcon> = {
    system: Monitor,
    light: Sun,
    dark: Moon,
};

function iconFor(action: CommandAction): LucideIcon {
    return action.kind === "theme" ? THEME_ICONS[action.mode] : KIND_ICONS[action.kind];
}

/**
 * DOM id of the row at `index`. Module scope, and derived from the palette's
 * `useId` prefix, so the input's `aria-activedescendant`, the scroll-into-view
 * effect and the Enter handler all name the same element without any of them
 * having to carry a callback as a dependency.
 */
const optionId = (baseId: string, index: number) => `${baseId}-option-${index}`;

/** DOM id of the heading naming the group at `position`. */
const groupId = (baseId: string, position: number) => `${baseId}-group-${position}`;

/** The matched characters, lit in accent. Runs, not per-character spans. */
function CommandLabel({ text, indices }: { text: string; indices: number[] }) {
    if (indices.length === 0) {
        return <>{text}</>;
    }

    return (
        <>
            {toLabelSegments(text, indices).map((segment, position) => (
                <span key={position} className={segment.matched ? "text-accent" : undefined}>
                    {segment.text}
                </span>
            ))}
        </>
    );
}

/**
 * The ⌘K command palette (docs/uiux.md §5.1). Built in-house rather than on
 * `cmdk`: it is ~200 lines of standard combobox plumbing, and one fewer
 * dependency on a site whose whole argument is that the author can build this.
 *
 * Loaded through next/dynamic with `ssr: false` from CommandPaletteTrigger, so
 * none of this — nor lucide's icons, nor the matcher — is in the first-load
 * bundle. It is fetched the first time the palette is opened.
 *
 * Structure follows the ARIA combobox-with-listbox pattern rather than roving
 * focus: the text field keeps DOM focus for the whole interaction (so typing
 * to refine never requires a trip back to the input) and the active row is
 * pointed at with `aria-activedescendant`. Rows are still real `<a>`/`<button>`
 * elements — Enter dispatches a click on the active one — which is what keeps
 * next/link prefetching, middle-click and "open in new tab" working instead of
 * reimplementing navigation over a list of divs.
 *
 * Portaled to `document.body` because the trigger lives inside the `fixed`,
 * z-nav `<header>`, which is its own stacking context — `z-modal` on a
 * descendant of it could never actually reach the top of the page.
 *
 * Closed but mounted: after the first open the panel stays in the tree at
 * `display: none` (see `.bp-palette` in app/globals.css), which keeps it out of
 * the tab order and the accessibility tree while still allowing a real exit
 * transition. Same mechanism as the mobile nav panel.
 */
export function CommandPalette({ open, onClose, projects, resume }: CommandPaletteProps) {
    const pathname = usePathname();
    const { setMode } = useTheme();
    const { status: copyStatus, copy } = useCopyToClipboard();

    const panelRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const baseId = useId();
    const listId = `${baseId}-list`;

    const actions = useMemo(
        () => buildCommandActions({ projects, resume, isHome: pathname === "/" }),
        [projects, resume, pathname],
    );

    const groups = useMemo(
        () => groupCommandMatches(filterCommands(actions, query)),
        [actions, query],
    );
    const rows = useMemo(() => flattenGroups(groups), [groups]);

    // Clamped rather than corrected in an effect: a query that shortens the
    // list must not render one frame pointing past its end.
    const active = rows.length === 0 ? -1 : Math.min(activeIndex, rows.length - 1);

    /*
     * Reset on open, derived during render (React's "adjusting state when a
     * prop changes" pattern) rather than in an effect — an effect would show
     * the previous session's query and selection for a frame first.
     */
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        setQuery("");
        setActiveIndex(0);
    }

    useFocusTrap(open, panelRef, onClose);
    useBodyScrollLock(open);

    // Keep the active row in view when the arrows walk past either edge.
    useEffect(() => {
        if (!open || active < 0) return;

        document.getElementById(optionId(baseId, active))?.scrollIntoView({ block: "nearest" });
    }, [open, active, baseId]);

    const activate = useCallback(
        (action: CommandAction) => {
            if (action.kind === "theme") {
                setMode(action.mode);
                onClose();
                return;
            }

            if (action.kind === "copy") {
                /*
                 * The palette deliberately stays open on a copy. There is no
                 * toast surface on this site, so closing would leave the
                 * visitor with no evidence anything happened; instead the row
                 * itself reports back and the live region announces it. Escape
                 * dismisses, as always.
                 */
                void copy(action.value);
                return;
            }

            // Navigation kinds are anchors: their own default action is the
            // navigation, and this only gets the panel out of the way. The
            // scroll lock is released synchronously (useBodyScrollLock runs as
            // a layout effect), so a `#section` jump is not swallowed by a
            // still-locked body.
            onClose();
        },
        [copy, onClose, setMode],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (rows.length === 0) return;

            switch (event.key) {
                case "ArrowDown":
                    event.preventDefault();
                    setActiveIndex((active + 1) % rows.length);
                    break;
                case "ArrowUp":
                    event.preventDefault();
                    setActiveIndex((active - 1 + rows.length) % rows.length);
                    break;
                case "Home":
                    event.preventDefault();
                    setActiveIndex(0);
                    break;
                case "End":
                    event.preventDefault();
                    setActiveIndex(rows.length - 1);
                    break;
                case "Enter":
                    event.preventDefault();
                    // Dispatched on the real element so the anchor's own
                    // navigation — and next/link's interception of it — runs
                    // exactly as it would for a mouse.
                    document.getElementById(optionId(baseId, active))?.click();
                    break;
                default:
                    break;
            }
        },
        [active, rows.length, baseId],
    );

    const resultSummary = rows.length === 1 ? "1 command" : `${rows.length} commands`;

    /*
     * One live region, one message. The result count is what it normally
     * carries; a copy attempt takes it over while its outcome is fresh, since
     * two polite regions would race and interleave. The copy command is looked
     * up rather than tracked in state — there is exactly one, and its own
     * `confirmation` string is the announcement.
     */
    const copyCommand = useMemo(
        () => actions.find((action): action is CopyCommand => action.kind === "copy"),
        [actions],
    );

    const announcement =
        copyStatus === "copied"
            ? (copyCommand?.confirmation ?? "Copied to the clipboard.")
            : copyStatus === "error"
              ? `The browser blocked the copy. The value is ${copyCommand?.value ?? ""}.`
              : resultSummary;

    return createPortal(
        <div
            className="bp-palette z-modal"
            data-open={open ? "true" : "false"}
            /* A press on the backdrop, not on the panel, dismisses. mousedown
               rather than click so a drag that starts on the backdrop and ends
               inside the panel does not also count. */
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                className="bp-palette-panel bp-ticks border border-line-strong bg-surface shadow-lift"
            >
                <div className="flex items-center gap-3 border-b border-line px-4">
                    <Search size={16} aria-hidden="true" className="shrink-0 text-ink-muted" />

                    <input
                        type="text"
                        role="combobox"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-expanded={rows.length > 0}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={active >= 0 ? optionId(baseId, active) : undefined}
                        aria-label="Search commands, sections and projects"
                        placeholder="Search commands, sections and projects…"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
                    />

                    <kbd
                        aria-hidden="true"
                        className="bp-meta hidden shrink-0 border border-line px-1.5 py-0.5 text-ink-muted sm:block"
                    >
                        ESC
                    </kbd>
                </div>

                <div
                    id={listId}
                    role="listbox"
                    aria-label="Commands"
                    className="max-h-[min(24rem,55vh)] overflow-y-auto overscroll-contain p-2"
                >
                    {groups.map((group, position) => (
                        <div
                            key={group.name}
                            role="group"
                            /* Keyed by position, not by name: group names
                               contain spaces ("Jump to"), and a space in an id
                               makes aria-labelledby read as a list of two ids,
                               neither of which exists. */
                            aria-labelledby={groupId(baseId, position)}
                        >
                            <p
                                id={groupId(baseId, position)}
                                className="bp-meta px-3 pt-3 pb-1.5 text-ink-muted"
                            >
                                {group.name}
                            </p>

                            {group.rows.map(({ match, index }) => (
                                <CommandOption
                                    key={match.action.id}
                                    id={optionId(baseId, index)}
                                    match={match}
                                    selected={index === active}
                                    copyStatus={match.action.kind === "copy" ? copyStatus : "idle"}
                                    onPointerMove={() => setActiveIndex(index)}
                                    onActivate={activate}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {rows.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-ink-muted">
                        No command matches{" "}
                        <span className="font-mono text-ink">{query.trim()}</span>.
                    </p>
                )}

                <div
                    aria-hidden="true"
                    className="bp-meta flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 text-ink-muted"
                >
                    <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <CornerDownLeft size={12} aria-hidden="true" />
                            Open
                        </span>
                        <span className="hidden sm:inline">↑↓ Navigate</span>
                    </span>
                    <span>{resultSummary}</span>
                </div>

                <p aria-live="polite" className="sr-only">
                    {open ? announcement : ""}
                </p>
            </div>
        </div>,
        document.body,
    );
}

interface CommandOptionProps {
    id: string;
    match: CommandMatch;
    selected: boolean;
    /** Outcome of the last copy, for the one row that performs one. */
    copyStatus: CopyStatus;
    onPointerMove: () => void;
    onActivate: (action: CommandAction) => void;
}

/**
 * One row.
 *
 * `tabIndex={-1}` throughout: focus never leaves the text field, so these must
 * be reachable by script and by mouse but not by Tab, which would otherwise
 * walk 25 rows before reaching the close affordance.
 */
function CommandOption({
    id,
    match,
    selected,
    copyStatus,
    onPointerMove,
    onActivate,
}: CommandOptionProps) {
    const { action } = match;
    const copied = copyStatus === "copied";
    const blocked = copyStatus === "error";

    const className = cn(
        "bp-focus flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors",
        selected ? "bg-surface-alt text-ink" : "text-ink-muted hover:text-ink",
    );

    const body = (
        <>
            {/* createElement rather than binding the glyph to a capitalised
                local: the icon varies per row, and a component value produced
                during render is remounted — and its state reset — on every
                pass. Nothing here holds state, but the rule is worth keeping. */}
            {createElement(copied ? Check : iconFor(action), {
                size: 16,
                "aria-hidden": true,
                className: cn(
                    "shrink-0",
                    copied ? "text-success" : blocked ? "text-danger" : "text-ink-muted",
                ),
            })}

            <span className="min-w-0 flex-1 truncate">
                <CommandLabel text={action.label} indices={match.indices} />
            </span>

            {(copied || blocked || action.hint) && (
                <span
                    className={cn(
                        "bp-meta hidden shrink-0 sm:block",
                        copied ? "text-success" : blocked ? "text-danger" : "text-ink-muted",
                    )}
                >
                    {copied ? "Copied" : blocked ? "Blocked" : action.hint}
                </span>
            )}
        </>
    );

    const shared = {
        id,
        role: "option" as const,
        "aria-selected": selected,
        tabIndex: -1,
        className,
        onPointerMove,
        onClick: () => onActivate(action),
    };

    if (action.kind === "theme" || action.kind === "copy") {
        return (
            <button type="button" {...shared}>
                {body}
            </button>
        );
    }

    if (action.external) {
        return (
            <a {...shared} href={action.href} target="_blank" rel="noopener noreferrer">
                {body}
            </a>
        );
    }

    /*
     * A bare `#section` href stays a plain anchor so the browser performs the
     * fragment navigation itself — same reasoning as components/layout/NavLink
     * — while every real route goes through next/link.
     */
    if (action.href.startsWith("#")) {
        return (
            <a {...shared} href={action.href}>
                {body}
            </a>
        );
    }

    return (
        <Link {...shared} href={action.href}>
            {body}
        </Link>
    );
}
