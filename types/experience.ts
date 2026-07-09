/**
 * Represents a single work experience entry (job, internship, or role).
 *
 * Used by:
 * - data/experience.ts (static experience entries)
 * - components/sections/ExperienceSection.tsx
 */

export interface Experience {
    /** Unique identifier, e.g. "acme-corp-swe-intern-2024" */
    id: string;

    /** Job title / role, e.g. "Software Engineer Intern" */
    role: string;

    /** Company or organization name */
    company: string;

    /** Company website or profile URL, if available */
    companyUrl?: string;

    /** Path to company logo in public/images/logos */
    logo?: string;

    /** Location, e.g. "Remote" or "San Francisco, CA" */
    location?: string;

    /** Employment type, kept as a union for consistent filtering/display */
    employmentType?: "Full-time" | "Part-time" | "Internship" | "Contract" | "Freelance";

    /** Start date, ISO format (e.g. "2024-06-01") */
    startDate: string;

    /** End date, ISO format. Omit or use "Present" for current roles */
    endDate?: string | "Present";

    /** Short summary of the role */
    description: string;

    /** Specific responsibilities or accomplishments, shown as bullet points */
    responsibilities?: string[];

    /** Technologies/tools used in this role */
    technologies?: string[];

    /** Whether this entry should be highlighted (e.g. most recent/relevant role) */
    featured?: boolean;
}