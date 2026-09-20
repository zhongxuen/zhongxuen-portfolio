import { describe, expect, it } from "vitest";
import { decodeBase32, generateTotpSecret, totpCode, totpUri, verifyTotp } from "@/lib/admin/totp";

/**
 * TOTP, pinned against RFC 6238's own published vectors.
 *
 * Hand-rolling a cryptographic construction is only defensible when it is
 * checked against the specification's numbers rather than against itself — a
 * round-trip test of `totpCode` against `verifyTotp` would pass for an
 * implementation that is internally consistent and wrong, and the symptom of
 * wrong here is an authenticator app that never agrees with the login form.
 *
 * The RFC's SHA-1 vectors are 8 digits; this implementation emits 6, which is
 * the low-order half of the same dynamic truncation, so the expectations below
 * are those values' last six digits.
 */

/** RFC 6238 Appendix B: the ASCII secret "12345678901234567890", base32-encoded. */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("decodeBase32", () => {
    it("decodes the RFC's secret back to its ASCII bytes", () => {
        expect(decodeBase32(RFC_SECRET).toString("utf8")).toBe("12345678901234567890");
    });

    it("tolerates the spacing, padding and case that apps display", () => {
        const spaced = "gezd gnbv gy3t qojq gezd gnbv gy3t qojq";

        expect(decodeBase32(spaced).equals(decodeBase32(RFC_SECRET))).toBe(true);
        expect(decodeBase32(`${RFC_SECRET}======`).equals(decodeBase32(RFC_SECRET))).toBe(true);
    });

    /*
     * An empty buffer, not a throw and not a partial decode. The caller reads it
     * as "no valid secret" and fails every code — a mistyped ADMIN_TOTP_SECRET
     * must lock the console rather than silently disable the factor it was added
     * to provide.
     */
    it("returns nothing for a secret outside the alphabet", () => {
        expect(decodeBase32("not-base32!").length).toBe(0);
        expect(decodeBase32("ABC018").length).toBe(0);
        expect(decodeBase32("").length).toBe(0);
    });
});

describe("totpCode against RFC 6238 Appendix B", () => {
    const vectors: [seconds: number, code: string][] = [
        [59, "287082"],
        [1111111109, "081804"],
        [1111111111, "050471"],
        [1234567890, "005924"],
        [2000000000, "279037"],
        [20000000000, "353130"],
    ];

    it.each(vectors)("T=%i produces %s", (seconds, code) => {
        expect(totpCode(RFC_SECRET, seconds * 1000)).toBe(code);
    });

    it("is empty for a malformed secret rather than throwing", () => {
        expect(totpCode("!!!", 59_000)).toBe("");
    });
});

describe("verifyTotp", () => {
    const AT = 1111111111 * 1000;

    it("accepts the code for the current step", () => {
        expect(verifyTotp("050471", RFC_SECRET, AT)).toBe(true);
    });

    /*
     * ±30 seconds. Zero drift would reject a correct code typed as the window
     * turned over, which is the single most common false rejection and looks
     * exactly like a broken secret to the person typing it.
     */
    it("accepts one step either side", () => {
        expect(verifyTotp(totpCode(RFC_SECRET, AT - 30_000), RFC_SECRET, AT)).toBe(true);
        expect(verifyTotp(totpCode(RFC_SECRET, AT + 30_000), RFC_SECRET, AT)).toBe(true);
    });

    it("rejects two steps away", () => {
        expect(verifyTotp(totpCode(RFC_SECRET, AT - 90_000), RFC_SECRET, AT)).toBe(false);
        expect(verifyTotp(totpCode(RFC_SECRET, AT + 90_000), RFC_SECRET, AT)).toBe(false);
    });

    it("tolerates a space in the middle, the way apps display codes", () => {
        expect(verifyTotp("050 471", RFC_SECRET, AT)).toBe(true);
    });

    it("rejects anything that is not six digits", () => {
        for (const bad of ["", "12345", "1234567", "abcdef", "05047a", "  "]) {
            expect(verifyTotp(bad, RFC_SECRET, AT)).toBe(false);
        }
    });

    /** A missing or malformed secret fails every login, loudly, rather than waving it through. */
    it("rejects everything when the secret is absent or malformed", () => {
        expect(verifyTotp("050471", undefined, AT)).toBe(false);
        expect(verifyTotp("050471", "", AT)).toBe(false);
        expect(verifyTotp("050471", "not-base32!", AT)).toBe(false);
    });
});

describe("generateTotpSecret", () => {
    it("is 32 base32 characters, i.e. the 20 bytes RFC 4226 recommends", () => {
        const secret = generateTotpSecret();

        expect(secret).toMatch(/^[A-Z2-7]{32}$/);
        expect(decodeBase32(secret).length).toBe(20);
    });

    it("produces a distinct secret each time", () => {
        expect(generateTotpSecret()).not.toBe(generateTotpSecret());
    });

    /** The generated secret must actually work with the verifier it was made for. */
    it("round-trips through totpCode and verifyTotp", () => {
        const secret = generateTotpSecret();
        const now = Date.now();

        expect(verifyTotp(totpCode(secret, now), secret, now)).toBe(true);
    });
});

describe("totpUri", () => {
    it("carries the issuer both as a label prefix and as a parameter", () => {
        const uri = totpUri(RFC_SECRET, "admin", "Portfolio console");

        /*
         * Both, because older apps read only the prefix and newer ones only the
         * parameter — an app that gets neither files the entry under a blank
         * name, which is indistinguishable from the next one you add.
         */
        expect(uri).toContain(encodeURIComponent("Portfolio console:admin"));
        expect(uri).toContain(`secret=${RFC_SECRET}`);
        expect(uri).toContain(`issuer=${encodeURIComponent("Portfolio console")}`);
        expect(uri).toContain("digits=6");
        expect(uri).toContain("period=30");
    });
});
