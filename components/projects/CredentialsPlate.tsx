import { KeyRound } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";

export interface CredentialsPlateProps {
    /** Shared password for every listed account. */
    password: string;
    /** Usernames, one row each. */
    accounts: string[];
    /** Project title, used to disambiguate the copy buttons' accessible names. */
    title: string;
}

/*
 * These are demo accounts on a throwaway deployment, published in
 * data/projects.ts precisely so a recruiter can sign in and look around. They
 * are not secrets, so the plate shows them in full rather than masking them —
 * a masked value the visitor is meant to use is theatre.
 */

/**
 * Sign-in details for a project's live demo (docs/uiux.md §4.6).
 *
 * Previously a paragraph with an inline `<code>`, which meant a visitor had to
 * select four usernames by hand on a phone. Each row is now a copyable field;
 * the values stay selectable text as well, so the plate still works if the
 * clipboard API is unavailable (see hooks/useCopyToClipboard.ts).
 */
export function CredentialsPlate({ password, accounts, title }: CredentialsPlateProps) {
    return (
        <section
            aria-labelledby="credentials-heading"
            className="bp-ticks rounded-xl border border-line bg-surface p-5"
        >
            <h2
                id="credentials-heading"
                className="bp-meta mb-1 flex items-center gap-2 text-ink-muted"
            >
                <KeyRound size={14} aria-hidden="true" className="text-signal" />
                Demo accounts
            </h2>
            <p className="mb-4 text-sm text-ink-muted">
                Sign in to the live demo with any of these. They all share one password.
            </p>

            <ul className="flex flex-col">
                {accounts.map((account) => (
                    <li
                        key={account}
                        className="flex items-center justify-between gap-3 border-t border-line py-2"
                    >
                        <span className="font-mono text-sm text-ink">{account}</span>
                        <CopyButton
                            value={account}
                            label={`the ${account} username for ${title}`}
                        />
                    </li>
                ))}

                <li className="flex items-center justify-between gap-3 border-t border-line py-2">
                    <span className="flex min-w-0 items-baseline gap-2">
                        <span className="bp-meta text-ink-muted">Pw</span>
                        <span className="truncate font-mono text-sm text-ink">{password}</span>
                    </span>
                    <CopyButton value={password} label={`the shared password for ${title}`} />
                </li>
            </ul>
        </section>
    );
}
