import { Education } from "@/types/education";

export const education: Education[] = [
    {
        id: "apu-diploma-ict-swe",
        degree: "Diploma in Information & Communication Technology (Software Engineering)",
        institution: "Asia Pacific University (APU)",
        institutionUrl: "https://www.apu.edu.my",
        logo: "/images/logos/apu.png",
        location: "Kuala Lumpur, Malaysia",
        startDate: "2024-01-01",
        endDate: "Present",
        relevantCourses: [
            "Programming Fundamentals",
            "UI/UX Design",
            "Networking",
            "Database Systems",
            "Software Engineering Principles",
        ],
        description:
            "Expected graduation: 2027. Specializing in software engineering with a focus on full-stack development.",
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