import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /** Adds the hover lift, tick extension, edge sweep and cursor spotlight — use for clickable/linked cards (ProjectCard) */
    interactive?: boolean;
    /**
     * Adds a few degrees of lean towards the cursor. Only for plates large
     * enough to carry it — on a small tile the same rotation is legible as
     * skew on the type rather than as depth. Implies `interactive`.
     */
    tilt?: boolean;
    /** Drops the registration ticks. For plates that sit flush inside another plate. */
    plain?: boolean;
}

/**
 * Base surface primitive for ProjectCard and the standalone plates on the
 * project detail page. Deliberately unopinionated about internal layout — each
 * card component composes its own content inside this shell.
 *
 * Blueprint treatment (docs/uiux.md §2.4.2): corner registration ticks via
 * `bp-ticks`, which extend to 14px and take the accent on hover.
 *
 * Deliberate deviation from §3.3, which specifies a spring for the card hover:
 * this stays a CSS transition on the shared `--ease-bp` curve. Making Card a
 * motion component would force "use client" on every card — including the
 * currently server-rendered Experience/Education/Skill cards — for a 6px
 * translate whose spring character is imperceptible at that distance. The
 * bundle budget in §5.4 wins.
 *
 * An interactive card also carries the two cursor-tracked effects: a spotlight
 * that follows the pointer across the plate, and (opt-in via `tilt`) a few
 * degrees of lean towards it. Both are driven by the single global listener in
 * components/motion/PointerFX.tsx, so all this component contributes is a
 * `data-fx` attribute and one empty span — the card itself stays on the server.
 *
 * `isolate` is load-bearing, not tidiness: the spotlight sits at `z-index: -1`
 * so it paints above the plate's background but under its content, and a
 * negative index only resolves that way inside a stacking context. Without it
 * the spotlight would fall behind the card and never be seen.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ interactive = false, tilt = false, plain = false, className, children, ...props }, ref) => {
        const live = interactive || tilt;

        return (
            <div
                ref={ref}
                data-fx={live ? (tilt ? "spotlight tilt" : "spotlight") : undefined}
                className={cn(
                    "relative rounded-xl border border-line bg-surface p-6",
                    !plain && "bp-ticks",
                    live && [
                        !plain && "bp-ticks-live",
                        "group/card isolate transition-[translate,border-color,box-shadow] duration-base ease-bp",
                        "hover:-translate-y-1.5 hover:border-line-strong hover:shadow-lift",
                        "focus-within:-translate-y-1.5 focus-within:border-line-strong",
                        tilt && "bp-tilt",
                    ],
                    className,
                )}
                {...props}
            >
                {live && (
                    <>
                        {/* Hairline that sweeps left→right across the top edge on hover. */}
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-linear-to-r from-transparent via-accent to-transparent transition-transform duration-base ease-bp group-hover/card:scale-x-100 group-focus-within/card:scale-x-100"
                        />
                        {/*
                         * Cursor spotlight. Empty by design — everything about
                         * it, including where on the plate it is centred, comes
                         * from the custom properties PointerFX writes on the
                         * card above.
                         */}
                        <span aria-hidden="true" className="bp-spotlight" />
                    </>
                )}
                {children}
            </div>
        );
    },
);

Card.displayName = "Card";

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn("font-display text-h3 font-medium text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("text-sm leading-relaxed text-ink-muted", className)} {...props} />;
}
