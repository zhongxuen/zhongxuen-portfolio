"use client";

import { Check, Copy, X } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
    /** The exact string placed on the clipboard. */
    value: string;
    /**
     * What is being copied, e.g. "admin username". Used to build the button's
     * accessible name, so it must read naturally after "Copy ".
     */
    label: string;
    className?: string;
}

/**
 * Copy-to-clipboard control (docs/uiux.md §4.6, §4.8).
 *
 * The smallest possible client island: the plate it sits in, the value it
 * copies and every label around it are server-rendered, and only this button
 * crosses the boundary.
 *
 * The confirmation is both visual (a mono COPIED, per §2.4) and announced —
 * the status region is always in the DOM with `aria-live="polite"`, since a
 * live region inserted at the same moment as its text is frequently missed by
 * screen readers. A failure says so rather than lying, and the value itself is
 * always rendered as selectable text next to the button as the manual path.
 */
export function CopyButton({ value, label, className }: CopyButtonProps) {
    const { status, copy } = useCopyToClipboard();

    return (
        <>
            <button
                type="button"
                onClick={() => void copy(value)}
                aria-label={`Copy ${label}`}
                className={cn(
                    "bp-focus inline-flex h-7 shrink-0 items-center gap-1.5 rounded-xs border border-line bg-surface-alt px-2 font-mono text-xs text-ink-muted transition-[color,border-color] duration-fast ease-bp hover:border-accent hover:text-accent",
                    status === "copied" && "border-success/45 text-success",
                    status === "error" && "border-danger/45 text-danger",
                    className,
                )}
            >
                {status === "copied" ? (
                    <Check size={13} aria-hidden="true" />
                ) : status === "error" ? (
                    <X size={13} aria-hidden="true" />
                ) : (
                    <Copy size={13} aria-hidden="true" />
                )}
                <span aria-hidden="true" className="tracking-widest uppercase">
                    {status === "copied" ? "Copied" : status === "error" ? "Failed" : "Copy"}
                </span>
            </button>

            <span aria-live="polite" className="sr-only">
                {status === "copied"
                    ? `Copied ${label}.`
                    : status === "error"
                      ? `Could not copy ${label}. Select the text and copy it manually.`
                      : ""}
            </span>
        </>
    );
}
