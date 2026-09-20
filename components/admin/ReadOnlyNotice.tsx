import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

/**
 * Shown on any page whose data came from the build rather than the repository.
 *
 * That happens on exactly one condition — `GITHUB_ADMIN_TOKEN` is unset — and the
 * distinction matters enough to say out loud: without the token the console can
 * neither read the live file nor write, so what is on screen is the deployed
 * snapshot and every control that would commit is disabled. Letting a save get
 * as far as the GitHub call and fail there would be the same information,
 * delivered after the work.
 */
export function ReadOnlyNotice() {
    return (
        <Card className="border-signal/40 bg-signal/8">
            <div className="flex items-start gap-3">
                <TriangleAlert
                    size={18}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-signal"
                />
                <div className="text-sm leading-relaxed text-ink">
                    <p className="font-medium">Read-only — no write token.</p>
                    <p className="mt-1 text-ink-muted">
                        <code className="font-mono text-xs">GITHUB_ADMIN_TOKEN</code> is not set on
                        this deployment, so this page is showing the data this build was compiled
                        with and nothing can be saved. Add a fine-grained PAT scoped to this
                        repository with Contents: Read and write.
                    </p>
                </div>
            </div>
        </Card>
    );
}
