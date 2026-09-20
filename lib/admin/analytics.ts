import "server-only";

/**
 * Per-page traffic from Vercel Web Analytics (docs/admin-plan.md §17.9).
 *
 * **What this is for.** The dashboard already counts projects, featured
 * projects and screenshots — all facts about the file, none of which say
 * anything about whether the work is being seen. The decision made most often
 * in this console is which projects to feature and in what order, and it was
 * being made with no information at all. "This one gets four times the traffic
 * of the one above it" is the single most useful fact the console can put on
 * that screen.
 *
 * **Optional, like the deploy status.** No `VERCEL_TOKEN` or `VERCEL_PROJECT_ID`
 * means `null`, the dashboard omits the panel, and nothing is broken. Analytics
 * also has to be enabled on the project itself — `@vercel/analytics` is already
 * a dependency and the script is already on the page, so this is usually true
 * already, but a project with it switched off returns empty rows rather than an
 * error, and an empty panel says so.
 *
 * **Read-only and server-only.** The token here is the same one the deploy
 * status uses and needs no more scope than reading.
 */

const API = "https://api.vercel.com";

export interface PageViews {
    /** Path, as the analytics API reports it — `/projects/jobnow`. */
    path: string;
    views: number;
}

export interface TrafficReport {
    /** Most-viewed first. */
    pages: PageViews[];
    /** How many days the window covers, for the caption. */
    days: number;
}

/**
 * Views per path over the last `days` days.
 *
 * Thirty days by default: long enough that a single share on a Friday does not
 * dominate the ranking, short enough that a project added last month is not
 * buried under a year of history it never had.
 *
 * Returns null rather than throwing, for the same reason `recentCommits` does —
 * this annotates a dashboard whose job is something else, and an analytics
 * outage must not take the console down with it.
 */
export async function pageTraffic(days = 30): Promise<TrafficReport | null> {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!token || !projectId) {
        return null;
    }

    try {
        const until = Date.now();
        const since = until - days * 24 * 60 * 60 * 1000;

        const query = new URLSearchParams({
            projectId,
            since: String(since),
            until: String(until),
            limit: "50",
        });

        if (process.env.VERCEL_TEAM_ID) {
            query.set("teamId", process.env.VERCEL_TEAM_ID);
        }

        const response = await fetch(`${API}/v1/web-analytics/timeseries/path?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
            /*
             * Cached for five minutes rather than `no-store`. Unlike a blob sha,
             * a five-minute-old view count changes no decision, and the
             * dashboard is reloaded often enough that an uncached call would
             * spend quota answering the same question repeatedly.
             */
            next: { revalidate: 300 },
        });

        if (!response.ok) {
            console.error(`[admin/analytics] timeseries → ${response.status}`);

            return null;
        }

        const body = (await response.json()) as {
            data?: { key?: string; path?: string; total?: number; devices?: number }[];
        };

        const pages = (body.data ?? [])
            .map((row) => ({
                path: row.path ?? row.key ?? "",
                views: row.total ?? row.devices ?? 0,
            }))
            .filter((row) => row.path.length > 0)
            .sort((a, b) => b.views - a.views);

        return { pages, days };
    } catch (error) {
        console.error("[admin/analytics] pageTraffic failed", error);

        return null;
    }
}

/**
 * Narrows a traffic report to the project pages, keyed by slug.
 *
 * Paths that are not `/projects/<slug>` are dropped rather than bucketed into an
 * "other" row: the panel's whole purpose is to rank projects against each other,
 * and the home page — which always wins by an order of magnitude — would flatten
 * the comparison it exists to make.
 */
export function viewsBySlug(report: TrafficReport | null): Map<string, number> {
    const bySlug = new Map<string, number>();

    for (const page of report?.pages ?? []) {
        const match = /^\/projects\/([^/?#]+)\/?$/.exec(page.path);

        if (match) {
            bySlug.set(match[1], (bySlug.get(match[1]) ?? 0) + page.views);
        }
    }

    return bySlug;
}
