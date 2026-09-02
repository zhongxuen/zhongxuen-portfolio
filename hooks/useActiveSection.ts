"use client";

import { useEffect, useState } from "react";

/**
 * Reports which section currently owns the top of the viewport, for the
 * navbar's active-item indicator (docs/uiux.md §4.1).
 *
 * The observer band is a thin horizontal slice just below the navbar rather
 * than the whole viewport, so "active" means the section being read, not any
 * section partly on screen — with several short sections visible at once,
 * whole-viewport intersection flickers between them.
 *
 * @param ids     Section element ids, in document order. Must be a stable
 *                reference (module scope or memoized) — it is an effect dep.
 * @param enabled Set false on routes that have no in-page sections.
 */
export function useActiveSection(ids: readonly string[], enabled = true): string | null {
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || ids.length === 0) return;

        const visible = new Set<string>();

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        visible.add(entry.target.id);
                    } else {
                        visible.delete(entry.target.id);
                    }
                }

                // First in document order wins, so scrolling down advances the
                // indicator only once the next section reaches the band.
                setActiveId(ids.find((id) => visible.has(id)) ?? null);
            },
            { rootMargin: "-25% 0px -70% 0px", threshold: 0 }
        );

        const elements = ids
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null);

        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [ids, enabled]);

    // Gated on the way out rather than cleared inside the effect: when the
    // hook is disabled there is no active section by definition, and writing
    // that back into state would just be a render the caller does not need.
    return enabled ? activeId : null;
}
