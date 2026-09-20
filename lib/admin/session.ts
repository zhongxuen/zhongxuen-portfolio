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

/**
 * The epoch a token is minted under, when nothing says otherwise.
 *
 * **What the epoch is for.** The cookie is stateless and signed — there is no
 * server-side session table to delete a row from — so before this existed the
 * only way to end a live session early was to rotate `ADMIN_SESSION_SECRET`,
 * which means editing a Vercel environment variable and waiting for a redeploy.
 * That is a real revoke-all button, but it is a five-minute one, and the moment
 * you want it is the moment you are least willing to wait.
 *
 * Bumping `ADMIN_SESSION_EPOCH` instead invalidates every token signed under the
 * previous number, immediately, with no secret to regenerate and no risk of
 * pasting a new secret in wrong while under pressure. It is carried *inside* the
 * signed payload, so a stolen cookie cannot have its epoch edited without
 * breaking the signature.
 *
 * Starts at 1, not 0, so "unset" and "explicitly the first epoch" agree.
 */
export const DEFAULT_SESSION_EPOCH = 1;

/**
 * Reads an epoch out of an environment string.
 *
 * Anything that is not a positive integer falls back to the default rather than
 * throwing. A typo in this variable must not take the console down — it would
 * turn a mis-set value into a total lockout, which is the opposite of what a
 * revocation lever is for. The cost of the fallback is that a typo silently
 * fails to revoke; the settings page reports the effective value for that
 * reason.
 */
export function readEpoch(raw: string | undefined): number {
    const parsed = Number(raw);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_EPOCH;
}

/** scrypt cost parameters, recorded in the hash string so they can be raised without invalidating old hashes. */
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 32 } as const;

const HASH_SCHEME = "scrypt";

/**
 * Field separator for the stored hash. Deliberately **not** `$`.
 *
 * Next's env loader expands `$NAME` inside .env files, so a `$`-separated hash
 * in .env.local never reaches this module intact — `scrypt$16384$8$1$…` arrives
 * as `scrypt6384`, `verifyPassword` sees one field where it needs six, and every
 * login fails with the same generic message a wrong password gives. Quoting does
 * not help: single quotes, double quotes and backslash escapes were all tested
 * against `@next/env` and all still expand.
 *
 * Variables set in the Vercel dashboard are injected as real process env and
 * never parsed by dotenv, so production was unaffected — which is precisely what
 * made the failure hard to place, since it only ever reproduced locally.
 *
 * Salt and digest are base64url for the same reason: the whole string is then
 * `[A-Za-z0-9_-]` plus `.`, which needs no escaping in a .env file, a shell
 * argument or a URL.
 */
const HASH_SEPARATOR = ".";

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
export function createSessionToken(
    secret: string,
    now = Date.now(),
    epoch = DEFAULT_SESSION_EPOCH,
): string {
    const issuedAt = Math.floor(now / 1000);

    const session: AdminSession = {
        sub: "admin",
        iat: issuedAt,
        exp: issuedAt + SESSION_MAX_AGE_SECONDS,
        epoch,
    };

    const payload = base64url(JSON.stringify(session));

    return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verifies a token and returns its session, or null.
 *
 * Order matters and is the order below: shape, then signature, then expiry, then
 * epoch. The payload is not parsed as anything meaningful until its signature
 * has been checked, so a forged `exp` or `epoch` never reaches a comparison.
 */
export function verifySessionToken(
    token: string | undefined,
    secret: string | undefined,
    now = Date.now(),
    epoch = DEFAULT_SESSION_EPOCH,
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

    if (parsed.exp * 1000 <= now) {
        return null;
    }

    /*
     * A token minted before the epoch field existed has no `epoch`, and is read
     * as the default rather than rejected — so adding this did not sign
     * everyone out on deploy. Bumping the variable past 1 invalidates those
     * along with everything else, which is exactly what the lever is for.
     */
    return (parsed.epoch ?? DEFAULT_SESSION_EPOCH) === epoch ? parsed : null;
}

function isSession(value: unknown): value is AdminSession {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        candidate.sub === "admin" &&
        typeof candidate.iat === "number" &&
        typeof candidate.exp === "number" &&
        (candidate.epoch === undefined || typeof candidate.epoch === "number")
    );
}

/**
 * Hashes a password into `scrypt.N.r.p.salt.hash`, salt and digest base64url.
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
        salt.toString("base64url"),
        derived.toString("base64url"),
    ].join(HASH_SEPARATOR);
}

/**
 * Warns once when `ADMIN_PASSWORD_HASH` is still `$`-separated.
 *
 * Without this the only symptom is a login that fails with the generic
 * wrong-password message — correct for whoever is at the form, and useless for
 * the operator, who otherwise has to guess that the hash format moved. No part
 * of the hash is logged, only the fact that it is the retired shape.
 */
let warnedRetiredFormat = false;

function warnIfRetiredFormat(stored: string): void {
    if (!warnedRetiredFormat && stored.startsWith(`${HASH_SCHEME}$`)) {
        warnedRetiredFormat = true;

        console.warn(
            "[admin] ADMIN_PASSWORD_HASH is in the retired $-separated format. " +
                "Regenerate it with `node scripts/hash-password.mjs` and update " +
                ".env.local and Vercel — every login fails until you do.",
        );
    }
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

    const parts = stored.split(HASH_SEPARATOR);

    if (parts.length !== 6 || parts[0] !== HASH_SCHEME) {
        warnIfRetiredFormat(stored);

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
        salt = Buffer.from(rawSalt, "base64url");
        expectedKey = Buffer.from(expected, "base64url");
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
