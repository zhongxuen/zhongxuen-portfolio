"use client";

import { useEffect, useState } from "react";

export interface NavUnderlineProps {
    /**
     * `data-nav-id` of the link the marker should sit under, or null when no
     * section is active (any page other than the homepage, or the very top of
     * it before the first section scrolls in).
     */
    activeId: string | null;
    /**
     * The <nav> holding the links. Measured rather than queried globally so
     * the desktop and mobile navs cannot collide over the same ids.
     */
    navRef: React.RefObject<HTMLElement | null>;
}

/** Geometry of the marker, in pixels relative to the nav's padding box. */
interface Placement {
    left: number;
    width: number;
    /**
     * Whether this placement should be transitioned into. False for the first
     * one after the marker appears -- there is no meaningful "from" position,
     * so animating would glide it in from the nav's left edge instead of
     * simply putting it under the active item.
     */
    animate: boolean;
}

/**
 * The sliding underline beneath the active nav item.
 *
 * This replaces a Framer Motion `layoutId`, which produced the slide by
 * cross-fading two separately-mounted markers and FLIP-animating between their
 * measured boxes. Here there is only ever one marker: it is a sibling of the
 * links rather than a child of any of them, and it slides because `left` and
 * `width` are transitioned.
 *
 * Measuring in an effect means the marker has no position on first paint, so
 * it starts hidden and fades in once it knows where to go — otherwise it would
 * flash at the nav's left edge before snapping into place.
 */
export function NavUnderline({ activeId, navRef }: NavUnderlineProps) {
    const [placement, setPlacement] = useState<Placement | null>(null);

    useEffect(() => {
        const nav = navRef.current;

        if (!nav || !activeId) {
            setPlacement(null);
            return;
        }

        function measure(): void {
            const link = nav!.querySelector<HTMLElement>(
                `[data-nav-id="${CSS.escape(activeId!)}"]`,
            );

            if (!link) {
                setPlacement(null);
                return;
            }

            /*
             * Functional update so `animate` can be decided from whether a
             * placement already existed, without reading that fact back during
             * render.
             */
            setPlacement((previous) => ({
                left: link.offsetLeft,
                width: link.offsetWidth,
                animate: previous !== null,
            }));
        }

        measure();

        /*
         * The links are text, so their widths move with the font. Measuring
         * once on mount would leave the marker mis-sized until the next
         * activeId change if the webfont swapped in after this ran.
         */
        const observer = new ResizeObserver(measure);
        observer.observe(nav);

        return () => observer.disconnect();
    }, [activeId, navRef]);

    if (!placement) return null;

    return (
        <span
            aria-hidden="true"
            style={{
                left: placement.left,
                width: placement.width,
                transitionDuration: placement.animate ? undefined : "0ms",
            }}
            className="pointer-events-none absolute -bottom-0.5 h-px bg-accent transition-[left,width] duration-base ease-bp"
        />
    );
}
