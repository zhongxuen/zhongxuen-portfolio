import type { NowEntry } from "@/types/now";

/**
 * What is actually happening right now (docs/uiux.md §4.3).
 *
 * Every line here is traceable to something else in the repo — the internship
 * to data/experience.ts, the diploma to data/education.ts, the rebuild to this
 * tree's own git history. Nothing aspirational goes in this file: "learning
 * Rust" with no Rust anywhere in data/projects.ts is the exact claim a
 * technical reader checks first.
 *
 * Maintenance: this is the one part of the site that dates itself out loud, so
 * review it whenever data/experience.ts changes. An entry that has ended is a
 * deletion, not an edit.
 */
export const now: NowEntry[] = [
    {
        id: "ted-optimus-internship",
        label: "Interning",
        detail: "Frontend web developer at TED Optimus, building user-facing features and reusable component libraries. Runs to late October 2026.",
        since: "2026-07-20",
    },
    {
        id: "portfolio-rebuild",
        label: "Building",
        detail: "Rebuilding this site around server components and URL state, with the whole motion system running on CSS rather than an animation runtime.",
        since: "2026-08-07",
    },
    {
        id: "apu-diploma",
        label: "Studying",
        detail: "Diploma in Information & Communication Technology (Software Engineering) at APU — 3.72 CGPA across five semesters, with the industrial placement above as the final component.",
        since: "2024-01-01",
    },
];
