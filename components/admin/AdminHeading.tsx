/**
 * Page heading for the admin console.
 *
 * A near-copy of `components/ui/SectionHeading.tsx` minus the numbered marker
 * and, crucially, minus `Reveal`. That component's whole point is the staged
 * scroll entrance the public site is built around (docs/uiux.md §3.3); an admin
 * page that fades its own title in before you can read it is a tool fighting
 * its user. Sharing the component and passing `immediate` would still pull the
 * client boundary and the reveal CSS into every admin route for no benefit.
 *
 * The rule and eyebrow are the same lockup, so the two surfaces still read as
 * one design system.
 */
export function AdminHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex items-center gap-3">
                <span className="bp-meta text-accent">{eyebrow}</span>
                <span
                    aria-hidden="true"
                    className="h-px w-16 bg-linear-to-r from-line-strong to-transparent"
                />
            </div>

            <h1 className="font-display text-h3 font-bold text-balance text-ink sm:text-[1.75rem]">
                {title}
            </h1>

            {description && (
                <p className="max-w-2xl text-sm leading-relaxed text-pretty text-ink-muted">
                    {description}
                </p>
            )}
        </div>
    );
}
