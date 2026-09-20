import { describe, expect, it } from "vitest";
import {
    SESSION_MAX_AGE_SECONDS,
    createSessionToken,
    readEpoch,
    hashPassword,
    verifyPassword,
    verifySessionToken,
    verifyUsername,
} from "@/lib/admin/session";

const SECRET = "a-test-secret-value-that-is-long-enough";
const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);

describe("hashPassword / verifyPassword", () => {
    /**
     * Also the guard on `scripts/hash-password.mjs`, which restates the scrypt
     * parameters because it runs under bare `node` and cannot import TypeScript.
     * A hash produced with those parameters has to verify here, or the documented
     * setup path produces credentials the app rejects.
     */
    it("accepts the right password", () => {
        expect(
            verifyPassword(
                "correct horse battery staple",
                hashPassword("correct horse battery staple"),
            ),
        ).toBe(true);
    });

    it("rejects a wrong password", () => {
        expect(verifyPassword("wrong", hashPassword("right"))).toBe(false);
    });

    it("rejects a password differing only in case", () => {
        expect(verifyPassword("Secret", hashPassword("secret"))).toBe(false);
    });

    it("produces a different hash for the same password, because the salt is random", () => {
        expect(hashPassword("same")).not.toBe(hashPassword("same"));
    });

    it("records its parameters in the hash, so they can be raised later", () => {
        expect(hashPassword("x")).toMatch(/^scrypt\.16384\.8\.1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    /*
     * The regression this format exists for. The previous $-separated hash was
     * expanded by Next's env loader on the way out of .env.local — an 86-character
     * string arrived as `scrypt6384` — so every local login failed with the same
     * generic message a wrong password gives. Nothing in the app could detect it;
     * only diffing the file against process.env showed it. Keep the hash free of
     * every character a .env loader, a shell or a quoting rule treats specially.
     */
    it("produces a hash no .env loader will mangle", () => {
        expect(hashPassword("x")).not.toMatch(/[$"'\\\s]/);
    });

    describe("fails closed rather than throwing on a malformed hash", () => {
        /*
         * A misconfigured ADMIN_PASSWORD_HASH must reject every login, not crash
         * the login route into a 500 — which would itself advertise that the
         * deployment has an admin console.
         */
        it.each([
            ["undefined", undefined],
            ["empty", ""],
            ["not scrypt", "bcrypt.1.2.3.4.5"],
            ["too few parts", "scrypt.16384.8.1.salt"],
            ["non-numeric cost", "scrypt.N.8.1.c2FsdA.aGFzaA"],
            ["empty salt", "scrypt.16384.8.1..aGFzaA"],
            ["impossible cost", "scrypt.3.8.1.c2FsdA.aGFzaA"],
            ["retired $-separated format", "scrypt$16384$8$1$c2FsdA==$aGFzaA=="],
        ])("%s", (_name, stored) => {
            expect(verifyPassword("anything", stored)).toBe(false);
        });
    });
});

describe("verifyUsername", () => {
    it("accepts an exact match", () => {
        expect(verifyUsername("zhongxuen", "zhongxuen")).toBe(true);
    });

    it("rejects a mismatch, a prefix and a different length", () => {
        expect(verifyUsername("zhongxue", "zhongxuen")).toBe(false);
        expect(verifyUsername("zhongxuenn", "zhongxuen")).toBe(false);
        expect(verifyUsername("ZHONGXUEN", "zhongxuen")).toBe(false);
    });

    it("rejects when nothing is configured, so an unset variable is not an open door", () => {
        expect(verifyUsername("", undefined)).toBe(false);
        expect(verifyUsername("", "")).toBe(false);
    });
});

describe("session tokens", () => {
    it("round-trips a freshly minted token", () => {
        const session = verifySessionToken(createSessionToken(SECRET, NOW), SECRET, NOW);

        expect(session).toMatchObject({ sub: "admin" });
        expect(session?.exp).toBe(session!.iat + SESSION_MAX_AGE_SECONDS);
    });

    it("rejects a token signed with a different secret — rotation is the revoke-all", () => {
        const token = createSessionToken(SECRET, NOW);

        expect(verifySessionToken(token, "a-different-secret", NOW)).toBeNull();
    });

    it("rejects a tampered payload", () => {
        const token = createSessionToken(SECRET, NOW);
        const [, signature] = token.split(".");

        const forged = Buffer.from(
            JSON.stringify({ sub: "admin", iat: 0, exp: 9_999_999_999 }),
        ).toString("base64url");

        expect(verifySessionToken(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
    });

    it("rejects a tampered signature", () => {
        const [payload, signature] = createSessionToken(SECRET, NOW).split(".");
        const flipped = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");

        expect(verifySessionToken(`${payload}.${flipped}`, SECRET, NOW)).toBeNull();
    });

    it("rejects a missing signature", () => {
        const [payload] = createSessionToken(SECRET, NOW).split(".");

        expect(verifySessionToken(payload, SECRET, NOW)).toBeNull();
        expect(verifySessionToken(`${payload}.`, SECRET, NOW)).toBeNull();
    });

    it("rejects an expired token", () => {
        const token = createSessionToken(SECRET, NOW);
        const later = NOW + (SESSION_MAX_AGE_SECONDS + 1) * 1000;

        expect(verifySessionToken(token, SECRET, later)).toBeNull();
    });

    it("still accepts a token one second before it expires", () => {
        const token = createSessionToken(SECRET, NOW);
        const justBefore = NOW + (SESSION_MAX_AGE_SECONDS - 1) * 1000;

        expect(verifySessionToken(token, SECRET, justBefore)).not.toBeNull();
    });

    it("rejects junk, and rejects everything when no secret is configured", () => {
        expect(verifySessionToken(undefined, SECRET)).toBeNull();
        expect(verifySessionToken("", SECRET)).toBeNull();
        expect(verifySessionToken(".", SECRET)).toBeNull();
        expect(verifySessionToken("not-a-token", SECRET)).toBeNull();
        expect(verifySessionToken(createSessionToken(SECRET, NOW), undefined, NOW)).toBeNull();
    });

    it("rejects a validly-signed payload that is not a session", () => {
        /*
         * A signature alone is not authorisation. If the secret were ever reused
         * to sign anything else, this is the check that stops that value being
         * accepted here.
         */
        const payload = Buffer.from(JSON.stringify({ sub: "someone-else" })).toString("base64url");
        const token = createSessionToken(SECRET, NOW);
        const realSignature = token.split(".")[1];

        expect(verifySessionToken(`${payload}.${realSignature}`, SECRET, NOW)).toBeNull();
    });
});

/**
 * Session revocation by epoch (docs/admin-plan.md §17.5).
 *
 * The cookie is stateless and signed, so there is no session row to delete. The
 * only way to end a live session early used to be rotating
 * `ADMIN_SESSION_SECRET` — a real revoke-all button, but one that needs a new
 * secret pasted into Vercel and a redeploy, at the exact moment you are least
 * willing to wait.
 */
describe("session epoch", () => {
    const SECRET = "a-test-secret-value-at-least-32-bytes-long";
    const NOW = 1_800_000_000_000;

    it("accepts a token minted under the same epoch", () => {
        const token = createSessionToken(SECRET, NOW, 4);

        expect(verifySessionToken(token, SECRET, NOW, 4)).not.toBeNull();
    });

    it("rejects a token from a previous epoch, however valid its signature", () => {
        const token = createSessionToken(SECRET, NOW, 3);

        expect(verifySessionToken(token, SECRET, NOW, 4)).toBeNull();
    });

    /*
     * The epoch travels inside the signed payload, so it cannot be edited in a
     * stolen cookie without breaking the signature. Re-signing needs the secret,
     * which is the thing the attacker does not have.
     */
    it("cannot be raised by editing the cookie", () => {
        const [payload] = createSessionToken(SECRET, NOW, 1).split(".");
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        const forged = Buffer.from(JSON.stringify({ ...decoded, epoch: 9 })).toString("base64url");

        expect(verifySessionToken(`${forged}.${payload}`, SECRET, NOW, 9)).toBeNull();
    });

    /*
     * A token minted before the field existed carries no `epoch` and is read as
     * the default rather than rejected — so shipping this did not sign everyone
     * out on deploy. Bumping the variable past 1 invalidates those too, which is
     * exactly what the lever is for.
     */
    it("treats a token with no epoch as the first one", () => {
        const legacy = createSessionToken(SECRET, NOW);

        expect(verifySessionToken(legacy, SECRET, NOW, 1)).not.toBeNull();
        expect(verifySessionToken(legacy, SECRET, NOW, 2)).toBeNull();
    });

    /*
     * A typo must not take the console down. Falling back turns a mis-set value
     * into a failure to revoke rather than a total lockout — which is why the
     * settings page reports the variable's presence.
     */
    it("falls back to the default for anything that is not a positive integer", () => {
        for (const bad of [undefined, "", "0", "-3", "two", "1.5", " "]) {
            expect(readEpoch(bad)).toBe(1);
        }

        expect(readEpoch("7")).toBe(7);
    });
});
