import { ExternalLink } from "lucide-react";
import { certifications } from "@/data/certifications";
import { formatMonthYear } from "@/lib/utils";

/**
 * Certifications, as a strip below the education timeline (docs/uiux.md §4.7).
 *
 * Renders nothing when data/certifications.ts is empty — which it currently is.
 * A heading over an empty plate, or worse a set of "coming soon" placeholders,
 * would be a claim about credentials that do not exist; absence is the honest
 * rendering of an empty list.
 */
export function CertificationsStrip() {
    if (certifications.length === 0) {
        return null;
    }

    return (
        <section aria-labelledby="certifications-heading" className="flex flex-col gap-4">
            <h3 id="certifications-heading" className="bp-meta flex items-center gap-3 text-ink">
                Certifications
                <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent"
                />
            </h3>

            <ul className="grid gap-3 sm:grid-cols-2">
                {certifications.map((certification) => (
                    <li
                        key={certification.id}
                        className="bp-ticks flex flex-col gap-1 rounded-lg border border-line bg-surface p-4"
                    >
                        <p className="bp-meta text-ink-muted">
                            {formatMonthYear(certification.date)}
                        </p>
                        <p className="text-sm font-medium text-ink">
                            {certification.credentialUrl ? (
                                <a
                                    href={certification.credentialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bp-focus inline-flex items-center gap-1.5 hover:text-accent"
                                >
                                    {certification.name}
                                    <ExternalLink size={13} aria-hidden="true" />
                                </a>
                            ) : (
                                certification.name
                            )}
                        </p>
                        <p className="text-sm text-ink-muted">{certification.issuer}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
