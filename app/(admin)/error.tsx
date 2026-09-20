"use client";

import { useEffect } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Error boundary for the admin console.
 *
 * The public site's boundary moved to app/(site)/error.tsx with the rest of its
 * chrome, which left this group covered only by app/global-error.tsx — the
 * bare-document fallback that replaces <html> entirely. This keeps an admin
 * throw (a GitHub API outage, a malformed stored hash) inside the app's own
 * palette, and keeps a way back to the dashboard on screen.
 *
 * Deliberately terse: unlike the public 404 and error pages this one has an
 * audience of one, who can read a digest and check the logs.
 */
export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Server-thrown errors arrive here message-stripped; `digest` is the
        // only handle that ties this screen to a line in the Vercel logs.
        console.error("[admin] route error", error);
    }, [error]);

    return (
        <div className="flex min-h-svh items-center justify-center bg-void px-6 py-16">
            <div className="max-w-lg space-y-5">
                <p className="bp-meta text-signal">Console error</p>

                <h1 className="font-display text-h3 font-bold text-balance text-ink">
                    Something in the console failed.
                </h1>

                <p className="text-sm leading-relaxed text-pretty text-ink-muted">
                    Nothing was committed — every write in this console is a single explicit action,
                    so a failure here leaves the repository exactly as it was. Retry, or check the
                    deployment logs.
                </p>

                {error.digest && (
                    <p className="font-mono text-xs text-ink-muted">digest {error.digest}</p>
                )}

                <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="primary" onClick={reset}>
                        <RotateCcw size={16} aria-hidden="true" />
                        Try again
                    </Button>
                    <Button href="/admin" variant="secondary">
                        <ArrowLeft size={16} aria-hidden="true" />
                        Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}
