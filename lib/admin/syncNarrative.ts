import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { AUTHOR } from "@/lib/constants";
import { fetchCommits, fetchReadme, type GitHubCommit } from "@/lib/github";
import type { NarrativeDraft, SyncActivity, SyncCommit } from "@/types/admin";
import type { Project } from "@/types/project";

/**
 * The "New work" half of the GitHub sync (docs/admin-plan.md §7.4).
 *
 * `buildSyncPlan` decides *which* entries have new work; this module fetches what
 * that work was — commits since the last review, and the README — and, on
 * request, asks a model to draft the copy changes they imply.
 *
 * The draft is a proposal like every other sync entry: it is shown field by
 * field, editable, and nothing is written until the operator ticks it and
 * applies. The model is told the current entry and asked to change only what the
 * repo shows is out of date, because a rewrite of copy that was already right is
 * a diff the operator has to read for nothing.
 */

const OWNER = AUTHOR.githubUsername;

/**
 * Model for drafts, through the Vercel AI Gateway. On a Vercel deployment the
 * Gateway authenticates with the project's OIDC token; locally it needs
 * `AI_GATEWAY_API_KEY` (or `vercel env pull`). Overridable so a cheaper or newer
 * model is a config change, not a commit.
 */
const MODEL = process.env.SYNC_DRAFT_MODEL || "anthropic/claude-sonnet-5.5";

/** README characters sent to the model. Long READMEs are mostly setup steps at the end. */
const README_BUDGET = 40_000;

/** Commits listed per entry on the page, and sent to the model. */
const COMMIT_LIMIT = 40;

function toSyncCommit(commit: GitHubCommit): SyncCommit {
    return {
        sha: commit.sha.slice(0, 7),
        url: commit.html_url,
        date: commit.commit.author?.date ?? "",
        message: commit.commit.message.split("\n")[0],
    };
}

/**
 * Commits since each activity entry's last review, keyed by slug. Never-reviewed
 * entries get the most recent commits instead of their whole history.
 */
export async function loadActivityCommits(
    activity: SyncActivity[],
): Promise<Record<string, SyncCommit[]>> {
    const entries = await Promise.all(
        activity.map(async (entry) => {
            const commits = await fetchCommits(OWNER, entry.githubRepo, {
                since: entry.since,
                limit: entry.since ? COMMIT_LIMIT : 10,
            });

            return [entry.slug, commits.map(toSyncCommit)] as const;
        }),
    );

    return Object.fromEntries(entries);
}

const listField = z.array(z.string().min(1).max(600)).max(30);

/*
 * Every field optional and nullable: "leave it alone" is the expected answer for
 * most fields, and a schema that demanded all of them would get them all
 * rewritten.
 */
const DRAFT_SCHEMA = z.object({
    summary: z
        .string()
        .describe("One or two plain sentences on what changed in the project since the entry was written."),
    description: z
        .string()
        .max(220)
        .nullable()
        .describe("Card summary, one sentence, ideally under 155 characters. Null if still accurate."),
    longDescription: z
        .string()
        .max(6000)
        .nullable()
        .describe("Detail-page paragraph. Null if still accurate."),
    technologies: listField.nullable().describe("Full replacement list. Null if still accurate."),
    keyFeatures: listField.nullable().describe("Full replacement list. Null if still accurate."),
    disclaimers: listField.nullable().describe("Full replacement list. Null if still accurate."),
    futureImprovements: listField
        .nullable()
        .describe("Full replacement list. Null if still accurate."),
});

const SYSTEM = `You maintain the project entries of a developer's portfolio website.
You are given one entry as it stands and the project's README and recent commits.
Update the entry so it is accurate to the project as it is now.

Rules:
- Change only what is out of date or missing. If a field is still accurate, return null for it.
- When you change a list, return the whole list: keep the items that are still true, in their order and wording, edit the stale ones, and add new ones.
- Match the existing voice exactly: plain, specific and honest, with no marketing words ("powerful", "seamless", "cutting-edge"), no emoji, and no exclamation marks.
- Claim only what the README or commits support. Don't invent numbers, users or results.
- Disclaimers are honest scope limits: what the project doesn't do, and what the live link will and won't let a visitor try. Drop a disclaimer only if the repo shows it no longer applies.
- Spell technologies the way the entry already does (e.g. "Next.js", "TypeScript", "Tailwind CSS").
- The README may be out of date itself. Where the commits are newer and contradict it, believe the commits.`;

/**
 * Drafts an update to one entry's copy. Throws on a model or network failure;
 * the action turns that into a message.
 */
export async function draftNarrative(
    project: Project,
    githubRepo: string,
): Promise<NarrativeDraft> {
    const [readme, commits] = await Promise.all([
        fetchReadme(OWNER, githubRepo),
        fetchCommits(OWNER, githubRepo, { since: project.syncedAt, limit: COMMIT_LIMIT }),
    ]);

    if (!readme && commits.length === 0) {
        throw new DraftInputError("The repository has no README and no commits to draft from.");
    }

    const current = {
        title: project.title,
        description: project.description,
        longDescription: project.longDescription,
        technologies: project.technologies,
        keyFeatures: project.keyFeatures,
        disclaimers: project.disclaimers,
        futureImprovements: project.futureImprovements,
    };

    const commitLog = commits
        .map((commit) => `${commit.commit.author?.date?.slice(0, 10) ?? ""} ${commit.commit.message.trim()}`)
        .join("\n\n");

    const prompt = [
        "## Current entry (JSON)",
        JSON.stringify(current, null, 2),
        project.syncedAt
            ? `## Commits since the entry was last reviewed (${project.syncedAt}), newest first`
            : "## Most recent commits, newest first",
        commitLog || "(none)",
        "## README",
        readme ? readme.slice(0, README_BUDGET) : "(no README)",
    ].join("\n\n");

    const { output } = await generateText({
        model: MODEL,
        system: SYSTEM,
        prompt,
        output: Output.object({ schema: DRAFT_SCHEMA }),
    });

    const { summary, ...rest } = output;
    const fields: NarrativeDraft["fields"] = {};

    for (const [key, value] of Object.entries(rest) as [keyof typeof rest, unknown][]) {
        if (value !== null && value !== undefined) {
            fields[key] = value as string | string[];
        }
    }

    return { summary, fields };
}

/** A draft that could not start for a reason the operator can act on. */
export class DraftInputError extends Error {
    name = "DraftInputError";
}
