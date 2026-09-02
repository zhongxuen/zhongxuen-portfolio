/**
 * Minimal fixed-window rate limiter backed by a module-level Map.
 *
 * Honest about its scope: the counters live in the memory of a single server
 * instance. Vercel's Fluid Compute reuses a warm instance across requests, so
 * this does throttle a burst from one address, but the state is not shared
 * between instances or regions and it is lost on cold start. That is an
 * acceptable trade for a portfolio contact form, whose real spam defences are
 * the honeypot and Resend's own sending limits — treat this as a courtesy
 * brake, not a security control. If it ever needs to hold under a genuine
 * attack, move the counter to Upstash Redis or put Vercel's WAF rate limiting
 * in front of the route.
 */

interface RateWindow {
    count: number;
    /** Epoch ms at which this window expires. */
    resetAt: number;
}

const windows = new Map<string, RateWindow>();

/**
 * Upper bound on tracked keys. Expired entries are swept lazily when the map
 * reaches it; if everything is still live, the entry closest to expiry is
 * evicted. Without this a long-lived instance would grow one entry per
 * distinct IP forever.
 */
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitResult {
    /** False once the caller has exceeded `limit` within the window. */
    ok: boolean;
    /** Whole seconds until the window resets. Zero when `ok` and the window is fresh. */
    retryAfter: number;
}

/**
 * Records a hit against `key` and reports whether it is allowed.
 *
 * Counts every call, including rejected ones, so a client that keeps hammering
 * while limited does not shorten its own penalty — the window still expires on
 * schedule, it simply never drops below the limit until then.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const current = windows.get(key);

    if (!current || now >= current.resetAt) {
        if (windows.size >= MAX_TRACKED_KEYS) {
            evict(now);
        }

        windows.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfter: 0 };
    }

    current.count += 1;

    return {
        ok: current.count <= limit,
        retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
}

/** Drops expired windows; if none had expired, drops the soonest to expire. */
function evict(now: number): void {
    let soonestKey: string | null = null;
    let soonestResetAt = Infinity;
    let removed = 0;

    for (const [key, window] of windows) {
        if (now >= window.resetAt) {
            windows.delete(key);
            removed += 1;
            continue;
        }

        if (window.resetAt < soonestResetAt) {
            soonestResetAt = window.resetAt;
            soonestKey = key;
        }
    }

    if (removed === 0 && soonestKey !== null) {
        windows.delete(soonestKey);
    }
}
