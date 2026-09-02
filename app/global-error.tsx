"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import "./globals.css";

/**
 * Last-resort boundary for errors thrown by the root layout itself, which
 * app/error.tsx cannot catch. It *replaces* the root layout when active, so
 * it has to bring its own <html>/<body> and its own global styles.
 *
 * The next/font loaders live in app/layout.tsx and are gone here, leaving
 * --font-inter etc. undefined — hence the explicit system stack rather than
 * the `font-sans`/`font-display` utilities used everywhere else. The colour
 * tokens still resolve, because they come from the imported globals.css.
 *
 * Metadata exports are not allowed in a Client Component, so the tab title is
 * set with React's <title>.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en" className="h-full antialiased">
            <body
                className="min-h-full bg-void text-ink"
                style={{
                    fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
                }}
            >
                <title>Something went wrong — Goh Zhong Xuen</title>

                <Container
                    as="section"
                    className="flex min-h-screen items-center justify-center py-16 md:py-24"
                >
                    <div className="max-w-xl space-y-6 text-center">
                        <p className="bp-meta text-accent">
                            Application error
                        </p>
                        <h1 className="text-h2 font-medium text-balance text-ink">
                            The site failed to start.
                        </h1>
                        <p className="text-body-lg text-pretty text-ink-muted">
                            Something broke before the page could render. Reloading usually
                            clears it.
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
            </body>
        </html>
    );
}
