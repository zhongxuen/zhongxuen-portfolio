"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn, TriangleAlert } from "lucide-react";
import { login } from "@/app/(admin)/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlStyles } from "@/components/admin/Field";
import { INITIAL_LOGIN_STATE } from "@/types/admin";

/**
 * Credentials form, mirroring `components/forms/ContactForm.tsx` so there is one
 * form idiom in the codebase: a Server Action bound through `<form action>`,
 * `useActionState` for pending and error state, and therefore working with
 * JavaScript disabled.
 *
 * The error message is the same string for every rejection — wrong username,
 * wrong password, empty field. The action decides that; this component must not
 * add a field-level hint that would undo it.
 */
export function LoginForm() {
    const [state, formAction, pending] = useActionState(login, INITIAL_LOGIN_STATE);

    return (
        <Card>
            <form action={formAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="username" className="text-sm font-medium text-ink">
                        Username
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        autoFocus
                        defaultValue={state.username}
                        disabled={pending}
                        className={controlStyles}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-ink">
                        Password
                    </label>
                    {/*
                     * Never echoed back on a rejected attempt — see LoginState in
                     * types/admin.ts. `current-password` so a password manager
                     * fills it rather than offering to save a new one.
                     */}
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        disabled={pending}
                        className={controlStyles}
                    />
                </div>

                <Button type="submit" variant="primary" size="md" disabled={pending}>
                    {pending ? (
                        <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
                    ) : (
                        <LogIn size={16} aria-hidden="true" />
                    )}
                    {pending ? "Checking…" : "Sign in"}
                </Button>

                {/* Mounted at all times so the message is announced when it changes. */}
                <div role="status" aria-live="polite">
                    {state.status === "error" && (
                        <p className="flex items-start gap-2.5 rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-ink">
                            <TriangleAlert
                                size={16}
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-danger"
                            />
                            {state.message}
                        </p>
                    )}
                </div>
            </form>
        </Card>
    );
}
