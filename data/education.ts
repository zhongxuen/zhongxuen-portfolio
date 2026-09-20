import { Education } from "@/types/education";

/**
 * Education history — components/sections/EducationSection.tsx and the résumé.
 *
 * **On the diploma's "Present".** Coursework and examinations are complete; the
 * industrial placement recorded in data/experience.ts is the last outstanding
 * component, and the award is not conferred until its results are in. Recording
 * a graduation date before then would be a credential claim ahead of the
 * credential, so the entry stays open and its `description` says exactly where
 * it stands. Close it when the award is actually issued, not when the work ends.
 *
 * **Non-Latin characters.** `institution` may hold them — the Kuen Cheng entry
 * carries the school's name in Chinese — but the résumé's embedded fonts cannot
 * draw them, so lib/resume/model.ts strips anything outside Latin and general
 * punctuation before rendering. The site shows the full name; the PDF does not.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one. Put notes in this header instead.
 */
export const education: Education[] = [
    {
        id: "apu-diploma-ict-swe",
        degree: "Diploma in Information & Communication Technology (Software Engineering)",
        institution: "Asia Pacific University (APU)",
        institutionUrl: "https://www.apu.edu.my",
        location: "Kuala Lumpur, Malaysia",
        startDate: "2024-01-01",
        endDate: "Present",
        gpa: "3.72",
        relevantCourses: [
            "Programming Fundamentals",
            "UI/UX Design",
            "Networking",
            "Database Systems",
            "Software Engineering Principles",
        ],
        honors: ["Distinction (Grade A) — CGPA 3.72 across 5 completed semesters"],
        description:
            "Coursework and examinations complete. The final requirement is the industrial placement now underway; the award is conferred once its results are released.",
        featured: true,
    },
    {
        id: "kuen-cheng-spm",
        degree: "SPM (Sijil Pelajaran Malaysia)",
        institution: "Kuen Cheng High School (坤成中学)",
        location: "Kuala Lumpur, Malaysia",
        startDate: "2019-01-01",
        endDate: "2023-12-01",
        honors: [
            "5A, 5B, 1C+",
            "English (A+)",
            "Mathematics (A+)",
            "Additional Mathematics (A-)",
            "Physics (A-)",
            "Moral (A)",
        ],
        description: "Completed 2023.",
        featured: false,
    },
];
