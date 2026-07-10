"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

/**
 * Temporary contact form.
 *
 * Current submission target:
 *     mailto:
 *
 * Future upgrade options:
 *     - Next.js API Route
 *     - Supabase
 *     - Email service (Resend / EmailJS / Formspree)
 *
 * Only this function should change when a backend is introduced.
 */
export function ContactForm() {
    const [form, setForm] = useState<ContactFormData>({
        name: "",
        email: "",
        subject: "",
        message: "",
    });

    function update<K extends keyof ContactFormData>(
        key: K,
        value: ContactFormData[K]
    ) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const body = `
Name: ${form.name}
Email: ${form.email}

${form.message}
`;

        window.location.href = `mailto:gohzx2006@gmail.com?subject=${encodeURIComponent(
            form.subject
        )}&body=${encodeURIComponent(body)}`;
    }

    return (
        <Card className="w-full">
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
            >
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="name"
                            className="text-sm font-medium"
                        >
                            Name
                        </label>

                        <input
                            id="name"
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) =>
                                update("name", e.target.value)
                            }
                            className="rounded-lg border border-muted/20 bg-background px-4 py-3 outline-none transition focus:border-primary"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="email"
                            className="text-sm font-medium"
                        >
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) =>
                                update("email", e.target.value)
                            }
                            className="rounded-lg border border-muted/20 bg-background px-4 py-3 outline-none transition focus:border-primary"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="subject"
                        className="text-sm font-medium"
                    >
                        Subject
                    </label>

                    <input
                        id="subject"
                        type="text"
                        required
                        value={form.subject}
                        onChange={(e) =>
                            update("subject", e.target.value)
                        }
                        className="rounded-lg border border-muted/20 bg-background px-4 py-3 outline-none transition focus:border-primary"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="message"
                        className="text-sm font-medium"
                    >
                        Message
                    </label>

                    <textarea
                        id="message"
                        rows={6}
                        required
                        value={form.message}
                        onChange={(e) =>
                            update("message", e.target.value)
                        }
                        className="resize-y rounded-lg border border-muted/20 bg-background px-4 py-3 outline-none transition focus:border-primary"
                    />
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="self-start"
                >
                    <Send size={18} />
                    Send Message
                </Button>
            </form>
        </Card>
    );
}