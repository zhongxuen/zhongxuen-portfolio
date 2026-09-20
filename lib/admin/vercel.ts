import "server-only";

import type { DeployState, DeployStatusResult } from "@/types/admin";

/**
 * Deployment status for a commit this console just made (docs/admin-plan.md §14,
 * open question 2 — "worth a Vercel API token to turn 'building…' into a real
 * progress indicator, or is the commit link enough?").
 *
 * **The answer turned out to be no, the commit link is not enough**, and for a
 * reason the question did not anticipate. The link answers "did the commit
 * land", which was never in doubt — the action returned a sha. What it cannot
 * answer is "did the build succeed", and until this module existed a save that
 * *broke the build* was visually identical to one that worked: the same green
 * banner, the same "Vercel is building", and then silence. The live site would
 * keep serving the previous deploy, so even checking it would show no change and
 * look like nothing had happened yet. That is the failure this closes.
 *
 * **Entirely optional.** Without `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` every
 * function here reports `state: "unknown"` and the UI falls back to exactly what
 * it said before: the commit link and a sentence about waiting a minute. Nothing
 * degrades, and a preview deploy with no token is not broken — it is quieter.
 *
 * `server-only` and read-only: no function here can deploy, promote, roll back
 * or delete anything. The token should be scoped to read.
 */

const API = "https://api.vercel.com";

function token(): string | undefined {
    return process.env.VERCEL_TOKEN;
}

function projectId(): string | undefined {
    return process.env.VERCEL_PROJECT_ID;
}

/**
 * True when both variables are present.
 *
 * `VERCEL_PROJECT_ID` is not one of the variables Vercel injects at runtime —
 * `VERCEL_URL`, `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` are, but the project id
 * is not — so it has to be set by hand from the project's settings page. Saying
 * that here, once, saves the next reader from assuming it arrives for free.
 */
export function isDeployStatusConfigured(): boolean {
    return Boolean(token() && projectId());
}

/** What Vercel's `readyState` means for someone staring at a save banner. */
function toState(readyState: string): DeployState {
    switch (readyState) {
        case "READY":
            return "ready";
        case "ERROR":
            return "error";
        case "CANCELED":
        case "DELETED":
            return "canceled";
        case "QUEUED":
        case "INITIALIZING":
        case "BUILDING":
            return "building";
        default:
            /*
             * An unrecognised state is reported as building rather than as an
             * error. Vercel can add one, and a new state name should read as
             * "still working" — the cost of being wrong that way is a spinner
             * that stops on its own, and the cost of being wrong the other way
             * is a false alarm about a deploy that is fine.
             */
            return "building";
    }
}

interface VercelDeployment {
    uid: string;
    url: string;
    readyState: string;
    createdAt: number;
    inspectorUrl?: string;
    target?: string | null;
    meta?: Record<string, string | undefined>;
}

/**
 * Finds the deployment built from `sha`.
 *
 * Matched on `meta.githubCommitSha` rather than by taking the newest deployment,
 * because "newest" is wrong exactly when it matters: two saves a minute apart
 * produce two deployments, and reporting the second one's failure against the
 * first one's banner would send the operator to fix the wrong commit.
 *
 * Never throws. This annotates a save that has already happened; a rate-limited
 * or unreachable Vercel API must not turn a successful commit into an error
 * message. Everything unexpected becomes `state: "unknown"`, which the UI renders
 * as the honest "the commit landed, the build's outcome is not visible from
 * here".
 */
export async function deploymentForSha(sha: string): Promise<DeployStatusResult> {
    if (!isDeployStatusConfigured()) {
        return { state: "unknown" };
    }

    try {
        const query = new URLSearchParams({ projectId: projectId()!, limit: "20" });

        if (process.env.VERCEL_TEAM_ID) {
            query.set("teamId", process.env.VERCEL_TEAM_ID);
        }

        const response = await fetch(`${API}/v6/deployments?${query.toString()}`, {
            headers: { Authorization: `Bearer ${token()}` },
            cache: "no-store",
        });

        if (!response.ok) {
            console.error(`[admin/vercel] deployments → ${response.status}`);

            return { state: "unknown" };
        }

        const body = (await response.json()) as { deployments?: VercelDeployment[] };

        const match = body.deployments?.find(
            (deployment) => deployment.meta?.githubCommitSha === sha,
        );

        if (!match) {
            /*
             * Distinct from "unknown". A commit pushed seconds ago legitimately
             * has no deployment yet, and the UI should keep waiting rather than
             * give up — whereas "unknown" means it will never learn the answer.
             */
            return { state: "pending" };
        }

        return {
            state: toState(match.readyState),
            /* The build log, not the deployed page: on a failure that is the only useful destination. */
            inspectorUrl: match.inspectorUrl,
            url: match.url ? `https://${match.url}` : undefined,
            createdAt: match.createdAt,
        };
    } catch (error) {
        console.error("[admin/vercel] deploymentForSha failed", error);

        return { state: "unknown" };
    }
}

/**
 * The most recent production deployment, for the dashboard.
 *
 * Answers the question the dashboard could not: is what is on the live site
 * right now actually the last thing that was committed, or did that build fail
 * an hour ago and nobody noticed?
 */
export async function latestProductionDeployment(): Promise<
    (DeployStatusResult & { sha?: string; message?: string }) | null
> {
    if (!isDeployStatusConfigured()) {
        return null;
    }

    try {
        const query = new URLSearchParams({
            projectId: projectId()!,
            limit: "10",
            target: "production",
        });

        if (process.env.VERCEL_TEAM_ID) {
            query.set("teamId", process.env.VERCEL_TEAM_ID);
        }

        const response = await fetch(`${API}/v6/deployments?${query.toString()}`, {
            headers: { Authorization: `Bearer ${token()}` },
            cache: "no-store",
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { deployments?: VercelDeployment[] };
        const latest = body.deployments?.[0];

        if (!latest) {
            return null;
        }

        return {
            state: toState(latest.readyState),
            inspectorUrl: latest.inspectorUrl,
            url: latest.url ? `https://${latest.url}` : undefined,
            createdAt: latest.createdAt,
            sha: latest.meta?.githubCommitSha,
            message: latest.meta?.githubCommitMessage?.split("\n")[0],
        };
    } catch (error) {
        console.error("[admin/vercel] latestProductionDeployment failed", error);

        return null;
    }
}
