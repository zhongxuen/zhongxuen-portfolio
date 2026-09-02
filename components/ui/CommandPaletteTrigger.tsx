"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import type { PaletteProject } from "@/lib/commandPalette";
import type { ResumeMeta } from "@/lib/resume";
import { cn } from "@/lib/utils";

/*
 * The palette itself — matcher, icons, portal, focus trap — is a separate
 * chunk, fetched the first time it is asked for. `ssr: false` because it
 * portals into document.body and has no server-rendered form worth producing.
 *
 * Everything in *this* file is the always-present half: a button and one
 * keydown listener. That split is the whole point of the arrangement
 * (docs/uiux.md §5.4) — the palette costs nothing until someone reaches for it.
 */
const CommandPalette = dynamic(
    () => import("@/components/ui/CommandPalette").then((module) => module.CommandPalette),
    { ssr: false },
);

/**
 * Which modifier the hint should name.
 *
 * A client-only fact — the server has no idea what the visitor is typing on,
 * and guessing wrong tells a Windows visitor to press a key their keyboard
 * does not have. Read through useSyncExternalStore rather than an effect so
 * React knows the server and client snapshots differ by design: it renders
 * `Ctrl`, hydrates cleanly, and corrects to `⌘` in the same commit. The
 * subscribe callback is a no-op because the value cannot change for the life
 * of the document.
 */
const subscribeToNothing = () => () => {};

const readModifier = () => (/mac|iphone|ipad|ipod/i.test(navigator.userAgent) ? "⌘" : "Ctrl");

const serverModifier = () => "Ctrl";

export interface CommandPaletteTriggerProps {
    projects: PaletteProject[];
    resume: ResumeMeta;
    className?: string;
}

/**
 * Navbar affordance for the ⌘K palette (docs/uiux.md §4.1, §5.1).
 *
 * Compact on small screens — the icon alone, since there is no keyboard to
 * hint at — and a full search-field lockup with a blinking caret from `lg`.
 * That caret is the one infinite animation the motion budget allows (§3.4) and
 * it stops under `prefers-reduced-motion`; see `.bp-caret` in app/globals.css.
 */
export function CommandPaletteTrigger({ projects, resume, className }: CommandPaletteTriggerProps) {
    const [open, setOpen] = useState(false);
    const modifier = useSyncExternalStore(subscribeToNothing, readModifier, serverModifier);
    /*
     * Latched, never cleared: once the chunk is fetched there is nothing to
     * gain by unmounting it, and keeping it mounted is what lets the panel
     * play its exit transition on close.
     */
    const [loaded, setLoaded] = useState(false);

    const openPalette = useCallback(() => {
        setLoaded(true);
        setOpen(true);
    }, []);

    const closePalette = useCallback(() => setOpen(false), []);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
            // `event.key` is layout-aware, so this follows a remapped keyboard
            // rather than a physical key position.
            if (event.key.toLowerCase() !== "k") return;

            // Firefox focuses its search bar on Ctrl+K; Chrome opens the
            // omnibox in search mode. Both have to be taken over here.
            event.preventDefault();
            setLoaded(true);
            setOpen((previous) => !previous);
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={openPalette}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label="Search commands, sections and projects"
                className={cn(
                    "bp-focus group inline-flex h-9 items-center gap-2 rounded-sm border border-transparent px-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink lg:w-52 lg:border-line lg:bg-surface/60 lg:pr-2 lg:pl-2.5 lg:hover:border-line-strong",
                    className,
                )}
            >
                <Search size={18} aria-hidden="true" className="shrink-0" />

                <span aria-hidden="true" className="hidden flex-1 text-left text-sm lg:block">
                    Search
                    <span className="bp-caret ml-0.5 text-ink-faint">▏</span>
                </span>

                <kbd
                    aria-hidden="true"
                    className="bp-meta hidden shrink-0 border border-line px-1.5 py-0.5 text-ink-muted group-hover:border-line-strong lg:block"
                >
                    {/* bp-meta uppercases and letterspaces, which ran "CtrlK"
                        together into one unreadable token. The glyph modifier
                        needs no separator; the word one does. */}
                    {modifier === "⌘" ? "⌘K" : `${modifier} K`}
                </kbd>
            </button>

            {loaded && (
                <CommandPalette
                    open={open}
                    onClose={closePalette}
                    projects={projects}
                    resume={resume}
                />
            )}
        </>
    );
}
