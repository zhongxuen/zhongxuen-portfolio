import { Experience } from "@/types/experience";

export const experience: Experience[] = [
    {
        id: "ted-optimus-frontend-intern-2026",
        role: "Frontend Web Developer Intern",
        company: "TED Optimus Sdn Bhd",
        location: "Taman Maluri, Cheras, Kuala Lumpur, Malaysia",
        employmentType: "Internship",
        startDate: "2026-07-20",
        /*
         * "Present", not the 2026-10-23 contract end. ExperienceSection derives
         * `current` from this field alone — a fixed end date, even one in the
         * future, is read as an ended role, which is what made the site show an
         * internship that is still running as finished history.
         */
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
