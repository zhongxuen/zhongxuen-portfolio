"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { GitCommitHorizontal, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Sticky save bar for the admin forms (docs/admin-plan.md §13).
 *
 * Two jobs, both about not surprising the operator:
 *
 * 1. **Dirty tracking.** Save is disabled until something in the form actually
 *    changes, so the button's enabled state is the answer to "is there anything
 *    to save". It listens for `input` and `change` on the owning form rather
 *    than controlling every field — the fields are uncontrolled by design, and
 *    lifting all of them into state to colour one button would be the tail
 *    wagging the dog. `ListField`'s add/remove/reorder bubble a `change` too.
 *
 * 2. **Saying what the button does.** Every save is a commit to `main` and a
 *    rebuild, so the bar says so in a line beside the button. The weight of the
 *    action should never be a surprise discovered from the git log.
 *
 * `useFormStatus` must be called from a component *inside* the `<form>`, which
 * is why this is its own component rather than markup in the page.
 */
export function SaveBar({
    label = "Save",
    /** What the commit will do, in a few words: "commits data/projects.ts". */
    note,
    /** Extra controls — a delete button, a "Preview" button — rendered left of Save. */
    children,
}: {
    label?: string;
    note: string;
    children?: React.ReactNode;
}) {
    const { pending } = useFormStatus();
    const [dirty, setDirty] = useState(false);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const form = anchor?.closest("form");

        if (!form) {
            return;
        }

        const markDirty = () => setDirty(true);

        form.addEventListener("input", markDirty);
        form.addEventListener("change", markDirty);

        return () => {
            form.removeEventListener("input", markDirty);
            form.removeEventListener("change", markDirty);
        };
    }, [anchor]);

    /*
     * A pending submit means the form was dirty; keeping `dirty` true through
     * the round trip stops the button flickering to disabled mid-save.
     */
    const canSave = dirty || pending;

    return (
        <div
            ref={setAnchor}
            className="sticky bottom-0 z-sticky -mx-4 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-void/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
        >
            <p className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                <GitCommitHorizontal size={14} aria-hidden="true" className="shrink-0" />
                {note}
            </p>

            <div className="flex flex-wrap items-center gap-2">
                {children}

                <Button type="submit" variant="primary" size="md" disabled={!canSave || pending}>
                    {pending ? (
                        <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
                    ) : (
                        <Save size={16} aria-hidden="true" />
                    )}
                    {pending ? "Committing…" : label}
                </Button>
            </div>
        </div>
    );
}
