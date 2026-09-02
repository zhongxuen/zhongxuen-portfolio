import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Absolute path to the repo root, with a trailing separator. */
const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    resolve: {
        // Mirrors the "@/*" path mapping in tsconfig.json. A regex `find` is
        // used rather than a bare "@" key so the trailing separator on
        // `rootDir` is consumed instead of producing a doubled slash.
        alias: [{ find: /^@\//, replacement: rootDir }],
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        /*
         * lib/constants.ts resolves SITE_URL from the environment at import
         * time, and every canonical URL, JSON-LD @id and OG url is built from
         * it. Pinning a fixed origin here lets those tests assert the exact
         * strings the site would ship instead of restating the constant.
         */
        env: {
            NEXT_PUBLIC_SITE_URL: "https://example.test",
            /*
             * lib/utils formats date-only strings, which parse as UTC midnight
             * but render in the ambient timezone — "Jun 2024" in CI and
             * "May 2024" on a developer machine west of Greenwich. Pinning UTC
             * keeps those assertions the same everywhere.
             */
            TZ: "UTC",
        },
    },
});
