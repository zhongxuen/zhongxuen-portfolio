import { Education } from "@/types/education";

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
        /*
         * Still "Present" as of September 2026, and deliberately so. Coursework
         * and examinations are done; the industrial placement at TED Optimus
         * (data/experience.ts) is the last outstanding component, so the award
         * is not conferred until its results are in. Recording a graduation
         * date now would be a credential claim ahead of the credential.
         */
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
