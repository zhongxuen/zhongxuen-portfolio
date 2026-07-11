import { Experience } from "@/types/experience";

export const experience: Experience[] = [
    {
        id: "tuition-teacher-2024",
        role: "Part-Time Tuition Teacher",
        company: "Little Master Education Holdings",
        location: "https://littlemaster.com.my/",
        employmentType: "Part-time",
        startDate: "2024-01-01",
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