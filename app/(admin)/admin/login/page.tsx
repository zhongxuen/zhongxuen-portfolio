import { redirect } from "next/navigation";
import { readSession } from "@/lib/admin/dal";
import { LoginForm } from "@/components/admin/LoginForm";
import { Monogram } from "@/components/ui/Monogram";

/**
 * The console's only unauthenticated page.
 *
 * `verifySession()` is deliberately *not* called here — it would redirect to
 * this page and loop. `readSession()` is the non-enforcing read, used for the
 * opposite check: someone already signed in has no business on a login form, so
 * they are sent to the dashboard.
 *
 * No nav rail and no `AdminShell`: there is nowhere to navigate to yet.
 */
export default async function LoginPage() {
    if (await readSession()) {
        redirect("/admin");
    }

    return (
        <div className="flex min-h-svh items-center justify-center bg-void px-5 py-16">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex flex-col items-start gap-3">
                    <Monogram size={28} />
                    <div>
                        <p className="bp-meta text-accent">Restricted</p>
                        <h1 className="mt-1.5 font-display text-h3 font-bold text-ink">
                            Portfolio console
                        </h1>
                    </div>
                </div>

                <LoginForm />

                <p className="mt-6 text-xs leading-relaxed text-ink-muted">
                    Every change made here is committed to the repository under your name and
                    published by the next deploy. There is no draft mode.
                </p>
            </div>
        </div>
    );
}
