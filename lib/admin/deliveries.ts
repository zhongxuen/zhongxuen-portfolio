import "server-only";

/**
 * A short, in-memory record of what the contact form has been doing
 * (docs/admin-plan.md §17.7).
 *
 * **The failure this exists for.** `sendViaResend` in app/actions/contact.ts
 * throws on a non-2xx, the action catches it, and the visitor is shown the
 * mailto fallback — which is the right behaviour for them and tells the site's
 * owner nothing at all. A revoked API key, an unverified sender, a domain that
 * lapsed: each one turns every enquiry into a silent fallback, and the symptom
 * is a quiet month. You do not notice a form that has been broken for three
 * weeks, because a broken contact form looks exactly like nobody writing to you.
 *
 * **What this is honestly not.** It is not an inbox and it is not durable. The
 * ring lives in one server instance's memory, so it is lost on cold start and
 * not shared between instances or regions — exactly the caveat lib/rateLimit.ts
 * already states about its own counters, and for the same reason: there is no
 * store in this project (§2) and adding one for a diagnostic would be a larger
 * decision than the diagnostic deserves. Two consequences follow, and the
 * dashboard says both out loud:
 *
 *  - An empty panel means "nothing since this instance started", never "nothing
 *    ever". It must not be read as an absence of enquiries.
 *  - A failure that appears here is real. False negatives, never false
 *    positives, which is the right way round for a warning light.
 *
 * **No message content.** The subject line, the body and the sender's address
 * are not recorded. A visitor wrote to a contact form, not to a diagnostic
 * buffer, and "did it send" is answerable without keeping a word of what they
 * said. What is kept is an outcome, a timestamp, and — on a failure — the
 * status code that explains it.
 */

export type DeliveryOutcome = "sent" | "failed" | "fallback";

export interface DeliveryRecord {
    outcome: DeliveryOutcome;
    /** Epoch ms. */
    at: number;
    /** HTTP status from the mail provider, on a failure. */
    status?: number;
    /** A short reason, written in this repository — never a provider response body. */
    reason?: string;
}

/**
 * Twenty entries. Enough to see a pattern — "the last six all failed" — and
 * small enough that the memory cost is irrelevant even on a warm instance that
 * has been up for days.
 */
const CAPACITY = 20;

const ring: DeliveryRecord[] = [];

export function recordDelivery(record: Omit<DeliveryRecord, "at">): void {
    ring.unshift({ ...record, at: Date.now() });

    if (ring.length > CAPACITY) {
        ring.length = CAPACITY;
    }
}

/** Newest first. A copy, so a caller cannot mutate the ring by sorting it. */
export function recentDeliveries(): DeliveryRecord[] {
    return [...ring];
}

export interface DeliveryHealth {
    total: number;
    failures: number;
    /** True when every record held is a failure and there is at least one. The warning condition. */
    allFailing: boolean;
    /** Epoch ms of the most recent successful send, if any is still in the ring. */
    lastSuccessAt?: number;
}

/**
 * Summarises the ring for the dashboard.
 *
 * `allFailing` rather than a ratio or a threshold. With at most twenty records
 * and a form that might see one enquiry a week, any percentage would be noise —
 * whereas "every delivery I can remember failed" is unambiguous, cannot be
 * triggered by a single transient 500 among successes, and is exactly the state
 * worth interrupting someone about.
 */
export function deliveryHealth(): DeliveryHealth {
    const failures = ring.filter((record) => record.outcome === "failed").length;
    const lastSuccess = ring.find((record) => record.outcome === "sent");

    return {
        total: ring.length,
        failures,
        allFailing: ring.length > 0 && failures === ring.length,
        lastSuccessAt: lastSuccess?.at,
    };
}
