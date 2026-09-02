import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
    return (
        <Container as="section" className="flex min-h-[60vh] items-center justify-center py-16 md:py-24">
            <div className="max-w-xl space-y-6 text-center">
                <p className="bp-meta text-accent">
                    Project unavailable
                </p>
                <h1 className="font-display text-h2 font-medium text-balance text-ink">
                    The project you are looking for could not be found.
                </h1>
                <p className="text-body-lg text-pretty text-ink-muted">
                    It may have been renamed or removed, but you can still browse the rest of the portfolio.
                </p>
                <Button href="/projects" variant="primary">
                    <ArrowLeft size={16} />
                    Return to projects
                </Button>
            </div>
        </Container>
    );
}
