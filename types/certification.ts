/**
 * Represents a single professional certification or credential.
 *
 * Used by:
 * - data/certifications.ts (static entries)
 * - components/sections/EducationSection.tsx (the certifications strip)
 */

export interface Certification {
    /** Unique identifier, e.g. "cisco-ccna-itn". */
    id: string;

    /** Credential name, e.g. "CCNA: Introduction to Networks". */
    name: string;

    /** Awarding body, e.g. "Cisco Networking Academy". */
    issuer: string;

    /** Award date, ISO format (e.g. "2025-06-01"). */
    date: string;

    /**
     * Public verification URL. Omit when the credential has no online record —
     * the strip then renders the entry as plain text rather than a dead link.
     */
    credentialUrl?: string;
}
