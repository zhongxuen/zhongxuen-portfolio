"use client";

import { useEffect, useRef, useState } from "react";
import { cubicBezier, DUR, EASE } from "@/lib/animations";
import { usePrefersReducedMotion } from "@/lib/motion";

export interface CountUpProps {
    value: number;
    className?: string;
}

const ease = cubicBezier(EASE.out);
const DURATION_MS = DUR.slow * 1000;

/**
 * Counts an integer up from zero the first time it scrolls into view
 * (docs/uiux.md §3.3), then stays put.
 *
 * The server render emits the real figure, not a zero: these are stats, and a
 * crawler or a visitor with JS disabled must see the true count rather than
 * "0". The client only takes over the displayed value once it has something
 * better to show.
 *
 * This is one of the two effects on the site that CSS cannot express — you
 * cannot interpolate text content — so it keeps a hand-rolled rAF tween. It
 * runs on the shared EASE.out curve via `cubicBezier`, so it settles on the
 * same character as every CSS transition around it rather than drifting onto
 * some approximate easing of its own.
 */
export function CountUp({ value, className }: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();

    // null = nothing better to show than `value` itself. That covers the
    // server render, the pre-scroll state, and reduced motion — in all three
    // the correct output is the real figure, so none of them needs a setState.
    const [display, setDisplay] = useState<number | null>(null);

    useEffect(() => {
        if (prefersReducedMotion) return;

        const node = ref.current;
        if (!node || typeof IntersectionObserver === "undefined") return;

        let frame = 0;
        let start: number | null = null;

        function tick(now: number): void {
            start ??= now;

            const progress = Math.min((now - start) / DURATION_MS, 1);
            setDisplay(Math.round(ease(progress) * value));

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                frame = requestAnimationFrame(tick);
            },
            { rootMargin: "-40px" },
        );

        observer.observe(node);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [prefersReducedMotion, value]);

    return (
        <span ref={ref} className={className}>
            {display ?? value}
        </span>
    );
}
