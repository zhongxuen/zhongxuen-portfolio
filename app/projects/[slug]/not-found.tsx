import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
    return (
        <Container as="section" className="flex min-h-[60vh] items-center justify-center py-16 md:py-24">
            <div className="max-w-xl space-y-6 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
                    Project unavailable
                </p>
                <h1 className="font-heading text-4xl font-semibold text-foreground sm:text-5xl">
                    The project you are looking for could not be found.
                </h1>
                <p className="text-lg text-muted">
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
