"use client";

import { useMagnetic } from "@/hooks/useMagnetic";
import { cn } from "@/lib/utils";

export interface MagneticProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Wraps one control in the magnetic hover from docs/uiux.md §3.3.
 *
 * A wrapper rather than a prop on Button because Button is a Server Component:
 * a client parent cannot hand it a ref, but it can hand it a parent. `children`
 * is passed through untouched, so the button inside stays server-rendered and
 * only this span crosses the boundary.
 *
 * Deliberately not applied to every button on the site. The effect says "this
 * is the thing to click", which is only true of a page's primary actions —
 * spreading it across every control would both flatten that signal and turn a
 * dozen server-rendered buttons into client islands for a 4px lean, against the
 * bundle budget in §5.4.
 *
 * `inline-flex` so the wrapper takes the button's own box; anything else would
 * add descender space under it inside the CTA row.
 */
export function Magnetic({ children, className }: MagneticProps) {
    const ref = useMagnetic<HTMLSpanElement>();

    return (
        <span ref={ref} className={cn("bp-magnetic inline-flex", className)}>
            {children}
        </span>
    );
}
