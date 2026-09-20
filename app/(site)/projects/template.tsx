/**
 * The /projects-level half of the page transition (docs/uiux.md §3.3).
 *
 * app/template.tsx is keyed on the first path segment, so it does not remount
 * for /projects → /projects/[slug] or for the prev/next pager stepping between
 * two projects — the two most common navigations on the site. This template is
 * keyed one level deeper and catches exactly those.
 *
 * Search params never remount a template, so the /projects filter, search and
 * sort links do not replay the animation. That is the correct behaviour: they
 * refine a list in place, they are not a page change.
 *
 * On / → /projects both templates mount at once and their animations compose.
 * The result is a 16px rise rather than 8px over the same duration and curve,
 * which is not worth a rule to suppress.
 */
export default function ProjectsTemplate({ children }: { children: React.ReactNode }) {
    return <div className="bp-page-enter">{children}</div>;
}
