import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            /*
             * Honour the underscore convention the codebase already uses for
             * deliberately-unused parameters.
             *
             * `useActionState` hands an action `(previousState, formData)` and several
             * admin actions need neither — `regenerateResume` renders from the
             * repository and takes no input — but the two parameters have to be
             * declared to match the hook's contract. The rule's default
             * `args: "after-used"` hid this for app/actions/contact.ts, which uses its
             * second parameter, and surfaced it the moment an action used neither.
             * Naming them `_previous` and `_formData` is the intent; this makes the
             * linter agree.
             */
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),
]);

export default eslintConfig;
