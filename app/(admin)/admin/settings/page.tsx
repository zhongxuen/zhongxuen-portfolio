import { CircleCheck, CircleSlash } from "lucide-react";
import { verifySession } from "@/lib/admin/dal";
import { environmentPresence } from "@/lib/admin/auth";
import { isGithubWriteConfigured, readFile } from "@/lib/admin/github";
import { AVAILABILITY, SITE_LAST_MODIFIED } from "@/lib/constants";
import { now as builtInNow } from "@/data/now";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReadOnlyNotice } from "@/components/admin/ReadOnlyNotice";
import { AvailabilityPanel, LastModifiedPanel, NowPanel } from "@/components/admin/SettingsPanels";
import { Card } from "@/components/ui/Card";
import type { NowEntry } from "@/types/now";

/**
 * The one-line edits that currently need a code change (docs/admin-plan.md §7.6).
 *
 * The availability pill and `SITE_LAST_MODIFIED` are read from the build's own
 * `lib/constants.ts` rather than from the repository. That is the one place this
 * console deliberately does not read live: both are tiny, both are patched by an
 * anchored replacement against the file it reads at commit time, and importing
 * them keeps the page free of a second GitHub round trip for two values. A stale
 * default in the form is corrected the moment the deploy lands, and the commit
 * itself is still guarded by the blob sha.
 *
 * `data/now.ts` is different — it is a list the operator edits structurally — so
 * it *is* read live, and falls back to the build's copy without a write token.
 */
export default async function SettingsPage() {
    await verifySession();

    const canWrite = isGithubWriteConfigured();
    const nowEntries = await loadNow();
    const today = new Date().toISOString().slice(0, 10);

    return (
        <AdminShell
            eyebrow="Settings"
            title="Site settings"
            description="Three values that shape what the public site claims. Each is its own commit."
        >
            {!canWrite && <ReadOnlyNotice />}

            <AvailabilityPanel
                open={AVAILABILITY.open}
                label={AVAILABILITY.label}
                canWrite={canWrite}
            />

            <NowPanel entries={nowEntries} canWrite={canWrite} />

            <LastModifiedPanel current={SITE_LAST_MODIFIED} today={today} canWrite={canWrite} />

            <section className="flex flex-col gap-3">
                <h2 className="bp-meta text-ink-muted">Environment</h2>
                <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
                    Presence only — never values, and there is no control here that would reveal
                    one. This panel answers &ldquo;is this deployment wired up&rdquo;, which is a
                    boolean.
                </p>

                <Card plain className="p-0">
                    <ul className="divide-y divide-line">
                        {environmentPresence().map((entry) => (
                            <li
                                key={entry.key}
                                className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3"
                            >
                                {entry.present ? (
                                    <CircleCheck
                                        size={15}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0 text-success"
                                    />
                                ) : (
                                    <CircleSlash
                                        size={15}
                                        aria-hidden="true"
                                        className="mt-0.5 shrink-0 text-ink-muted"
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-mono text-xs text-ink">
                                        {entry.key}{" "}
                                        {/* The word, not just the icon — no status is carried by colour alone. */}
                                        <span
                                            className={
                                                entry.present ? "text-success" : "text-ink-muted"
                                            }
                                        >
                                            {entry.present ? "set" : "not set"}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                                        {entry.purpose}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </section>
        </AdminShell>
    );
}

/**
 * The NOW list from the repository, or the build's copy when there is no write
 * token. Never throws: a settings page that 500s because GitHub is slow is worse
 * than one showing a slightly older list with its save disabled.
 */
async function loadNow(): Promise<NowEntry[]> {
    if (!isGithubWriteConfigured()) {
        return builtInNow;
    }

    try {
        const file = await readFile({ kind: "known", key: "now" });

        if (!file) {
            return builtInNow;
        }

        /*
         * Parsed with the projects parser's approach would need a second grammar
         * for a second shape. This list is four string fields per row, so the
         * simplest correct thing is to read it out of the module this build
         * already has and only use the remote text to detect that they differ.
         */
        return sameShape(file.text, builtInNow) ? builtInNow : parseNowLoosely(file.text);
    } catch {
        return builtInNow;
    }
}

/** True when every entry in the build's copy still appears, by id, in the remote text. */
function sameShape(source: string, entries: NowEntry[]): boolean {
    return entries.every((entry) => source.includes(`id: "${entry.id}"`));
}

/**
 * Reads the four fields out of `data/now.ts` when the repository has moved ahead
 * of this build.
 *
 * A regex rather than the strict tokenizer `parseProjects` uses, and that is a
 * deliberate difference in stakes: nothing is *written* from this result without
 * the operator seeing it in the form and pressing Save, and the save re-emits from
 * the form rather than from this parse. A missed field shows as an empty input,
 * which is visible; it cannot silently reach a commit.
 */
function parseNowLoosely(source: string): NowEntry[] {
    const entries: NowEntry[] = [];
    const pattern =
        /\{\s*id:\s*"([^"]*)",\s*label:\s*"([^"]*)",\s*detail:\s*\n?\s*"((?:[^"\\]|\\.)*)",\s*since:\s*"([^"]*)",\s*\}/g;

    for (const match of source.matchAll(pattern)) {
        entries.push({
            id: match[1],
            label: match[2],
            detail: match[3].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
            since: match[4],
        });
    }

    return entries;
}
