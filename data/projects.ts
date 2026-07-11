import { Project } from "@/types/project";

export const projects: Project[] = [
    {
        slug: "jobnow",
        title: "JobNow – Job Listing Application",
        description:
            "Full-stack job listing platform with a cloud backend, authentication, and real-time database queries.",
        technologies: ["TypeScript", "Supabase"],
        githubUrl: "",
        githubRepo: "JobNow-Application-Capstone-Project",
        keyFeatures: [
            "Authentication",
            "Real-time database queries",
            "Responsive UI and user workflows",
        ],
        featured: true,
        order: 1,
    },
    {
        slug: "advanced-tutorial-centre-system",
        title: "Advanced Tutorial Centre System",
        description:
            "Desktop application for managing tutorial centre operations using object-oriented design and file persistence.",
        technologies: ["Java", "OOP", "File I/O"],
        githubUrl: "",
        githubRepo: "Advanced-Tution-Centre-Management-Java",
        keyFeatures: [
            "Structured student management system",
            "File-based data persistence",
        ],
        featured: true,
        order: 2,
    },
    {
        slug: "ecoquest",
        title: "EcoQuest – Environmental Awareness Web App",
        description:
            "Web application promoting environmental awareness with a PHP backend and dynamic JavaScript frontend.",
        technologies: ["PHP", "HTML", "JavaScript"],
        githubUrl: "",
        githubRepo: "EcoQuest-Web-Development",
        keyFeatures: [
            "PHP backend with file-based storage",
            "Dynamic frontend interactions",
        ],
        featured: true,
        order: 3,
    },
    {
        slug: "education-management-system",
        title: "Education Management System",
        description:
            "CLI-based student management system with a menu-driven interface and CRUD operations using file storage.",
        technologies: ["Python", "File I/O"],
        githubUrl: "",
        githubRepo: "Education-Management-System-Python",
        keyFeatures: [
            "Menu-driven CLI interface",
            "CRUD operations using file storage",
        ],
        featured: false,
        order: 4,
    },
    {
        slug: "travel-expertise-ai-chatbot",
        title: "Travel Expertise AI Chatbot",
        description:
            "AI chatbot for travel assistance with structured conversational flows and intent handling.",
        technologies: ["Botpress"],
        githubUrl: "",
        keyFeatures: [
            "Conversational flow design",
            "Intent handling",
            "Structured dialogue system",
        ],
        featured: false,
        order: 5,
    },
];