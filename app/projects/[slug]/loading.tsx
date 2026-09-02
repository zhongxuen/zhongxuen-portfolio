import { Container } from "@/components/ui/Container";

/**
 * Skeleton for a case study, shaped like the page it stands in for
 * (docs/uiux.md §4.6): the full-bleed header band, then the two-column body
 * with the spec sheet in the left rail.
 */
export default function Loading() {
    return (
        <>
            <div className="border-b border-line bg-surface/40">
                <Container className="flex flex-col gap-5 pt-10 pb-12 md:pt-14 md:pb-16">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-surface" />
                    <div className="h-6 w-28 animate-pulse rounded-xs bg-surface" />
                    <div className="h-12 w-3/4 animate-pulse rounded-lg bg-surface" />
                    <div className="h-5 w-full max-w-2xl animate-pulse rounded-lg bg-surface" />
                    <div className="h-5 w-2/3 max-w-xl animate-pulse rounded-lg bg-surface" />
                    <div className="flex gap-3">
                        <div className="h-10 w-40 animate-pulse rounded-sm bg-surface" />
                        <div className="h-10 w-40 animate-pulse rounded-sm bg-surface" />
                    </div>
                </Container>
            </div>

            <Container className="bp-section-y grid gap-10 lg:grid-cols-[19rem_1fr] lg:items-start">
                <div className="h-64 animate-pulse rounded-xl bg-surface" />

                <div className="flex flex-col gap-8">
                    <div className="h-7 w-full max-w-md animate-pulse rounded-xs bg-surface" />
                    <div className="h-56 animate-pulse rounded-xl bg-surface" />
                    <div className="h-56 animate-pulse rounded-xl bg-surface" />
                </div>
            </Container>
        </>
    );
}
