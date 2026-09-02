"use server";

import { headers } from "next/headers";
import { AUTHOR, SITE_NAME, SITE_URL } from "@/lib/constants";
import {
    CONTACT_LIMITS,
    EMPTY_CONTACT_VALUES,
    HONEYPOT_FIELD,
    type ContactField,
    type ContactFieldErrors,
    type ContactFormState,
    type ContactValues,
} from "@/lib/contact";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Contact form Server Action.
 *
 * This runs as a POST against the page that renders the form, reachable by
 * anyone who can replay the request — so it re-validates everything the browser
 * already checked and never trusts a value it did not derive itself (see
 * `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, "Security").
 * The recipient is always AUTHOR.email; the submitter supplies only the body
 * and a reply-to.
 *
 * Note: docs/uiux.md §4.8 sketched this as a Route Handler at
 * `app/api/contact/route.ts` with the client doing its own fetch. A Server
 * Action is used instead — it drops the hand-rolled fetch/JSON layer, pairs
 * directly with `useActionState` for pending and error state, and still submits
 * without JavaScript. Everything that section asked for (server-side
 * validation, honeypot, per-IP limit, non-public API key, visible mailto
 * fallback) is unchanged.
 */

/** Deliberately generous — this is anti-spam, not anti-abuse. See lib/rateLimit.ts. */
const RATE_LIMIT = {
    max: 5,
    windowMs: 10 * 60 * 1000,
};

/**
 * Pragmatic format check: a non-empty local part, an "@", and a dotted domain
 * with no whitespace anywhere. Nothing short of sending mail proves an address
 * is real, so this only catches typos and rejects the control characters that
 * could otherwise reach a header. Anything stricter starts rejecting valid
 * addresses.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Cap the upstream call so a hung request cannot leave the form spinning. */
const SEND_TIMEOUT_MS = 10_000;

export async function submitContactForm(
    _previousState: ContactFormState,
    formData: FormData,
): Promise<ContactFormState> {
    const values = readValues(formData);

    // Honeypot first, so a bot never learns which fields failed validation. It
    // gets the same success state a human would, and nothing is sent.
    if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
        console.warn("[contact] honeypot triggered; discarding submission");
        return success();
    }

    const errors = validate(values);

    if (Object.keys(errors).length > 0) {
        return {
            status: "error",
            message: "Please fix the highlighted fields and try again.",
            errors,
            values,
        };
    }

    // Checked after validation on purpose: someone fumbling the email format
    // three times should not burn their quota, and an invalid submission costs
    // nothing to reject. The limit guards the send, which is the expensive part.
    const limit = rateLimit(`contact:${await clientIp()}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);

    if (!limit.ok) {
        const minutes = Math.ceil(limit.retryAfter / 60);

        return {
            status: "error",
            message: `Too many messages from this connection. Please try again in about ${minutes} minute${
                minutes === 1 ? "" : "s"
            }, or email me directly at ${AUTHOR.email}.`,
            errors: {},
            values,
        };
    }

    const apiKey = process.env.RESEND_API_KEY;

    // No key configured (local dev, or a deploy where the secret is unset):
    // degrade to the old mailto behaviour instead of throwing. What the visitor
    // typed is already composed into the link, so nothing is lost.
    if (!apiKey) {
        return {
            status: "fallback",
            message:
                "Email delivery isn't configured on this deployment, so nothing was sent. Your message is ready in the link below — it opens your mail app with everything filled in.",
            errors: {},
            values,
            mailto: buildMailto(values),
        };
    }

    try {
        await sendViaResend(apiKey, values);
    } catch (error) {
        // Log the real reason server-side, return something generic. Action
        // return values are serialized to the client, so they must not carry
        // provider responses or anything about key state.
        console.error("[contact] send failed", error);

        return {
            status: "error",
            message: `Something went wrong sending your message. Please try again, or email me directly at ${AUTHOR.email}.`,
            errors: {},
            values,
        };
    }

    return success();
}

/** Blank values clear the form: React resets it to `defaultValue` once the action settles. */
function success(): ContactFormState {
    return {
        status: "success",
        message: "Thanks — your message is on its way. I'll reply by email soon.",
        errors: {},
        values: EMPTY_CONTACT_VALUES,
    };
}

function readValues(formData: FormData): ContactValues {
    const read = (field: ContactField) => String(formData.get(field) ?? "").trim();

    return {
        name: read("name"),
        email: read("email"),
        subject: read("subject"),
        message: read("message"),
    };
}

function validate(values: ContactValues): ContactFieldErrors {
    const errors: ContactFieldErrors = {};

    if (values.name.length < CONTACT_LIMITS.name.min) {
        errors.name = "Please enter your name.";
    } else if (values.name.length > CONTACT_LIMITS.name.max) {
        errors.name = `Name must be ${CONTACT_LIMITS.name.max} characters or fewer.`;
    }

    if (values.email.length === 0) {
        errors.email = "Please enter your email address.";
    } else if (values.email.length > CONTACT_LIMITS.email.max) {
        errors.email = `Email must be ${CONTACT_LIMITS.email.max} characters or fewer.`;
    } else if (!EMAIL_PATTERN.test(values.email)) {
        errors.email = "That doesn't look like a valid email address.";
    }

    if (values.subject.length < CONTACT_LIMITS.subject.min) {
        errors.subject = "Please add a short subject.";
    } else if (values.subject.length > CONTACT_LIMITS.subject.max) {
        errors.subject = `Subject must be ${CONTACT_LIMITS.subject.max} characters or fewer.`;
    }

    if (values.message.length < CONTACT_LIMITS.message.min) {
        errors.message = `Please write at least ${CONTACT_LIMITS.message.min} characters so I know what you need.`;
    } else if (values.message.length > CONTACT_LIMITS.message.max) {
        errors.message = `Message must be ${CONTACT_LIMITS.message.max} characters or fewer.`;
    }

    return errors;
}

/**
 * Plain-text body. The subject is repeated inside the body on purpose: the
 * mailto fallback can lose the `subject` parameter (some clients drop it, and
 * the previous implementation never carried it into the text at all), so the
 * body has to stand on its own.
 */
function composeBody(values: ContactValues): string {
    return [
        `Name: ${values.name}`,
        `Email: ${values.email}`,
        `Subject: ${values.subject}`,
        "",
        values.message,
        "",
        "—",
        `Sent from the contact form at ${SITE_URL}`,
    ].join("\n");
}

function buildMailto(values: ContactValues): string {
    const params = new URLSearchParams({
        subject: values.subject,
        body: composeBody(values),
    });

    return `mailto:${AUTHOR.email}?${params.toString()}`;
}

async function sendViaResend(apiKey: string, values: ContactValues): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            /**
             * Resend requires a verified sender. `onboarding@resend.dev` is
             * Resend's shared testing sender: it needs no domain setup but only
             * delivers to the account owner's own address — which is exactly
             * who this form writes to. Set CONTACT_FROM_EMAIL once a domain is
             * verified.
             */
            from: process.env.CONTACT_FROM_EMAIL ?? `${SITE_NAME} <onboarding@resend.dev>`,
            to: [AUTHOR.email],
            /**
             * Replies go to the visitor rather than the sending identity. Safe
             * to take from input: this is a JSON API, not raw SMTP, and
             * EMAIL_PATTERN has already rejected whitespace and newlines.
             */
            reply_to: values.email,
            subject: `[Portfolio] ${values.subject}`,
            text: composeBody(values),
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
    }
}

/**
 * Best-effort client address for the rate-limit key. `x-forwarded-for` is
 * client-settable and only a proxy can be trusted to overwrite it, so on Vercel
 * the leftmost entry is the real caller; behind a different proxy it may not
 * be. Anything unidentifiable shares the "unknown" bucket — including all of
 * local dev, where these headers are absent.
 */
async function clientIp(): Promise<string> {
    const headerList = await headers();

    const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();

    return forwarded || headerList.get("x-real-ip")?.trim() || "unknown";
}
