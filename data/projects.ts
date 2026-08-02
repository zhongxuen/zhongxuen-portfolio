import { Project } from "@/types/project";

export const projects: Project[] = [
    {
        slug: "jobnow",
        title: "JobNow – Job Listing Application",
        description:
            "A job listing platform with secure authentication and real-time search, built end-to-end with TypeScript and Supabase.",
        technologies: ["TypeScript", "Supabase"],
        githubUrl: "",
        githubRepo: "JobNow-Application-Capstone-Project",
        liveUrl: "https://job-now-navy.vercel.app/",
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
            "A Java desktop app that manages tutorial centre operations end-to-end — student records, OOP design, and file-based persistence.",
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
        slug: "it-ticket-helpdesk-system",
        title: "IT Ticket Helpdesk System",
        description:
            "A role-based IT helpdesk platform — admins, technicians, IT staff, and employees log, track, and resolve support tickets end-to-end.",
        longDescription:
            "A role-based IT support ticketing system enabling employees to raise tickets, technicians and IT staff to manage and resolve them, and admins to oversee the full workflow. Includes authentication, ticket status tracking, and role-specific dashboards.",
        testCredentials: {
            password: "12345678",
            accounts: ["admin", "technician", "it", "employee"],
        },
        technologies: ["TypeScript", "Next.js", "Supabase"],
        githubUrl: "https://github.com/zhongxuen/IT-ticket-helpdesk-system",
        githubRepo: "IT-ticket-helpdesk-system",
        liveUrl: "https://it-ticket-helpdesk-system.vercel.app/",
        keyFeatures: [
            "Role-based access control (Admin, Technician, IT, Employee)",
            "Ticket creation, assignment, and status tracking",
            "Authentication with test accounts per role",
            "Role-specific dashboards",
        ],
        featured: true,
        order: 3,
    },

    {
        slug: "ecoquest",
        title: "EcoQuest – Environmental Awareness Web App",
        description:
            "An environmental-awareness web app with a PHP backend and a dynamic JavaScript frontend for interactive engagement.",
        technologies: ["PHP", "HTML", "JavaScript"],
        githubUrl: "",
        githubRepo: "EcoQuest-Web-Development",
        keyFeatures: [
            "PHP backend with file-based storage",
            "Dynamic frontend interactions",
        ],
        featured: true,
        order: 4,
    },
    {
        slug: "education-management-system",
        title: "Education Management System",
        description:
            "A menu-driven Python CLI for managing student records, with full CRUD operations backed by file-based storage.",
        technologies: ["Python", "File I/O"],
        githubUrl: "",
        githubRepo: "Education-Management-System-Python",
        keyFeatures: [
            "Menu-driven CLI interface",
            "CRUD operations using file storage",
        ],
        featured: false,
        order: 5,
    },
    {
        slug: "jommakan-website-interface",
        title: "JomMakan Website Interface",
        description:
            "A static restaurant-management UI covering dashboard, POS, reservations, inventory, staff, and promotions — frontend-only with a Firebase fallback.",
        technologies: ["HTML", "Tailwind CSS", "JavaScript"],
        githubUrl: "",
        githubRepo: "JomMakan-Website-Interface",
        keyFeatures: [
            "Multi-view sidebar navigation (Dashboard, POS, Reservations, Inventory, Customers, Staff, Promotions)",
            "Inventory CRUD demo with mock data state",
            "Staff roster with duty status indicators",
            "Promotions and loyalty program management table",
            "Optional Firebase/Firestore integration scaffold with automatic fallback to mock data mode",
        ],
        featured: false,
        order: 6,
    },
    {
        slug: "travel-expertise-ai-chatbot",
        title: "Travel Expertise AI Chatbot",
        description:
            "A Botpress travel-assistant chatbot with structured conversation flows and intent handling for trip-planning queries.",
        technologies: ["Botpress"],
        githubUrl: "",
        keyFeatures: [
            "Conversational flow design",
            "Intent handling",
            "Structured dialogue system",
        ],
        featured: false,
        order: 7,
    },

];