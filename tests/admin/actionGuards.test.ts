import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Asserts that every admin Server Action verifies the session itself.
 *
 * **This is the most important test in the suite**, and it is a static check over
 * source text rather than a behavioural one — crude, and worth it, because the
 * failure it catches is invisible in review and catastrophic in production.
 *
 * The reasoning is the Next 16 proxy docs', verbatim: *"Server Functions are not
 * separate routes… a Proxy matcher that excludes a path will also skip Server
 * Function calls on that path… Always verify authentication and authorization
 * inside each Server Function rather than relying on Proxy alone."* A Server
 * Action is a public POST endpoint reachable by replay. `proxy.ts` does not cover
 * it. An action that forgets `verifySession()` is an unauthenticated write to the
 * repository, and nothing about reading the file would tell you.
 *
 * Why not run the actions and assert they reject: they would need a fake session
 * store, a fake GitHub and a fake `cookies()`, and the resulting test would prove
 * that the *mocked* paths are guarded. The property that matters is syntactic —
 * the call is present, near the top, in every export — so it is checked
 * syntactically.
 */

const ACTIONS_DIR = join(process.cwd(), "app", "(admin)", "actions");

/**
 * The only exemptions, named one at a time.
 *
 * `login` is how a session is created and `logout` destroys one, so requiring a
 * valid session would make the first impossible and the second pointless. Both
 * still refuse to run on a deployment with no credentials configured. A list a
 * reviewer has to edit, deliberately, rather than a pattern a new action could
 * accidentally match.
 */
const EXEMPT = new Set(["login", "logout"]);

function actionFiles(): string[] {
    return readdirSync(ACTIONS_DIR).filter((name) => name.endsWith(".ts"));
}

/** Every `export async function <name>(` in a file, with the body that follows it. */
function exportedActions(source: string): { name: string; body: string }[] {
    const pattern = /export async function (\w+)\s*\(/g;
    const found: { name: string; index: number }[] = [];

    for (const match of source.matchAll(pattern)) {
        found.push({ name: match[1], index: match.index });
    }

    return found.map((entry, position) => ({
        name: entry.name,
        body: source.slice(entry.index, found[position + 1]?.index ?? source.length),
    }));
}

describe("admin Server Actions", () => {
    const files = actionFiles();

    it("the actions directory is where this test thinks it is", () => {
        // Guards against the whole suite passing vacuously after a directory move.
        expect(files.length).toBeGreaterThan(0);
    });

    it.each(files)("%s is a 'use server' module", (file) => {
        const source = readFileSync(join(ACTIONS_DIR, file), "utf8");

        expect(source.trimStart().startsWith('"use server";')).toBe(true);
    });

    it.each(files)("%s exports at least one action", (file) => {
        const source = readFileSync(join(ACTIONS_DIR, file), "utf8");

        expect(exportedActions(source).length).toBeGreaterThan(0);
    });

    it("every exported action calls verifySession() first", () => {
        const offenders: string[] = [];

        for (const file of files) {
            const source = readFileSync(join(ACTIONS_DIR, file), "utf8");

            for (const action of exportedActions(source)) {
                if (EXEMPT.has(action.name)) {
                    continue;
                }

                if (!action.body.includes("await verifySession()")) {
                    offenders.push(`${file}: ${action.name} never calls verifySession()`);
                    continue;
                }

                /*
                 * "First" is checked as "before anything that could have an
                 * effect": the guard must precede the first await of anything
                 * else, or a GitHub read could run for an unauthenticated caller.
                 */
                const guardAt = action.body.indexOf("await verifySession()");
                const firstAwait = action.body.indexOf("await ");

                if (guardAt !== firstAwait) {
                    offenders.push(
                        `${file}: ${action.name} awaits something before verifySession()`,
                    );
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    /**
     * A `"use server"` module may only export async functions. A type or a
     * constant exported from one is a build error, which `next build` catches —
     * but catching it here means finding out in two seconds rather than two
     * minutes, and this is a mistake that is easy to make while moving code
     * around.
     */
    it("exports nothing but async functions", () => {
        const offenders: string[] = [];

        for (const file of files) {
            const source = readFileSync(join(ACTIONS_DIR, file), "utf8");

            for (const match of source.matchAll(/^export (?!async function )(\w+)/gm)) {
                if (match[1] === "type" || match[1] === "interface") {
                    // `export type` is erased at compile time and is allowed.
                    continue;
                }

                offenders.push(`${file}: exports a non-function (${match[0]}…)`);
            }
        }

        expect(offenders).toEqual([]);
    });

    /**
     * Action return values are serialized straight to the client. The discipline
     * app/actions/contact.ts documents — log the real reason, return something
     * generic — is only worth anything if no action hands back a raw error.
     */
    it("never returns a raw error message to the client", () => {
        const offenders: string[] = [];

        for (const file of files) {
            const source = readFileSync(join(ACTIONS_DIR, file), "utf8");

            for (const match of source.matchAll(
                /message:\s*(?:String\()?\s*error(?:\.message)?/g,
            )) {
                offenders.push(`${file}: returns a raw error (${match[0]})`);
            }
        }

        expect(offenders).toEqual([]);
    });
});
