"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
    const media = window.matchMedia(QUERY);

    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
    return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
    return false;
}

/**
 * `true` when the user has asked for reduced motion, `false` otherwise.
 *
 * This used to wrap Framer Motion's `useReducedMotion`, alongside a
 * `MotionProvider` that applied `reducedMotion="user"` site-wide (see
 * docs/uiux.md §11.1.1). Both are
 * gone: the entrance system is CSS now, and its hidden state is already scoped
 * to `prefers-reduced-motion: no-preference` (see app/globals.css), so the
 * policy is enforced by the stylesheet rather than by a provider at the root
 * of the tree.
 *
 * What is left is the handful of effects CSS genuinely cannot express — a
 * number counting up, a scroll readout — which have to ask in JS whether they
 * are allowed to run at all.
 *
 * A media query is an external store, so it is read with
 * `useSyncExternalStore` rather than mirrored into state from an effect: the
 * subscription is the same, but the value is correct on the very first client
 * render instead of arriving a render later. `getServerSnapshot` returns
 * `false` so the server markup and hydration still agree; React reconciles to
 * the real preference immediately afterwards if they differ.
 */
export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
