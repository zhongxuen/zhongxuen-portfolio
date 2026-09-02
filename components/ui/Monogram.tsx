import { cn } from "@/lib/utils";

export interface MonogramProps {
    className?: string;
    size?: number;
}

/**
 * Site mark, replacing the "GZX" text logo (docs/uiux.md §4.1).
 *
 * A stroked Z — the initial of "Zhong Xuen" — drawn as a drafting polyline,
 * with an accent node square where the diagonal crosses centre. Stroke colour
 * is inherited, so it takes the navbar's hover/focus colour for free; only the
 * node square is pinned to the accent token.
 *
 * Decorative: the accessible name comes from the wrapping link.
 */
export function Monogram({ className, size = 22 }: MonogramProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className={cn("shrink-0", className)}
        >
            <path
                d="M8 8h16L8 24h16"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="square"
                strokeLinejoin="miter"
            />
            <rect x="14" y="14" width="4" height="4" className="fill-accent" />
        </svg>
    );
}
