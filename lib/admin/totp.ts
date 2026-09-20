import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) for the admin login (docs/admin-plan.md §17.10).
 *
 * **Why, when the password is already scrypt-hashed and rate-limited.** The
 * threat this answers is not a guessed password — it is a *leaked environment*.
 * `ADMIN_PASSWORD_HASH` and `GITHUB_ADMIN_TOKEN` sit in the same Vercel project;
 * anything that exposes one exposes both, and the token writes to `main`. A
 * second factor whose secret is also in that environment does not help against
 * that, which is the honest objection — so the value here is narrower and real:
 * it defeats a password that leaked *on its own*, through a reused credential, a
 * phishing page, or a browser that saved it on a shared machine. That is the
 * common way a single-operator console is actually broken into, and it is the
 * one this closes.
 *
 * **Optional by design.** No `ADMIN_TOTP_SECRET` means no second factor and no
 * code field — `isTotpEnabled()` is false and the login form does not render one.
 * Turning it on is setting one variable; turning it off is unsetting it. There
 * is no enrolment flow, no recovery codes, and no lockout: this is one operator
 * with access to their own Vercel dashboard, and the recovery path is deleting
 * the variable, which is faster and safer than any code-based escape hatch that
 * could itself be stolen.
 *
 * No `server-only` marker, for the same reason `lib/admin/session.ts` has none:
 * it reads no environment variable of its own, every caller passes the secret
 * in, and it stays unit-testable without a fake environment.
 */

/** RFC 6238 defaults, and what every authenticator app assumes when a URI omits them. */
const STEP_SECONDS = 30;
const DIGITS = 6;

/**
 * How many steps either side of now are accepted.
 *
 * One, which is ±30 seconds. Zero would reject a correct code typed as the
 * window turned over — the single most common false rejection, and one that
 * looks exactly like a broken secret to the person typing. More than one starts
 * meaningfully widening the guess space for a six-digit code.
 */
const WINDOW = 1;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Decodes an RFC 4648 base32 secret, ignoring padding, spaces and case.
 *
 * Authenticator apps display secrets in spaced, upper-case groups and people
 * copy them with the spaces. Rejecting that would be a correctness claim about
 * whitespace rather than about the secret.
 *
 * Returns an empty buffer for anything malformed. The caller reads that as "no
 * valid secret", which fails every code — a misconfigured secret must lock the
 * console rather than silently disable the factor it was added to provide.
 */
export function decodeBase32(secret: string): Buffer {
    const clean = secret.replace(/[\s=-]/g, "").toUpperCase();

    if (clean.length === 0 || /[^A-Z2-7]/.test(clean)) {
        return Buffer.alloc(0);
    }

    let bits = 0;
    let value = 0;
    const out: number[] = [];

    for (const char of clean) {
        value = (value << 5) | BASE32.indexOf(char);
        bits += 5;

        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    return Buffer.from(out);
}

/** The eight-byte big-endian counter RFC 4226 hashes. */
function counterBuffer(counter: number): Buffer {
    const buffer = Buffer.alloc(8);

    /*
     * Written as two 32-bit halves because a JavaScript number cannot hold a
     * 64-bit integer exactly and `writeBigUInt64BE` would mean carrying BigInt
     * conversions through every caller for a value that is comfortably under
     * 2^53 until the year 285,000,000.
     */
    buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buffer.writeUInt32BE(counter >>> 0, 4);

    return buffer;
}

/** The HOTP code for one counter value. SHA-1 because that is what authenticator apps default to. */
function hotp(key: Buffer, counter: number): string {
    const digest = createHmac("sha1", key).update(counterBuffer(counter)).digest();

    // RFC 4226 §5.4 dynamic truncation.
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

    return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** The code for a given moment. Exported for the tests and for `scripts/hash-password.mjs`. */
export function totpCode(secret: string, now = Date.now()): string {
    const key = decodeBase32(secret);

    if (key.length === 0) {
        return "";
    }

    return hotp(key, Math.floor(now / 1000 / STEP_SECONDS));
}

/**
 * Verifies a submitted code against the secret.
 *
 * **Every candidate in the window is always evaluated** — no early return on the
 * first match. The comparison is `timingSafeEqual` over equal-length buffers, and
 * returning as soon as one matches would leak, through response time, *which*
 * step matched: enough to tell a code typed early from one typed late, which is
 * a small leak but a free one to avoid.
 *
 * Returns false for a malformed secret, so a mistyped `ADMIN_TOTP_SECRET` fails
 * every login loudly rather than quietly disabling the second factor.
 */
export function verifyTotp(code: string, secret: string | undefined, now = Date.now()): boolean {
    if (!secret) {
        return false;
    }

    const submitted = code.replace(/\s/g, "");

    if (!new RegExp(`^\\d{${DIGITS}}$`).test(submitted)) {
        return false;
    }

    const key = decodeBase32(secret);

    if (key.length === 0) {
        return false;
    }

    const step = Math.floor(now / 1000 / STEP_SECONDS);
    const expected = Buffer.from(submitted, "utf8");
    let matched = false;

    for (let drift = -WINDOW; drift <= WINDOW; drift += 1) {
        const candidate = Buffer.from(hotp(key, step + drift), "utf8");

        if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
            matched = true;
        }
    }

    return matched;
}

/** 20 random bytes, base32-encoded — the length RFC 4226 recommends for SHA-1. */
export function generateTotpSecret(): string {
    const bytes = randomBytes(20);
    let bits = 0;
    let value = 0;
    let out = "";

    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;

        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        out += BASE32[(value << (5 - bits)) & 31];
    }

    return out;
}

/**
 * The `otpauth://` URI an authenticator app scans.
 *
 * `issuer` appears twice — as a label prefix and as a parameter — which looks
 * redundant and is not: older apps read only the prefix, newer ones only the
 * parameter, and an app that gets neither files the entry under a blank name.
 */
export function totpUri(secret: string, account: string, issuer: string): string {
    const label = encodeURIComponent(`${issuer}:${account}`);

    /*
     * Built by hand rather than with `URLSearchParams`, which encodes a space as
     * `+` — correct for a form body, wrong here. `otpauth://` is read as a plain
     * URI, so an issuer containing a space arrives at the authenticator as
     * "Portfolio+console" and is filed under that name forever. The bug is
     * invisible until someone reads the entry in their app, which is exactly the
     * moment it cannot be fixed without re-enrolling.
     */
    const query = [
        ["secret", secret],
        ["issuer", issuer],
        ["algorithm", "SHA1"],
        ["digits", String(DIGITS)],
        ["period", String(STEP_SECONDS)],
    ]
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");

    return `otpauth://totp/${label}?${query}`;
}
