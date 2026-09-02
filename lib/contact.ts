/**
 * Shared contract for the contact form.
 *
 * Deliberately free of server-only code: the client component imports the
 * limits (to set `maxLength`) and the state shape, so anything added here
 * ships to the browser. Validation, the API key and the Resend call live in
 * `app/actions/contact.ts` and must stay there.
 */

/**
 * Single source of truth for field bounds. The client uses `max` for the
 * native `maxLength` attribute (a courtesy, trivially bypassed); the Server
 * Action re-checks every bound because the action is a public POST endpoint.
 */
export const CONTACT_LIMITS = {
    name: { min: 2, max: 80 },
    email: { min: 3, max: 254 },
    subject: { min: 3, max: 120 },
    message: { min: 10, max: 2000 },
} as const;

export type ContactField = keyof typeof CONTACT_LIMITS;

export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export type ContactValues = Record<ContactField, string>;

/**
 * `fallback` is not a failure: the submission validated but RESEND_API_KEY is
 * absent, so the action returns a prepared `mailto:` URL instead of sending.
 * It has to be a returned link rather than a navigation because a Server
 * Action runs on the server and cannot open the visitor's mail client — only
 * a click can. That is also why it is an offer, not an automatic redirect.
 */
export type ContactStatus = "idle" | "success" | "error" | "fallback";

export interface ContactFormState {
    status: ContactStatus;
    /** Human-readable result, announced in the form's aria-live region. Empty while idle. */
    message: string;
    /** Per-field messages rendered beside the offending input. */
    errors: ContactFieldErrors;
    /**
     * The submitted values, echoed back. React resets an uncontrolled form
     * once its action settles, so without this a rejected submission would
     * wipe everything the visitor typed. Bound to `defaultValue` on each
     * control; success returns blanks, which clears the form for free.
     */
    values: ContactValues;
    /** Prepared `mailto:` URL. Only set when `status` is "fallback". */
    mailto?: string;
}

export const EMPTY_CONTACT_VALUES: ContactValues = {
    name: "",
    email: "",
    subject: "",
    message: "",
};

export const INITIAL_CONTACT_STATE: ContactFormState = {
    status: "idle",
    message: "",
    errors: {},
    values: EMPTY_CONTACT_VALUES,
};

/**
 * Name of the honeypot input. It is positioned off-screen and pulled out of
 * the tab order, so any request that arrives with it filled came from a bot
 * that submitted every field it found.
 */
export const HONEYPOT_FIELD = "company";
