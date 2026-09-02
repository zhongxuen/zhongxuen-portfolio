"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Maximize2 } from "lucide-react";
import { revealDelay, stagger } from "@/lib/reveal";

/**
 * `ssr: false` is only legal inside a Client Component — see
 * node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md. It is right
 * here: the viewer is unreachable until a thumbnail is clicked, so
 * server-rendering it would ship markup and a hydration pass for a dialog most
 * visitors never open.
 */
const Lightbox = dynamic(() => import("@/components/ui/Lightbox").then((mod) => mod.Lightbox), {
    ssr: false,
});

export interface ProjectGalleryProps {
    images: string[];
    /** Project title, used for the alt text and the dialog's label. */
    title: string;
}

/**
 * Screenshot strip with a lightbox (docs/uiux.md §4.6).
 *
 * Thumbnails are buttons, not links: they open a dialog rather than navigating,
 * and a link that goes nowhere is a lie to anyone driving by keyboard. Focus
 * returns to whichever thumbnail was pressed when the dialog closes — that is
 * handled inside hooks/useFocusTrap.ts, which snapshots the active element at
 * open time.
 */
export function ProjectGallery({ images, title }: ProjectGalleryProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    // Stable across renders so the effects inside Lightbox that depend on it do
    // not resubscribe on every state change.
    const close = useCallback(() => setOpenIndex(null), []);
    const navigate = useCallback((index: number) => setOpenIndex(index), []);

    return (
        <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {images.map((src, index) => (
                    /*
                     * The plate settle, cascading across the grid. `scale` over
                     * `up` because these are framed images: they resolve into
                     * register the way the rest of the site's plates do, rather
                     * than sliding. Offset by one step so the "Screens" heading
                     * above still leads the band.
                     *
                     * The reveal lives on the <li>, not the <button>, so the
                     * transform never fights the hover scale on the image
                     * inside it.
                     */
                    <li key={src} data-reveal="scale" style={revealDelay(stagger(index + 1))}>
                        <button
                            type="button"
                            onClick={() => setOpenIndex(index)}
                            aria-label={`Open screenshot ${index + 1} of ${images.length}`}
                            className="bp-focus bp-ticks bp-ticks-live group/shot relative block aspect-[16/10] w-full overflow-hidden rounded-lg border border-line bg-surface-alt"
                        >
                            <Image
                                src={src}
                                alt=""
                                fill
                                sizes="(min-width: 1024px) 22rem, (min-width: 640px) 30vw, 45vw"
                                className="object-cover object-top transition-transform duration-base ease-bp group-hover/shot:scale-[1.03]"
                            />
                            <span
                                aria-hidden="true"
                                className="bp-grid-overlay bg-void/30 transition-opacity duration-base ease-bp group-hover/shot:opacity-0"
                            />
                            <span
                                aria-hidden="true"
                                className="absolute right-2 bottom-2 inline-flex h-7 w-7 items-center justify-center rounded-xs border border-line-strong bg-surface/90 text-ink-muted"
                            >
                                <Maximize2 size={13} />
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            {openIndex !== null && (
                <Lightbox
                    images={images}
                    index={openIndex}
                    title={title}
                    onClose={close}
                    onNavigate={navigate}
                />
            )}
        </>
    );
}
