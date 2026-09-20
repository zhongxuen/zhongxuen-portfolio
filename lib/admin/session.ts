import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AdminSession } from "@/types/admin";

/**
 * Admin session tokens and password hashing (docs/admin-plan.md §4).
 *
 * Pure crypto and string handling: nothing here reads a cookie or touches
 * `next/headers`, because `proxy.ts` needs `verifySessionToken` and a proxy
 * reads cookies off the request rather than through the async `cookies()`
 * helper. Cookie I/O lives in lib/admin/dal.ts and the auth actions.
 *
 * No `server-only` marker, for the same reason: the proxy is a separate
 * compilation target. The module is safe by construction instead — it reads no
 * environment variable of its own. Every caller passes the secret in, so this
 * file cannot leak one by being imported somewhere careless, and it stays
 * unit-testable without a fake environment.
 *
 * **Why no `jose`.** The authentication guide
 * (node_modules/next/dist/docs/01-app/02-guides/authentication.md) reaches for
 * it because the Edge runtime has no `node:crypto`. In Next 16 Proxy runs on
 * the Node.js runtime and the `runtime` config option is not even available in
 * a proxy file (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md,
 * "Runtime"), so the one place that used to force an Edge-compatible library
 * can use `node:crypto` directly. Thirty lines of HMAC beat a dependency.
 */

/** Cookie name. Not `__Host-` prefixed: that forbids `Domain` and requires HTTPS, which local dev is not. */
export const SESSION_COOKIE = "admin_session";

/** Eight hours. Long enough for a working session, short enough that a stolen cookie ages out. */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** scrypt cost parameters, recorded in the hash string so they can be raised without invalidating old hashes. */
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 32 } as const;

const HASH_SCHEME = "scrypt";

function base64url(input: Buffer | string): string {
    return Buffer.from(input).toString("base64url");
}

function sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Compares two strings in constant time.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself leak the
 * length — so the length check happens first and deliberately returns the same
 * `false` a content mismatch does. Both operands here are fixed-width digests
 * or a caller-supplied value of unknown length, so the check is not optional.
 */
function safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");

    return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Mints `payload.signature`, where the payload is base64url JSON.
 *
 * Not a JWT: there is no `alg` header, so there is no algorithm-confusion
 * attack surface and no negotiation to get wrong. The format is fixed by this
 * file and read by nothing else.
 */
export function createSessionToken(secret: string, now = Date.now()): string {
    const issuedAt = Math.floor(now / 1000);

    const session: AdminSession = {
        sub: "admin",
        iat: issuedAt,
        exp: issuedAt + SESSION_MAX_AGE_SECONDS,
    };

    const payload = base64url(JSON.stringify(session));

    return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verifies a token and returns its session, or null.
 *
 * Order matters and is the order below: shape, then signature, then expiry. The
 * payload is not parsed as anything meaningful until its signature has been
 * checked, so a forged `exp` never reaches a comparison.
 */
export function verifySessionToken(
    token: string | undefined,
    secret: string | undefined,
    now = Date.now(),
): AdminSession | null {
    if (!token || !secret) {
        return null;
    }

    const separator = token.indexOf(".");

    if (separator <= 0 || separator === token.length - 1) {
        return null;
    }

    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);

    if (!safeEqual(signature, sign(payload, secret))) {
        return null;
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
        return null;
    }

    if (!isSession(parsed)) {
        return null;
    }

    return parsed.exp * 1000 > now ? parsed : null;
}

function isSession(value: unknown): value is AdminSession {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        candidate.sub === "admin" &&
        typeof candidate.iat === "number" &&
        typeof candidate.exp === "number"
    );
}

/**
 * Hashes a password into `scrypt$N$r$p$salt$hash`, all parts base64.
 *
 * Called once, by scripts/hash-password.mjs, on a local machine. The plaintext
 * never exists in the repo, in Vercel, or in a log line — only this string does,
 * and it is what `ADMIN_PASSWORD_HASH` holds.
 */
export function hashPassword(password: string, salt = randomBytes(16)): string {
    const derived = scryptSync(password, salt, SCRYPT.keyLength, {
        N: SCRYPT.N,
        r: SCRYPT.r,
        p: SCRYPT.p,
    });

    return [
        HASH_SCHEME,
        SCRYPT.N,
        SCRYPT.r,
        SCRYPT.p,
        salt.toString("base64"),
        derived.toString("base64"),
    ].join("$");
}

/**
 * Verifies a password against a stored hash string.
 *
 * Returns false rather than throwing on a malformed hash: a misconfigured
 * `ADMIN_PASSWORD_HASH` must fail every login, not crash the login route into a
 * 500 that says the deployment has an admin console.
 */
export function verifyPassword(password: string, stored: string | undefined): boolean {
    if (!stored) {
        return false;
    }

    const parts = stored.split("$");

    if (parts.length !== 6 || parts[0] !== HASH_SCHEME) {
        return false;
    }

    const [, rawN, rawR, rawP, rawSalt, expected] = parts;
    const N = Number(rawN);
    const r = Number(rawR);
    const p = Number(rawP);

    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
        return false;
    }

    let salt: Buffer;
    let expectedKey: Buffer;

    try {
        salt = Buffer.from(rawSalt, "base64");
        expectedKey = Buffer.from(expected, "base64");
    } catch {
        return false;
    }

    if (salt.length === 0 || expectedKey.length === 0) {
        return false;
    }

    let derived: Buffer;

    try {
        derived = scryptSync(password, salt, expectedKey.length, { N, r, p });
    } catch {
        // Cost parameters scrypt refuses (N not a power of two, maxmem exceeded).
        return false;
    }

    return timingSafeEqual(derived, expectedKey);
}

/**
 * Compares a submitted username to the configured one in constant time, so the
 * form cannot be used to enumerate whether a username exists.
 */
export function verifyUsername(username: string, expected: string | undefined): boolean {
    return typeof expected === "string" && expected.length > 0 && safeEqual(username, expected);
}
