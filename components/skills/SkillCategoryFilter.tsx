import type { SkillCategory } from "@/types/skill";

export interface SkillCategoryFilterProps {
    /** Categories in the order their panels appear, with their skill counts. */
    categories: { name: SkillCategory; slug: string; count: number }[];
    /**
     * `id` of the ancestor holding both this control and the panels. The
     * generated rules are scoped to it.
     */
    scopeId: string;
    /** `data-*` attribute each panel carries, holding its slug. */
    panelAttribute: string;
}

/**
 * Segmented category filter for the skills section (docs/uiux.md §4.4).
 *
 * No JavaScript, on the server or the client. It is a radio group — the browser
 * already knows how to keep exactly one of those selected, including with
 * scripting disabled — and the filtering itself is a handful of `:has()` rules
 * that hide every panel whose slug is not the checked one.
 *
 * The rules are emitted here rather than written into app/globals.css because
 * they have to enumerate the categories, and the categories come from
 * data/skills.ts. Generated, they can never fall out of step with the data;
 * hand-written, adding a category to types/skill.ts would silently ship a
 * filter option that hides everything. Values are slugs built by `slugify`, so
 * they contain nothing that could terminate the rule or the tag.
 *
 * Degradation is correct at both ends: with `:has()` unsupported nothing is
 * hidden and every panel stays visible, and with the radios unstyled the labels
 * still read as a list of category names.
 */
export function SkillCategoryFilter({
    categories,
    scopeId,
    panelAttribute,
}: SkillCategoryFilterProps) {
    const inputId = (slug: string) => `skill-filter-${slug}`;

    /*
     * One rule per category. "All" needs none: it is the default state, and its
     * absence from this list is exactly what makes it show everything.
     */
    const css = categories
        .map(
            ({ slug }) =>
                `#${scopeId}:has(#${inputId(slug)}:checked) [${panelAttribute}]:not([${panelAttribute}="${slug}"]){display:none}`,
        )
        .join("");

    const options = [{ name: "All", slug: "all", count: null }, ...categories];

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: css }} />

            <fieldset className="flex flex-col gap-3">
                <legend className="bp-meta mb-3 text-ink-muted">Filter by category</legend>

                <ul className="flex flex-wrap gap-2">
                    {options.map((option, index) => (
                        <li key={option.slug}>
                            {/*
                             * `sr-only` clips the input without removing it, so
                             * it keeps its place in the tab order and its label
                             * association. The visible chip is the <label>,
                             * which mirrors the input's checked and focused
                             * states through the `peer` variants.
                             */}
                            <input
                                type="radio"
                                id={inputId(option.slug)}
                                name="skill-category"
                                value={option.slug}
                                defaultChecked={index === 0}
                                className="peer sr-only"
                            />
                            <label
                                htmlFor={inputId(option.slug)}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xs border border-line-ui/60 bg-surface-alt px-2.5 py-1 font-mono text-xs leading-5 text-ink-muted transition-[background-color,border-color,color] duration-fast ease-bp select-none hover:border-accent hover:text-accent peer-checked:border-accent/45 peer-checked:bg-accent/8 peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                            >
                                {option.name}
                                {/*
                                 * Inherits the chip's colour rather than being
                                 * dimmed: `peer-checked:` compiles to a sibling
                                 * combinator and would not reach a descendant
                                 * of the label anyway, and a count is
                                 * information, not chrome.
                                 */}
                                {option.count !== null && (
                                    <span className="tabular-nums">{option.count}</span>
                                )}
                            </label>
                        </li>
                    ))}
                </ul>
            </fieldset>
        </>
    );
}
