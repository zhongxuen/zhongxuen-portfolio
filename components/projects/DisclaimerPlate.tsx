import { TriangleAlert } from "lucide-react";

export interface DisclaimerPlateProps {
    /** One caveat per row, in the order they matter to a visitor. */
    items: string[];
}

/*
 * These sit in the rail, next to the spec sheet and above the demo
 * credentials, because that is the column a visitor reads before deciding
 * whether to click "Open live demo". A caveat placed after the feature list
 * arrives too late to change what they expect.
 */

/**
 * Scope limits for a project (docs/uiux.md §4.6).
 *
 * The honest counterpart to the callouts in the body: "What I built" says what
 * the work does, this says where it stops. Rows are hairline-separated in the
 * same drafting idiom as CredentialsPlate and the spec sheet, and the heading
 * carries the only warning glyph on the page — enough to be found, not enough
 * to read as an error state.
 */
export function DisclaimerPlate({ items }: DisclaimerPlateProps) {
    return (
        <section
            aria-labelledby="disclaimers-heading"
            className="bp-ticks rounded-xl border border-line bg-surface p-5"
        >
            <h2
                id="disclaimers-heading"
                className="bp-meta mb-1 flex items-center gap-2 text-ink-muted"
            >
                <TriangleAlert size={14} aria-hidden="true" className="text-signal" />
                Scope &amp; caveats
            </h2>
            <p className="mb-3 text-sm text-ink-muted">
                What this project deliberately does not do.
            </p>

            <ul className="flex flex-col">
                {items.map((item) => (
                    <li
                        key={item}
                        className="border-t border-line py-2.5 text-sm leading-relaxed text-ink-muted"
                    >
                        {item}
                    </li>
                ))}
            </ul>
        </section>
    );
}
