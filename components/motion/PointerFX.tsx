"use client";

import { useEffect } from "react";

/**
 * Attribute that opts an element into pointer effects. Space-separated values,
 * matched with `~=` in the query below, so a plate can ask for both:
 *
 *   <div data-fx="spotlight tilt">
 */
const SELECTOR = '[data-fx~="spotlight"],[data-fx~="tilt"]';

/** Peak tilt in degrees, at the very corner of the element. */
const MAX_TILT = 4.5;

const COARSE = "(pointer: coarse)";
const REDUCED = "(prefers-reduced-motion: reduce)";

/** The element currently under the pointer, or null between plates. */
let active: HTMLElement | null = null;
let frame = 0;
let pointerX = 0;
let pointerY = 0;

function clear(): void {
    if (!active) return;

    active.removeAttribute("data-fx-active");
    active.style.removeProperty("--fx-rx");
    active.style.removeProperty("--fx-ry");
    active = null;
}

function apply(): void {
    frame = 0;

    const element = active;
    if (!element) return;

    /*
     * One forced layout read per frame, and only for the single element under
     * the pointer — not for every plate on the page. The properties written
     * back are custom properties consumed by a transform and a gradient
     * position, neither of which invalidates layout, so the read never
     * thrashes against its own write.
     */
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = (pointerX - rect.left) / rect.width;
    const y = (pointerY - rect.top) / rect.height;

    element.style.setProperty("--fx-x", `${(x * 100).toFixed(2)}%`);
    element.style.setProperty("--fx-y", `${(y * 100).toFixed(2)}%`);

    /*
     * Tilt is expressed from the centre of the plate: pointer right of centre
     * rotates the near edge away around Y, pointer above centre lifts the far
     * edge around X. The X sign is inverted because SVG/CSS Y grows downward
     * while a positive rotateX tips the top of the element towards the viewer
     * — without the flip the card leans away from the cursor, which reads as
     * the plate flinching rather than presenting itself.
     */
    element.style.setProperty("--fx-ry", `${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
    element.style.setProperty("--fx-rx", `${((0.5 - y) * 2 * MAX_TILT).toFixed(2)}deg`);
}

function onPointerMove(event: PointerEvent): void {
    pointerX = event.clientX;
    pointerY = event.clientY;

    const target = event.target;
    const next =
        target instanceof Element ? (target.closest(SELECTOR) as HTMLElement | null) : null;

    if (next !== active) {
        clear();
        active = next;
        active?.setAttribute("data-fx-active", "true");
    }

    if (active && frame === 0) {
        frame = requestAnimationFrame(apply);
    }
}

/**
 * The single pointer listener behind every cursor-tracked effect on the site —
 * the card spotlight and the card tilt (see the POINTER INTERACTION block in
 * app/globals.css for what reads the properties it writes).
 *
 * Mounted once in app/layout.tsx and renders nothing. The reason it is one
 * global listener rather than a hook per card is the same reason
 * hooks/useMagnetic.ts is: the plates that want these effects are Server
 * Components rendered inside server-rendered sections, and giving each one a
 * ref would drag every card, every section around it, and the data they read
 * into the client bundle. Here they gain a `data-fx` attribute and stay on the
 * server; this file is the entire client cost, for the whole page.
 *
 * Work per frame is bounded to one element — the one `closest()` resolved from
 * the event target — so the cost does not grow with the number of plates on
 * the page.
 *
 * Two live opt-outs, re-evaluated rather than read once at mount, because a
 * laptop gaining a mouse and a visitor enabling reduced motion mid-session are
 * both ordinary:
 *
 *   - `prefers-reduced-motion: reduce` — these are decoration, so they are off.
 *   - `pointer: coarse` — there is no hovering pointer to track on a touch
 *     screen, and the effects would only ever fire in the instant before a tap.
 */
export function PointerFX() {
    useEffect(() => {
        const coarse = window.matchMedia(COARSE);
        const reduced = window.matchMedia(REDUCED);

        let listening = false;

        function sync(): void {
            const enabled = !coarse.matches && !reduced.matches;
            if (enabled === listening) return;

            listening = enabled;

            if (enabled) {
                window.addEventListener("pointermove", onPointerMove, { passive: true });
                return;
            }

            window.removeEventListener("pointermove", onPointerMove);
            cancelAnimationFrame(frame);
            frame = 0;
            clear();
        }

        sync();

        coarse.addEventListener("change", sync);
        reduced.addEventListener("change", sync);

        return () => {
            coarse.removeEventListener("change", sync);
            reduced.removeEventListener("change", sync);

            window.removeEventListener("pointermove", onPointerMove);
            cancelAnimationFrame(frame);
            frame = 0;
            clear();
        };
    }, []);

    return null;
}
