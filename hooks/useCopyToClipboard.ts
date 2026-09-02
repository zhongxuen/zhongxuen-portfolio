"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "error";

export interface UseCopyToClipboard {
    status: CopyStatus;
    copy: (value: string) => Promise<void>;
}

/**
 * Copies a string and reports whether it worked.
 *
 * `navigator.clipboard` is only defined in a secure context, which the site is
 * in production but is not over plain http on a LAN address — a real case when
 * someone opens the dev server from their phone. The fallback is the old
 * `execCommand` route: deprecated, but it is the only thing that works there,
 * and its absence is exactly what makes a copy button look broken.
 *
 * Failure is a reported state rather than a swallowed exception, because every
 * caller renders the value as selectable text anyway — a visitor whose browser
 * blocks both paths can still copy by hand, but only if the button admits it
 * did nothing.
 */
export function useCopyToClipboard(resetAfterMs = 2000): UseCopyToClipboard {
    const [status, setStatus] = useState<CopyStatus>("idle");
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // A copy on an unmounting component must not set state afterwards, and a
    // second copy must restart the window rather than inherit the first's.
    useEffect(() => () => clearTimeout(timerRef.current), []);

    const copy = useCallback(
        async (value: string) => {
            let ok = false;

            if (navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(value);
                    ok = true;
                } catch {
                    ok = false;
                }
            }

            if (!ok) {
                ok = copyViaExecCommand(value);
            }

            clearTimeout(timerRef.current);
            setStatus(ok ? "copied" : "error");
            timerRef.current = setTimeout(() => setStatus("idle"), resetAfterMs);
        },
        [resetAfterMs],
    );

    return { status, copy };
}

/**
 * Insecure-context fallback. The textarea is positioned off-screen rather than
 * hidden with `display: none` — a non-rendered element cannot be selected, so
 * the copy would silently do nothing. `readOnly` keeps a mobile keyboard from
 * appearing during the round trip.
 */
function copyViaExecCommand(value: string): boolean {
    if (typeof document === "undefined") {
        return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    try {
        textarea.select();
        return document.execCommand("copy");
    } catch {
        return false;
    } finally {
        textarea.remove();
    }
}
