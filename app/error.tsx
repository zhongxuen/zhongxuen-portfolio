"use client";

import { useEffect } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

/**
 * Route-level error boundary. Wraps every page under the root layout, so an
 * uncaught throw — a GitHub fetch that escapes services/projectService, a bad
 * revalidation — degrades to this instead of the default Next.js screen.
 *
 * The root layout itself is *outside* this boundary; app/global-error.tsx
 * covers that case.
 *
 * Note: Next 16.2 also passes `unstable_retry()`, which re-fetches the
 * segment's data before re-rendering. `reset()` only clears the error state
 * and re-renders, so it recovers from transient render failures but not from
 * a cached upstream fetch failure — swap the handler if that becomes the
 * common case.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Server-thrown errors arrive here message-stripped; `digest` is the
        // only handle that matches them back to the server logs.
        console.error(error);
    }, [error]);

    return (
        <Container as="section" className="flex min-h-[60vh] items-center justify-center py-16 md:py-24">
            <div className="max-w-xl space-y-6 text-center">
                <p className="bp-meta text-accent">
                    Something went wrong
                </p>
                <h1 className="font-display text-h2 font-medium text-balance text-ink">
                    This section failed to load.
                </h1>
                <p className="text-body-lg text-pretty text-ink-muted">
                    The fault is usually temporary — often an upstream request that timed out.
                    Try again, or head back and keep browsing.
                </p>
                {error.digest && (
                    <p className="font-mono text-sm text-ink-muted">
                        Reference: {error.digest}
                    </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button type="button" variant="primary" onClick={() => reset()}>
                        <RotateCcw size={16} />
                        Try again
                    </Button>
                    <Button href="/" variant="secondary">
                        <ArrowLeft size={16} />
                        Back to home
                    </Button>
                </div>
            </div>
        </Container>
    );
}
