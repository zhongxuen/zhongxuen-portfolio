import { Experience } from "@/types/experience";

/**
 * Work history — the source for components/sections/ExperienceSection.tsx and,
 * through lib/resume/model.ts, for the generated résumé PDF.
 *
 * **"Present" is a value, not a placeholder.** ExperienceSection derives
 * `current` from `endDate` alone, so a fixed end date — even one in the future —
 * is read as an ended role. That is what once made the site show a running
 * internship as finished history. A role that is still running carries
 * "Present"; its real end date belongs in `description`, where it reads as
 * information rather than as a status.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one. Put notes in this header instead.
 */
export const experience: Experience[] = [
    {
        id: "ted-optimus-frontend-intern-2026",
        role: "Frontend Web Developer Intern",
        company: "TED Optimus Sdn Bhd",
        location: "Taman Maluri, Cheras, Kuala Lumpur, Malaysia",
        employmentType: "Internship",
        startDate: "2026-07-20",
        endDate: "Present",
        description:
            "Frontend Web Developer intern building user-facing features and reusable components, working hybrid. Placement runs to 23 October 2026.",
        responsibilities: [
            "Develop new user-facing features",
            "Build reusable code and libraries for future use",
            "Ensure the technical feasibility of UI/UX designs",
            "Optimize application for speed and scalability",
            "Assist with various ad hoc tasks as needed",
        ],
        featured: true,
    },
    {
        id: "tuition-teacher-2024",
        role: "Part-Time Tuition Teacher",
        company: "Little Master Education Holdings",
        companyUrl: "https://littlemaster.com.my/",
        location: "Selangor, Malaysia",
        employmentType: "Part-time",
        startDate: "2026-02-26",
        endDate: "Present",
        description:
            "Teach Malay, Chinese, and English subjects to students, creating tailored lesson plans and tracking progress.",
        responsibilities: [
            "Create lesson plans and adapt teaching materials to student needs",
            "Track student progress and communicate updates with parents",
            "Developed strong communication and presentation skills",
        ],
        featured: true,
    },
    {
        id: "pharmacy-assistant",
        role: "Pharmacy Assistant",
        company: "Family Pharmacy",
        location: "Selangor, Malaysia",
        employmentType: "Part-time",
        startDate: "2022-01-01",
        endDate: "2023-12-01",
        description:
            "Assisted customers with product inquiries and supported daily pharmacy operations.",
        responsibilities: [
            "Assisted customers with product inquiries",
            "Managed inventory and stock organization",
            "Supported cashier operations",
        ],
        featured: false,
    },
];
