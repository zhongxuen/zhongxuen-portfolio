/**
 * Route-change transition (docs/uiux.md §3.3): the incoming page fades in and
 * rises 8px.
 *
 * Why a template and not React's `<ViewTransition>`: the native path is the one
 * Next 16 documents (`experimental.viewTransition` +
 * node_modules/next/dist/docs/01-app/02-guides/view-transitions.md), but the
 * component comes from React, and the installed react@19.2.4 — stable, not
 * canary — does not export it. Adopting it means moving the whole app onto a
 * canary React, which is a far larger commitment than an 8px rise justifies.
 * A template re-mounts its subtree on navigation, so a plain CSS animation on
 * the wrapper does the same job with no runtime, no flag and no dependency —
 * the same trade the rest of the motion system made in §11.1.1.
 *
 * A template's key is its own segment level, so this one covers navigations
 * that change the first segment (/ ↔ /projects). app/projects/template.tsx
 * covers the deeper ones this cannot see.
 */
export default function Template({ children }: { children: React.ReactNode }) {
    return <div className="bp-page-enter">{children}</div>;
}
