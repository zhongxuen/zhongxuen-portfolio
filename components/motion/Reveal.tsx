"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Elements this component is allowed to render as. Deliberately a closed list
 * rather than a fully polymorphic `as` — every caller on the site is in here,
 * and the closed union keeps the prop types readable.
 */
type RevealTag = "div" | "section" | "span" | "ul" | "dl" | "svg";

/**
 * Named entrance treatments. Each maps to a `[data-reveal="..."]` rule in the
 * ENTRANCE CHOREOGRAPHY block of app/globals.css — add one there before adding
 * one here.
 */
export type RevealVariant = "up" | "fade" | "wipe" | "draw";

export interface RevealProps {
    children: ReactNode;
    className?: string;
    as?: RevealTag;
    /**
     * Animate the wrapper itself, rather than only its `data-reveal`
     * descendants. Use when the thing being revealed is a single unit and a
     * separate inner wrapper would be pure noise — note that an inner wrapper
     * is not always even an option, since `display: contents` elements
     * generate no box for opacity or translate to apply to.
     */
    variant?: RevealVariant;
    /**
     * Reveal immediately instead of on scroll. For content that is already on
     * screen when the page loads (the hero), where waiting on anything — an
     * intersection callback, or even hydration — only delays the paint.
     *
     * This path runs no JavaScript at all: the wrapper is marked visible in the
     * server output and the `@starting-style` block in app/globals.css supplies
     * the entry state the transition animates from.
     */
    immediate?: boolean;
    /**
     * How far into the viewport the root must come before it fires. Mirrors
     * the `-80px` margin the old `defaultViewport` used, so a section starts
     * animating slightly before its top edge clears the fold.
     */
    rootMargin?: string;
}

/**
 * The single client component behind every entrance animation on the site.
 *
 * It renders a wrapper, watches that wrapper with one IntersectionObserver,
 * and sets `data-visible="true"` on it the first time it comes into view. All
 * the actual animation lives in the `[data-reveal]` rules in app/globals.css;
 * this component contributes no styles of its own.
 *
 * The reason it takes `children` rather than animating per-element is bundle
 * cost. Everything passed in as `children` is rendered by the *parent*, so a
 * Server Component section can wrap server-rendered cards in a Reveal and stay
 * entirely on the server — only this ~30-line wrapper crosses into the client.
 * That is the whole trick that let six section components drop "use client".
 *
 * Staggering is likewise free: children set their own `--reveal-delay` (see
 * `revealDelay` in lib/reveal.ts) and the shared transition-delay does the
 * cascade, so there is no orchestration state to run per frame.
 *
 * `once` semantics are baked in — the observer disconnects on first hit, so
 * scrolling back up never replays anything.
 */
export function Reveal({
    children,
    className,
    as: Tag = "div" as RevealTag,
    variant,
    immediate = false,
    rootMargin = "-80px",
}: RevealProps) {
    const ref = useRef<HTMLElement>(null);
    /*
     * `immediate` starts true, which means the attribute is in the server HTML
     * and the content is painted rather than waiting for hydration to reveal
     * it. The animation's missing "before" state comes from `@starting-style`
     * instead of from a deferred setState — see the ENTRANCE CHOREOGRAPHY block
     * in app/globals.css.
     */
    const [visible, setVisible] = useState(immediate);

    useEffect(() => {
        if (immediate) return;

        const node = ref.current;
        if (!node) return;

        /*
         * Guard for browsers without IntersectionObserver: reveal outright
         * rather than leaving the content stuck at opacity 0. Deferred by one
         * frame for the same two reasons as the `immediate` path above — the
         * transition needs a "before" state, and a synchronous setState in an
         * effect body cascades a second render.
         */
        if (typeof IntersectionObserver === "undefined") {
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                setVisible(true);
                observer.disconnect();
            },
            { rootMargin },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [immediate, rootMargin]);

    const Component = Tag as ElementType;

    return (
        <Component
            ref={ref}
            className={className}
            data-reveal={variant}
            data-visible={visible ? "true" : undefined}
        >
            {children}
        </Component>
    );
}
