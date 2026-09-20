#!/usr/bin/env node
/**
 * Produces the three admin credential values for .env.local and Vercel.
 *
 *   node scripts/hash-password.mjs
 *   node scripts/hash-password.mjs "a generated passphrase"
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

import { randomBytes, scryptSync } from "node:crypto";

/*
 * NOTE ON DUPLICATION: the format string below must match `hashPassword` in
 * lib/admin/session.ts. It is restated rather than imported because this file
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
        salt.toString("base64"),
        derived.toString("base64"),
    ].join("$");
}

const supplied = process.argv[2];
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
console.log("");
console.log("Rotating ADMIN_SESSION_SECRET logs every session out everywhere.");
console.log("");
