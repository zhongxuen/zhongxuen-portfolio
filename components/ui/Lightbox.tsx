"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface LightboxProps {
    /** Every image in the set, in display order. */
    images: string[];
    /** Index currently shown. */
    index: number;
    /** Base alt text; the position is appended. */
    title: string;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

/**
 * Full-screen screenshot viewer (docs/uiux.md §4.6).
 *
 * Loaded through `next/dynamic` from ProjectGallery, so none of this — nor the
 * two overlay hooks — reaches the bundle of a visitor who never opens it. That
 * is the whole reason it is a separate file.
 *
 * Behaviour is the standard modal contract, none of it optional:
 * `role="dialog"` + `aria-modal`, focus trapped inside while open and returned
 * to the thumbnail on close (both from hooks/useFocusTrap.ts), Escape to
 * dismiss, background scroll frozen (hooks/useBodyScrollLock.ts), and left/right
 * arrows to move through the set.
 */
export function Lightbox({ images, index, title, onClose, onNavigate }: LightboxProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Stable identities: both hooks take these as effect dependencies, and a
    // fresh closure every render would tear the listeners down and rebuild them
    // on each keystroke.
    const close = useCallback(() => onClose(), [onClose]);

    useBodyScrollLock(true);
    useFocusTrap(true, dialogRef, close);

    const count = images.length;

    useEffect(() => {
        if (count < 2) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "ArrowRight") {
                event.preventDefault();
                onNavigate((index + 1) % count);
            } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                onNavigate((index - 1 + count) % count);
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [count, index, onNavigate]);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} screenshots`}
            className="fixed inset-0 z-modal flex flex-col bg-void/95 p-4 backdrop-blur-sm sm:p-8"
        >
            <div className="flex shrink-0 items-center justify-between gap-4">
                <p className="bp-meta text-ink-muted">
                    {String(index + 1).padStart(2, "0")}{" "}
                    <span aria-hidden="true" className="text-ink-faint">
                        /
                    </span>
                    <span className="sr-only">of</span> {String(count).padStart(2, "0")}
                </p>

                <button
                    type="button"
                    onClick={close}
                    aria-label="Close screenshot viewer"
                    className="bp-focus inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line-strong bg-surface text-ink-muted transition-colors duration-fast ease-bp hover:border-accent hover:text-accent"
                >
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
                {/*
                 * `key` on the src forces a fresh element per slide, so the
                 * browser never paints the previous screenshot scaled into the
                 * next one's box while the new file decodes.
                 */}
                <Image
                    key={images[index]}
                    src={images[index]}
                    alt={`${title} screenshot ${index + 1} of ${count}`}
                    fill
                    sizes="100vw"
                    className="object-contain"
                />
            </div>

            {count > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate((index - 1 + count) % count)}
                        aria-label="Previous screenshot"
                        className="bp-focus inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line-strong bg-surface text-ink-muted transition-colors duration-fast ease-bp hover:border-accent hover:text-accent"
                    >
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate((index + 1) % count)}
                        aria-label="Next screenshot"
                        className="bp-focus inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line-strong bg-surface text-ink-muted transition-colors duration-fast ease-bp hover:border-accent hover:text-accent"
                    >
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </div>
            )}
        </div>
    );
}
