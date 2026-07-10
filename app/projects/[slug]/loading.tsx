import { Container } from "@/components/ui/Container";

export default function Loading() {
    return (
        <Container as="section" className="space-y-6 py-16 md:py-24">
            <div className="h-8 w-40 animate-pulse rounded-full bg-card" />
            <div className="h-12 w-3/4 animate-pulse rounded-lg bg-card" />
            <div className="h-5 w-full max-w-2xl animate-pulse rounded-lg bg-card" />
            <div className="h-5 w-2/3 animate-pulse rounded-lg bg-card" />
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-72 animate-pulse rounded-xl bg-card" />
                <div className="h-72 animate-pulse rounded-xl bg-card" />
            </div>
        </Container>
    );
}
