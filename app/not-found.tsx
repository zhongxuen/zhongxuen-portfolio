import { ArrowLeft, FolderGit2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * Root 404. Catches every unmatched URL in the app — deliberately the same
 * shape as app/(site)/projects/[slug]/not-found.tsx so a missing page and a
 * missing project read as one family rather than two unrelated dead ends.
 *
 * It renders `SiteChrome` itself rather than inheriting it. This file has to
 * stay at the root of app/ to catch unmatched URLs at all, and the root layout
 * no longer carries the navbar or footer now that the public site lives in the
 * (site) route group — so without this wrapper a mistyped address would land
 * on a page with no way off it.
 */
export default function NotFound() {
    return (
        <SiteChrome>
            <Container
                as="section"
                className="flex min-h-[60vh] items-center justify-center py-16 md:py-24"
            >
                <div className="max-w-xl space-y-6 text-center">
                    <p className="bp-meta text-accent">Error 404</p>
                    <h1 className="font-display text-h2 font-medium text-balance text-ink">
                        This page does not exist.
                    </h1>
                    <p className="text-body-lg text-pretty text-ink-muted">
                        The address may be mistyped, or the page may have moved. Everything else is
                        still where you left it.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button href="/" variant="primary">
                            <ArrowLeft size={16} />
                            Back to home
                        </Button>
                        <Button href="/projects" variant="secondary">
                            <FolderGit2 size={16} />
                            Browse projects
                        </Button>
                    </div>
                </div>
            </Container>
        </SiteChrome>
    );
}
