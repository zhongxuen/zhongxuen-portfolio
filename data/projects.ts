import { Project } from "@/types/project";

export const projects: Project[] = [
    {
        slug: "jobnow",
        title: "JobNow – Job Listing Application",
        description:
            "A swipe-based mobile job-search app for Android, built with React Native (Expo) and Supabase, with AI-assisted job matching and direct recruiter messaging.",
        technologies: ["React Native", "Expo", "TypeScript", "Supabase"],
        githubUrl: "",
        githubRepo: "JobNow-Application-Capstone-Project",
        liveUrl: "https://job-now-navy.vercel.app/",
        screenshots: ["/images/projects/jobnow-landing.jpg"],
        keyFeatures: [
            "Swipe-based job browsing",
            "AI-powered job matching",
            "Direct in-app recruiter messaging",
            "Authentication and real-time data via Supabase",
        ],
        featured: true,
        order: 1,
    },
    {
        slug: "ai-code-visualizer",
        title: "AI Code Visualizer",
        description:
            "A step-by-step code execution visualizer for JavaScript, TypeScript, Python, and Java — watch variables, call stack, memory, and control flow update live as code runs, plus a gallery of built-in algorithm visualizations.",
        longDescription:
            "A Next.js app that parses source code (via acorn, Babel, and tree-sitter language adapters) into an AST, then walks it to build a frame-by-frame execution timeline. A Monaco-based editor drives the whole flow: as you step through execution, synced panels show live variable state, call stack, scope, and memory, alongside a console output timeline, an interactive React Flow control-flow graph, and a time/space complexity badge. A separate Algorithms mode ships ready-made, steppable visualizations for common algorithms (BFS, DFS, binary search, bubble/insertion/selection sort, DP problems, tree traversal) without needing to write any code.",
        technologies: ["Next.js", "TypeScript", "React", "Zustand", "React Flow", "Monaco Editor", "tree-sitter"],
        githubUrl: "https://github.com/zhongxuen/ai-code-visualizer",
        githubRepo: "ai-code-visualizer",
        liveUrl: "https://ai-code-visualizer-one.vercel.app",
        keyFeatures: [
            "Monaco-based code editor supporting JavaScript, TypeScript, Python, and Java via pluggable language adapters",
            "Custom parsing layer (acorn, Babel, tree-sitter) builds an AST per language",
            "Step-by-step execution playback with synced variable, scope, call stack, and memory timelines",
            "Live console output tracking alongside execution steps",
            "Interactive control-flow graph visualization built with React Flow",
            "Time/space complexity analysis with a Big-O badge",
            "Built-in algorithm gallery (BFS, DFS, binary search, sorting, DP, tree traversal) with dedicated step-through visualizations",
        ],
        featured: true,
        order: 2,
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
            "Role-based workflows for admins, receptionists, tutors, and students",
            "Structured student management system",
            "File-based data persistence",
        ],
        featured: true,
        order: 3,
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
        order: 4,
    },

    {
        slug: "grabexpress-receipt-collector",
        title: "GrabExpress Receipt Collector",
        description:
            "A Next.js web app that signs in to Gmail, finds GrabExpress delivery receipt emails specifically, and exports them as a formatted .xlsx spreadsheet. Only handles GrabExpress receipts, not GrabFood, GrabCar, GrabMart, or other Grab services.",
        longDescription:
            "Web app, deployed on Vercel, that lets any Gmail user sign in with Google, finds GrabExpress receipt emails (identified by subject line, since GrabExpress receipts are often forwarded rather than sent directly), parses receipt data out of the email HTML with cheerio, and downloads the results as a formatted .xlsx file built in-memory with exceljs — no database, no local files, no OCR/PDF scraping. Scoped narrowly to GrabExpress delivery receipts only; it does not parse or collect receipts from other Grab verticals (GrabFood, GrabCar, GrabMart, etc.), since those use different email formats. A built-in Demo Mode lets visitors try the full parse → dedupe → export pipeline against bundled synthetic sample receipts, with no sign-in and no real Gmail access required, since the app requests a sensitive OAuth scope that's normally gated to approved test users.",
        technologies: ["Next.js", "TypeScript", "NextAuth.js", "Gmail API", "cheerio", "exceljs"],
        githubUrl: "https://github.com/zhongxuen/GrabExpress-Receipt-Collector",
        githubRepo: "GrabExpress-Receipt-Collector",
        liveUrl: "https://grab-express-receipt-collector-sigma.vercel.app/?demo=1",
        keyFeatures: [
            "Google sign-in (Gmail read-only scope) with session in an encrypted cookie, no database",
            "Finds GrabExpress receipt emails specifically by subject line — excludes other Grab services (GrabFood, GrabCar, GrabMart, etc.)",
            "Flexible date range selection: all time, since a date, a specific month, custom range, or free-form phrases like \"last 90 days\"",
            "Parses receipt data (date, receipt/booking number, amount) from email HTML via cheerio with a regex fallback",
            "Deduplicates receipts by Gmail message ID or booking code before export",
            "Streams a formatted .xlsx file back as a direct browser download, built in-memory with exceljs",
            "Skipped or failed messages are reported back in the UI, not just logged silently",
            "Demo Mode: try the real parse/export pipeline on bundled sample data with no sign-in required, reachable via a \"Try the demo\" entry point or the /?demo=1 link, with a persistent banner marking demo output",
        ],
        featured: true,
        order: 5,
    },

    {
        slug: "ecoquest",
        title: "EcoQuest – Environmental Awareness Web App",
        description:
            "A gamified environmental-awareness platform built with PHP and MySQL, where students complete quests, earn badges, and redeem rewards under moderator and admin oversight.",
        technologies: ["PHP", "MySQL", "JavaScript", "CSS"],
        githubUrl: "",
        githubRepo: "EcoQuest-Web-Development",
        keyFeatures: [
            "Role-based access for Admin, Moderator, and Student accounts",
            "Quest, badge, and rewards system with a leaderboard",
            "Community forum with submission review and moderation tools",
            "PHP backend with a MySQL database",
        ],
        featured: true,
        order: 6,
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
            "Role-based login for Admin, Staff, Teacher, and Student accounts",
            "Menu-driven CLI interface",
            "CRUD operations using file storage",
        ],
        featured: false,
        order: 7,
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
        order: 8,
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
        order: 9,
    },

];