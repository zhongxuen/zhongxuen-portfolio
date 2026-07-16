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
        slug: "it-ticket-helpdesk-system",
        title: "IT Ticket Helpdesk System",
        description:
            "Full-stack IT helpdesk ticketing platform with role-based access for admins, technicians, IT staff, and employees to log, track, and resolve support tickets.",
        longDescription:
            "A role-based IT support ticketing system enabling employees to raise tickets, technicians and IT staff to manage and resolve them, and admins to oversee the full workflow. Includes authentication, ticket status tracking, and role-specific dashboards.\n\nTest accounts (password: `12345678` for all):\n- `admin`\n- `technician`\n- `it`\n- `employee`",
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
            "Web application promoting environmental awareness with a PHP backend and dynamic JavaScript frontend.",
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
            "CLI-based student management system with a menu-driven interface and CRUD operations using file storage.",
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
            "A static UI prototype for a restaurant management system (RMS), covering dashboard, POS, reservations, inventory, customer, staff, and promotions views. Built as a frontend-only interface without persistent database functionality.",
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
            "AI chatbot for travel assistance with structured conversational flows and intent handling.",
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