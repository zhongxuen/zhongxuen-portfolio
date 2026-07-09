import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names safely, resolving conflicting utility
 * classes (e.g. "p-2 p-4" -> "p-4"). Use this anywhere conditional
 * or combined className strings are built.
 *
 * Requires: clsx, tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Formats an ISO date string (e.g. "2024-06-01") into a short
 * human-readable label (e.g. "Jun 2024"). Used by Experience and
 * Education cards for date ranges.
 */
export function formatMonthYear(isoDate: string): string {
    const date = new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
        return isoDate;
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

/**
 * Formats a start/end date pair into a single display range,
 * handling the "Present" end-date case used by Experience/Education types.
 *
 * Example: formatDateRange("2024-06-01", "Present") -> "Jun 2024 – Present"
 */
export function formatDateRange(
    startDate: string,
    endDate?: string | "Present"
): string {
    const start = formatMonthYear(startDate);

    if (!endDate) {
        return start;
    }

    const end = endDate === "Present" ? "Present" : formatMonthYear(endDate);

    return `${start} – ${end}`;
}

/**
 * Creates a URL-safe slug from a string (used as a fallback when
 * generating identifiers, e.g. for dynamically synced GitHub repos
 * that don't yet have a manually-assigned slug).
 */
export function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

/**
 * Truncates text to a maximum length, appending an ellipsis if cut.
 * Used for card descriptions that must respect fixed layout heights.
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength).trimEnd()}…`;
}