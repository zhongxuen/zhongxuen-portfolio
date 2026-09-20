import { Container } from "@/components/ui/Container";

/**
 * Skeleton for the /projects index — same plate-coloured, pulsing primitives
 * as app/projects/[slug]/loading.tsx, laid out to the shape this page
 * actually renders: SectionHeading, the search/filter/sort control block, then
 * the responsive card grid.
 *
 * The card blocks match the real cards' proportions (a 16:10 visual over a copy
 * block), so the swap from skeleton to content is a fill rather than a reflow.
 *
 * A plain div, not a <section>: this streams inside the initial HTML for every
 * page under /projects, and a landmark with no accessible name is a region a
 * screen-reader user can land in and learn nothing from. `role="status"` gives
 * the wait a name instead — the shapes below carry no text of their own, so the
 * label is the whole announcement.
 */
export default function Loading() {
    return (
        <Container
            role="status"
            aria-label="Loading projects"
            className="bp-section-y flex flex-col gap-10"
        >
            <div className="space-y-4">
                <div className="h-4 w-28 animate-pulse rounded-full bg-surface" />
                <div className="h-10 w-72 animate-pulse rounded-lg bg-surface" />
                <div className="h-5 w-full max-w-2xl animate-pulse rounded-lg bg-surface" />
                <div className="h-5 w-2/3 max-w-xl animate-pulse rounded-lg bg-surface" />
            </div>

            <div className="flex flex-col gap-6 border-t border-line pt-6">
                <div className="h-10 w-full max-w-sm animate-pulse rounded-xs bg-surface" />
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="h-7 w-24 animate-pulse rounded-xs bg-surface" />
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div
                        key={index}
                        className="flex flex-col overflow-hidden rounded-xl border border-line"
                    >
                        <div className="aspect-[16/10] w-full animate-pulse bg-surface" />
                        <div className="h-40 animate-pulse bg-surface/60" />
                    </div>
                ))}
            </div>
        </Container>
    );
}
