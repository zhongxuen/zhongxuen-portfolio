"use server";

import { verifySession } from "@/lib/admin/dal";
import { deploymentForSha } from "@/lib/admin/vercel";
import type { DeployStatusResult } from "@/types/admin";

/**
 * Polled by the save banner to turn "Vercel is building" into a real outcome.
 *
 * **Begins with `await verifySession()`,** like every other action outside
 * `auth.ts`. It would be tempting to call this one harmless — it returns a build
 * state, not data — but a Server Action is a public POST endpoint reachable by
 * replay, and an unauthenticated caller should not be able to enumerate this
 * project's deployment history one sha at a time.
 * `tests/admin/actionGuards.test.ts` asserts the call by static check, so the
 * question does not come up per-action.
 *
 * The sha is validated as a hex string before it reaches the API. It arrives
 * from the client, and although it only ever gets compared against values Vercel
 * returns, "it is only used for a comparison" is the kind of reasoning that
 * stops being true a year later.
 */
export async function checkDeployment(sha: string): Promise<DeployStatusResult> {
    await verifySession();

    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
        return { state: "unknown" };
    }

    return deploymentForSha(sha);
}
