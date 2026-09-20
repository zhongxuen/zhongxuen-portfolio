import { verifySession } from "@/lib/admin/dal";
import { isGithubWriteConfigured } from "@/lib/admin/github";
import { checkAssets } from "@/lib/admin/health";
import { loadProjectsFile } from "@/lib/admin/projectStore";
import { recentDeliveries, deliveryHealth } from "@/lib/admin/deliveries";
import { AdminShell } from "@/components/admin/AdminShell";
import { AssetPanel, LinkCheckPanel } from "@/components/admin/HealthPanels";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";

/**
 * Health — the page for things that break without telling anyone
 * (docs/admin-plan.md §17.7–17.8).
 *
 * Three checks that have one property in common: **nothing else in the system
 * reports them.** A dead demo link still builds. A screenshot referenced but
 * absent still builds. A contact form whose API key was revoked still renders,
 * still validates, still thanks the visitor — and quietly sends nothing. Each
 * failure is invisible from the code, invisible in CI, and invisible on the live
 * site, which is exactly why they get a page rather than a test.
 *
 * The asset report runs on render (two cheap GitHub reads). The link check is a
 * button, because it makes outbound requests to other people's servers.
 */
export default async function HealthPage() {
    await verifySession();

    const canWrite = isGithubWriteConfigured();
    const { projects } = await loadProjectsFile();
    const assets = await checkAssets(projects, canWrite);
    const deliveries = recentDeliveries();
    const health = deliveryHealth();

    return (
        <AdminShell
            eyebrow="Health"
            title="What is quietly broken"
            description="Dead links, missing images, and a contact form that may not be sending. None of these fail a build."
        >
            <LinkCheckPanel />

            <AssetPanel report={assets} canWrite={canWrite} />

            <section className="flex flex-col gap-3">
                <div>
                    <h2 className="font-display text-h4 font-bold text-ink">Contact deliveries</h2>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">
                        What the contact form has actually done recently. A revoked API key turns
                        every enquiry into a silent mailto fallback, and the symptom is a quiet
                        month — you do not notice a form that has been broken for three weeks,
                        because that looks exactly like nobody writing to you.
                    </p>
                </div>

                <Card plain className="flex flex-col gap-4 p-4 sm:p-5">
                    {health.allFailing && (
                        <p className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-ink">
                            Every delivery on record failed. Check{" "}
                            <code className="font-mono text-xs">RESEND_API_KEY</code> and the
                            verified sender — enquiries are being lost right now.
                        </p>
                    )}

                    {deliveries.length === 0 ? (
                        <p className="text-sm text-ink-muted">
                            Nothing recorded on this server instance.{" "}
                            <strong className="font-medium text-ink">
                                This is not the same as no enquiries.
                            </strong>{" "}
                            The record lives in one instance&rsquo;s memory and is lost on a cold
                            start, so an empty list means &ldquo;nothing since this instance
                            started&rdquo;. A failure shown here is real; an absence proves nothing.
                        </p>
                    ) : (
                        <>
                            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-sm border border-line">
                                {deliveries.map((record) => (
                                    <li
                                        key={record.at}
                                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3.5 py-2.5 text-xs"
                                    >
                                        <span
                                            className={
                                                record.outcome === "sent"
                                                    ? "w-20 shrink-0 font-medium text-success"
                                                    : record.outcome === "failed"
                                                      ? "w-20 shrink-0 font-medium text-danger"
                                                      : "w-20 shrink-0 font-medium text-signal"
                                            }
                                        >
                                            {record.outcome === "sent"
                                                ? "Sent"
                                                : record.outcome === "failed"
                                                  ? "Failed"
                                                  : "Fallback"}
                                        </span>
                                        <span className="font-mono text-ink-muted">
                                            {formatDateTime(new Date(record.at).toISOString())}
                                        </span>
                                        {record.reason && (
                                            <span className="text-ink-muted">
                                                {record.reason}
                                                {record.status ? ` (${record.status})` : ""}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            <p className="text-xs leading-relaxed text-ink-muted">
                                {health.failures} of {health.total} failed. No message content is
                                kept — a visitor wrote to a contact form, not to a diagnostic
                                buffer, and &ldquo;did it send&rdquo; is answerable without keeping
                                a word of what they said.
                            </p>
                        </>
                    )}
                </Card>
            </section>
        </AdminShell>
    );
}
