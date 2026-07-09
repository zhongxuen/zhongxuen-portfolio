/**
 * Represents a single education entry (degree, institution).
 *
 * Used by:
 * - data/education.ts (static education entries)
 * - components/sections/EducationSection.tsx
 */

export interface Education {
    /** Unique identifier, e.g. "state-university-bs-cs" */
    id: string;

    /** Degree/program name, e.g. "B.S. in Computer Science" */
    degree: string;

    /** Institution name */
    institution: string;

    /** Institution website URL, if available */
    institutionUrl?: string;

    /** Path to institution logo in public/images/logos */
    logo?: string;

    /** Location, e.g. "Boston, MA" */
    location?: string;

    /** Start date, ISO format (e.g. "2021-09-01") */
    startDate: string;

    /** End date, ISO format. Omit or use "Present" if ongoing */
    endDate?: string | "Present";

    /** GPA, if the user wants to display it */
    gpa?: string;

    /** Relevant coursework */
    relevantCourses?: string[];

    /** Honors, awards, or distinctions tied to this education entry */
    honors?: string[];

    /** Short description or notes */
    description?: string;

    /** Whether this entry should be highlighted */
    featured?: boolean;
}