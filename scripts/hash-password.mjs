#!/usr/bin/env node
/**
 * Produces the admin credential values for .env.local and Vercel.
 *
 *   node scripts/hash-password.mjs
 *   node scripts/hash-password.mjs "a generated passphrase"
 *   node scripts/hash-password.mjs --totp     # also mint a second-factor secret
 *
 * With no argument it generates a 24-character passphrase for you, which is the
 * recommended path: the real defence on this login form is the password's
 * entropy, not the per-IP limiter (docs/admin-plan.md §4.4), and a chosen
 * password is the weakest part of the whole console.
 *
 * The plaintext is printed once, here, and never stored. Only the scrypt hash
 * goes into the environment.
 *
 * Deliberately a plain .mjs script rather than a TypeScript one run through a
 * loader: it is used once, on a laptop, and `node scripts/hash-password.mjs`
 * with no build step is the lowest-friction version of that. It reimplements
 * nothing — the hash format lives in lib/admin/session.ts and is imported from
 * the compiled-free source below via a tiny inline copy of the two lines that
 * matter, so there is exactly one place the format is defined: see the note.
 */

import { createHmac, randomBytes, scryptSync } from "node:crypto";

/*
 * NOTE ON DUPLICATION: the format string below must match `hashPassword` in
 * lib/admin/session.ts — including the `.` separator and base64url encoding,
 * which are what keep the value pasteable into a .env file (a `$` in there is
 * expanded by Next's env loader and silently eats most of the hash). It is restated rather than imported because this file
 * runs under bare `node`, which cannot resolve a TypeScript module or the "@/"
 * alias. tests/lib/adminAuth.test.ts asserts that a hash produced with these
 * parameters verifies, which is what keeps the two in step.
 */
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 32 };

/** Unambiguous alphabet: no O/0, no l/1/I. A password you may have to read aloud once. */
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_";
const GENERATED_LENGTH = 24;

function generatePassphrase() {
    const bytes = randomBytes(GENERATED_LENGTH * 2);
    let out = "";

    /*
     * Rejection sampling rather than `% ALPHABET.length`, which would bias the
     * first 20 characters of the alphabet upward. The generous byte pool makes
     * running out vanishingly unlikely, and the loop refills rather than
     * accepting a short password if it happens.
     */
    for (let i = 0; out.length < GENERATED_LENGTH; i += 1) {
        if (i >= bytes.length) {
            return generatePassphrase();
        }

        const byte = bytes[i];

        if (byte < 256 - (256 % ALPHABET.length)) {
            out += ALPHABET[byte % ALPHABET.length];
        }
    }

    return out;
}

function hashPassword(password) {
    const salt = randomBytes(16);
    const derived = scryptSync(password, salt, SCRYPT.keyLength, {
        N: SCRYPT.N,
        r: SCRYPT.r,
        p: SCRYPT.p,
    });

    return [
        "scrypt",
        SCRYPT.N,
        SCRYPT.r,
        SCRYPT.p,
        salt.toString("base64url"),
        derived.toString("base64url"),
    ].join(".");
}

/*
 * NOTE ON DUPLICATION, part two: the base32 encoder below must agree with
 * `decodeBase32` in lib/admin/totp.ts, for the same reason — bare `node` cannot
 * resolve a TypeScript module. tests/lib/totp.test.ts pins the pair against
 * RFC 6238's published vectors, so a divergence fails there rather than at a
 * login form at midnight.
 */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateTotpSecret() {
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

/** Decodes base32 and prints the code for right now, so the secret can be verified before it is trusted. */
function currentCode(secret) {
    let bits = 0;
    let value = 0;
    const key = [];

    for (const char of secret) {
        value = (value << 5) | BASE32.indexOf(char);
        bits += 5;

        if (bits >= 8) {
            key.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    const counter = Buffer.alloc(8);
    const step = Math.floor(Date.now() / 1000 / 30);
    counter.writeUInt32BE(Math.floor(step / 0x100000000), 0);
    counter.writeUInt32BE(step >>> 0, 4);

    const digest = createHmac("sha1", Buffer.from(key)).update(counter).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

    return String(binary % 1_000_000).padStart(6, "0");
}

const wantsTotp = process.argv.includes("--totp");
const supplied = process.argv.find((argument, index) => index >= 2 && argument !== "--totp");
const password = supplied ?? generatePassphrase();

console.log("");

if (supplied) {
    console.log("Using the password you supplied.");
} else {
    console.log("Generated password — copy it into your password manager NOW.");
    console.log("It is not stored anywhere and this is the only time it is shown.");
    console.log("");
    console.log(`    ${password}`);
}

console.log("");
console.log("Add these to .env.local, and to the Vercel project's environment");
console.log("variables (Production and Preview):");
console.log("");
/*
 * A suggestion, not a requirement. Lowercased and stripped of spaces because the
 * OS username is often "Firstname Lastname", which is awkward to type into a
 * login form and awkward to quote in a Vercel environment variable.
 */
const suggestedUsername = (process.env.USER ?? process.env.USERNAME ?? "admin")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

console.log(`ADMIN_USERNAME=${suggestedUsername}`);
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64")}`);

if (wantsTotp) {
    const secret = generateTotpSecret();

    console.log(`ADMIN_TOTP_SECRET=${secret}`);
    console.log("");
    console.log("Scan this in your authenticator app BEFORE deploying the variable —");
    console.log("a secret in the environment that nothing can generate codes for is a lockout:");
    console.log("");
    console.log(
        `    otpauth://totp/${encodeURIComponent(`Portfolio console:${suggestedUsername}`)}` +
            `?secret=${secret}&issuer=Portfolio%20console&algorithm=SHA1&digits=6&period=30`,
    );
    console.log("");
    console.log(`The code right now is ${currentCode(secret)} — check your app agrees.`);
}

console.log("");
console.log("To sign every device out: raise ADMIN_SESSION_EPOCH (immediate, no new secret),");
console.log("or rotate ADMIN_SESSION_SECRET (also works, but needs a redeploy).");
console.log("");
