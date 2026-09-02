import { describe, expect, it } from "vitest";
import {
    formatDateRange,
    formatMonthYear,
    slugify,
    sortByStartDateDesc,
    toTelHref,
    truncate,
} from "@/lib/utils";

/*
 * Date-only strings ("2024-06-01") are parsed as UTC midnight but formatted in
 * the ambient timezone, so these assertions depend on TZ=UTC being pinned in
 * vitest.config.ts. Without it the same input renders "May 2024" west of
 * Greenwich.
 */

describe("formatMonthYear", () => {
    it("renders an ISO date as a short month + year label", () => {
        expect(formatMonthYear("2024-06-01")).toBe("Jun 2024");
    });

    it("handles the first and last month of a year", () => {
        expect(formatMonthYear("2023-01-15")).toBe("Jan 2023");
        expect(formatMonthYear("2023-12-31")).toBe("Dec 2023");
    });

    it("accepts a full ISO timestamp, not just a date", () => {
        expect(formatMonthYear("2025-03-09T14:32:00Z")).toBe("Mar 2025");
    });

    it("passes an unparseable value straight through", () => {
        expect(formatMonthYear("Present")).toBe("Present");
        expect(formatMonthYear("not a date")).toBe("not a date");
        expect(formatMonthYear("")).toBe("");
    });
});

describe("formatDateRange", () => {
    it("joins start and end with an en dash", () => {
        expect(formatDateRange("2024-06-01", "2025-01-01")).toBe("Jun 2024 – Jan 2025");
    });

    it("keeps the literal 'Present' end date instead of parsing it", () => {
        expect(formatDateRange("2024-06-01", "Present")).toBe("Jun 2024 – Present");
    });

    it("returns only the start when no end date is given", () => {
        expect(formatDateRange("2024-06-01")).toBe("Jun 2024");
        expect(formatDateRange("2024-06-01", undefined)).toBe("Jun 2024");
    });

    it("passes an invalid start through while still formatting the end", () => {
        expect(formatDateRange("TBC", "2025-01-01")).toBe("TBC – Jan 2025");
    });
});

describe("slugify", () => {
    it("lowercases and hyphenates whitespace", () => {
        expect(slugify("Portfolio Website")).toBe("portfolio-website");
    });

    it("strips characters that are not alphanumeric, space or hyphen", () => {
        expect(slugify("Next.js & TypeScript!")).toBe("nextjs-typescript");
    });

    it("collapses runs of whitespace and hyphens into one hyphen", () => {
        expect(slugify("IT   ticket --- helpdesk")).toBe("it-ticket-helpdesk");
    });

    it("trims surrounding whitespace rather than emitting edge hyphens", () => {
        expect(slugify("  Spaced Out  ")).toBe("spaced-out");
    });

    it("produces a URL-safe result", () => {
        const slug = slugify("Café — Résumé (2024)");

        expect(slug).toBe(encodeURIComponent(slug));
    });
});

describe("truncate", () => {
    it("returns short text untouched", () => {
        expect(truncate("short", 10)).toBe("short");
    });

    it("returns text of exactly maxLength untouched", () => {
        expect(truncate("exactly10!", 10)).toBe("exactly10!");
    });

    it("cuts to maxLength and appends an ellipsis", () => {
        expect(truncate("abcdefghijkl", 5)).toBe("abcde…");
    });

    it("does not leave a dangling space before the ellipsis", () => {
        expect(truncate("abcde fghij", 6)).toBe("abcde…");
    });
});

describe("sortByStartDateDesc", () => {
    const entries = [
        { id: "middle", startDate: "2023-05-01" },
        { id: "oldest", startDate: "2021-01-01" },
        { id: "newest", startDate: "2025-09-01" },
    ];

    it("orders entries most recent first", () => {
        expect(sortByStartDateDesc(entries).map((entry) => entry.id)).toEqual([
            "newest",
            "middle",
            "oldest",
        ]);
    });

    it("does not mutate the input array", () => {
        const input = [...entries];

        sortByStartDateDesc(input);

        expect(input.map((entry) => entry.id)).toEqual(["middle", "oldest", "newest"]);
    });

    it("handles empty and single-entry lists", () => {
        expect(sortByStartDateDesc([])).toEqual([]);
        expect(sortByStartDateDesc([entries[0]])).toEqual([entries[0]]);
    });
});

describe("toTelHref", () => {
    it("strips the display formatting out of a real number", () => {
        expect(toTelHref("+60 10-772 2127")).toBe("tel:+60107722127");
    });

    it("keeps a leading + but drops one appearing anywhere else", () => {
        expect(toTelHref("012 345 6789")).toBe("tel:0123456789");
        expect(toTelHref("012+345")).toBe("tel:012345");
    });

    it("tolerates surrounding whitespace around the international prefix", () => {
        expect(toTelHref("  +1 (555) 010-4477")).toBe("tel:+15550104477");
    });

    it("returns undefined when there is nothing dialable, so callers render text", () => {
        expect(toTelHref("")).toBeUndefined();
        expect(toTelHref("on request")).toBeUndefined();
    });
});
