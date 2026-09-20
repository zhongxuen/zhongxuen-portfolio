import { describe, expect, it } from "vitest";
import {
    PRESENT,
    parseCertificationsForm,
    parseEducationForm,
    parseExperienceForm,
    parseRows,
    parseSkillsForm,
    validateCertifications,
    validateEducation,
    validateExperience,
    validateSkills,
} from "@/lib/admin/careerForm";

/**
 * The career forms' row encoding and validation.
 *
 * The encoding is the interesting half. These editors hold many entries per
 * form and three of the four have nested lists of their own, which flat parallel
 * arrays cannot express — "row 2 has four responsibilities and row 3 has none"
 * has no recoverable boundary once the lists run together. So each row posts an
 * opaque key and every field is named `field:key`.
 *
 * The property that matters, and that these tests pin, is that a row removed
 * from the middle cannot shift another row's values onto it.
 */

/** Builds a FormData the way the panels do: `row` per row, then `field:key` per field. */
function form(rows: Record<string, string | string[]>[]): FormData {
    const data = new FormData();

    rows.forEach((row, index) => {
        const key = `r${index}`;
        data.append("row", key);

        for (const [field, value] of Object.entries(row)) {
            for (const item of Array.isArray(value) ? value : [value]) {
                data.append(`${field}:${key}`, item);
            }
        }
    });

    return data;
}

describe("parseRows", () => {
    it("reads rows in posted order, which is DOM order", () => {
        const data = new FormData();
        data.append("row", "b");
        data.append("row", "a");
        data.append("name:a", "Alice");
        data.append("name:b", "Bob");

        expect(parseRows(data).map((row) => row.text("name"))).toEqual(["Bob", "Alice"]);
    });

    /*
     * The failure the encoding exists to prevent. With parallel arrays, removing
     * the middle row would slide row 3's list into row 2. Here each row's fields
     * are addressed by its own key, so a gap is simply a gap.
     */
    it("keeps each row's nested list with its own row", () => {
        const rows = parseRows(
            form([
                { role: "First", items: ["a", "b", "c"] },
                { role: "Second" },
                { role: "Third", items: ["z"] },
            ]),
        );

        expect(rows.map((row) => row.list("items"))).toEqual([["a", "b", "c"], [], ["z"]]);
    });

    it("drops blank entries from a list rather than saving them", () => {
        expect(parseRows(form([{ items: ["a", "   ", "", "b"] }]))[0].list("items")).toEqual([
            "a",
            "b",
        ]);
    });

    /*
     * Cannot happen from the panels, which generate keys from a useId seed and a
     * counter — so a duplicate means a hand-crafted or replayed post. Merging two
     * rows that claim one key would silently combine two entries into one.
     */
    it("drops a duplicate or empty row key instead of merging", () => {
        const data = new FormData();
        data.append("row", "a");
        data.append("row", "a");
        data.append("row", "");
        data.append("name:a", "Once");

        expect(parseRows(data)).toHaveLength(1);
    });
});

describe("parseExperienceForm", () => {
    it("omits optional fields that were left blank", () => {
        const [entry] = parseExperienceForm(
            form([
                {
                    id: "x",
                    role: "Dev",
                    company: "Co",
                    startDate: "2026-01-01",
                    description: "Did things.",
                    companyUrl: "",
                    location: "  ",
                },
            ]),
        );

        expect(entry).not.toHaveProperty("companyUrl");
        expect(entry).not.toHaveProperty("location");
    });

    /*
     * The checkbox wins over the date input. A row can carry a stale date from
     * before it was marked current, and the two disagreeing is exactly the bug
     * the sentinel exists to prevent — ExperienceSection derives "current" from
     * this string alone, so a real future date renders as finished history.
     */
    it('writes "Present" when the current box is ticked, ignoring a stale date', () => {
        const [entry] = parseExperienceForm(
            form([
                {
                    id: "x",
                    role: "Dev",
                    company: "Co",
                    startDate: "2026-01-01",
                    description: "d",
                    endDate: "2026-06-01",
                    current: "on",
                },
            ]),
        );

        expect(entry.endDate).toBe(PRESENT);
    });

    it("omits endDate entirely when neither the box nor the date is set", () => {
        const [entry] = parseExperienceForm(
            form([
                { id: "x", role: "Dev", company: "Co", startDate: "2026-01-01", description: "d" },
            ]),
        );

        expect(entry).not.toHaveProperty("endDate");
    });

    /** The union is restated as an options list; anything outside it is dropped, not coerced. */
    it("ignores an employmentType outside the union", () => {
        const [entry] = parseExperienceForm(
            form([
                {
                    id: "x",
                    role: "Dev",
                    company: "Co",
                    startDate: "2026-01-01",
                    description: "d",
                    employmentType: "Volunteer",
                },
            ]),
        );

        expect(entry).not.toHaveProperty("employmentType");
    });
});

describe("validateExperience", () => {
    const valid = {
        id: "x",
        role: "Dev",
        company: "Co",
        startDate: "2026-01-01",
        description: "Did things.",
    };

    it("accepts a complete entry", () => {
        expect(validateExperience([{ ...valid }]).errors).toEqual({});
    });

    /*
     * The one that matters most and is invisible in a form: every component keys
     * its list on `id`, so two rows sharing one make React reuse a DOM node
     * across two different entries — one entry's text appearing inside another's
     * card, on the live site, with no error anywhere.
     */
    it("rejects a duplicate id, naming the row", () => {
        const { errors } = validateExperience([{ ...valid }, { ...valid, role: "Other" }]);

        expect(errors["1.id"]).toMatch(/already uses this id/);
    });

    it("rejects an id that is not lowercase-hyphenated", () => {
        expect(validateExperience([{ ...valid, id: "Not An Id" }]).errors["0.id"]).toBeTruthy();
    });

    it("rejects an end date before the start date", () => {
        const { errors } = validateExperience([{ ...valid, endDate: "2025-01-01" }]);

        expect(errors["0.endDate"]).toMatch(/before the start date/);
    });

    it('accepts "Present" as an end date', () => {
        expect(validateExperience([{ ...valid, endDate: PRESENT }]).errors).toEqual({});
    });

    it("rejects a date that looks real but is not", () => {
        expect(
            validateExperience([{ ...valid, startDate: "2026-02-31" }]).errors["0.startDate"],
        ).toBeTruthy();
    });

    it("rejects a relative company URL", () => {
        expect(
            validateExperience([{ ...valid, companyUrl: "example.com" }]).errors["0.companyUrl"],
        ).toMatch(/absolute http/);
    });

    it("warns, without blocking, about more than one current role", () => {
        const { errors, warnings } = validateExperience([
            { ...valid, endDate: PRESENT },
            { ...valid, id: "y", endDate: PRESENT },
        ]);

        expect(errors).toEqual({});
        expect(warnings.join(" ")).toMatch(/more than one role is marked current/i);
    });
});

describe("validateEducation", () => {
    const valid = { id: "x", degree: "Diploma", institution: "APU", startDate: "2024-01-01" };

    it("accepts a complete entry", () => {
        expect(validateEducation([valid]).errors).toEqual({});
    });

    /*
     * Worth saying at the point of entry rather than leaving it to be discovered
     * by reading the PDF, which is how it was found the first time (§16.3): the
     * résumé's embedded fonts render these as .notdef boxes, so the model strips
     * them.
     */
    it("warns that the résumé cannot draw non-Latin characters", () => {
        const { errors, warnings } = validateEducation([
            { ...valid, institution: "Kuen Cheng High School (坤成中学)" },
        ]);

        expect(errors).toEqual({});
        expect(warnings.join(" ")).toMatch(/cannot draw/);
    });
});

describe("validateSkills", () => {
    const valid = { id: "ts", name: "TypeScript", category: "Frameworks" as const, icon: "ts" };

    it("accepts a complete entry", () => {
        expect(validateSkills([valid]).errors).toEqual({});
    });

    /** A category outside the union is a build error, so it must never reach a commit. */
    it("rejects a category outside the union", () => {
        const { errors } = validateSkills([
            { ...valid, category: "Vibes" as unknown as typeof valid.category },
        ]);

        expect(errors["0.category"]).toMatch(/union in types\/skill\.ts/);
    });
});

describe("validateCertifications", () => {
    const valid = { id: "c", name: "CCNA", issuer: "Cisco", date: "2026-01-01" };

    it("accepts a complete entry", () => {
        expect(validateCertifications([valid]).errors).toEqual({});
    });

    it("requires a real award date", () => {
        expect(validateCertifications([{ ...valid, date: "soon" }]).errors["0.date"]).toBeTruthy();
    });

    it("parses an omitted credential URL as absent, not empty", () => {
        const [entry] = parseCertificationsForm(
            form([
                { id: "c", name: "CCNA", issuer: "Cisco", date: "2026-01-01", credentialUrl: "" },
            ]),
        );

        expect(entry).not.toHaveProperty("credentialUrl");
    });
});

describe("parseEducationForm and parseSkillsForm", () => {
    it("carry their nested lists per row", () => {
        const [first, second] = parseEducationForm(
            form([
                {
                    id: "a",
                    degree: "D",
                    institution: "I",
                    startDate: "2024-01-01",
                    honors: ["one"],
                },
                {
                    id: "b",
                    degree: "E",
                    institution: "J",
                    startDate: "2020-01-01",
                    relevantCourses: ["x", "y"],
                },
            ]),
        );

        expect(first.honors).toEqual(["one"]);
        expect(first).not.toHaveProperty("relevantCourses");
        expect(second.relevantCourses).toEqual(["x", "y"]);
    });

    it("reads a skill's featured checkbox", () => {
        const [on, off] = parseSkillsForm(
            form([
                { id: "a", name: "A", category: "Frameworks", icon: "i", featured: "on" },
                { id: "b", name: "B", category: "Frameworks", icon: "i" },
            ]),
        );

        expect(on.featured).toBe(true);
        expect(off.featured).toBe(false);
    });
});
