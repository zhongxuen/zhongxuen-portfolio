/**
 * Represents a single portfolio project.
 *
 * This type is the single source of truth for project data across:
 * - data/projects.ts (static/local project entries)
 * - adapters/githubProjectAdapter.ts (GitHub API → Project shape)
 * - components/cards/ProjectCard.tsx and project detail views
 */

export interface Project {
    /** Unique, URL-safe identifier (e.g. "portfolio-website") used for routing: /projects/[slug] */
    slug: string;

    /** Display name of the project */
    title: string;

    /** Short summary shown on project cards (1-2 sentences) */
    description: string;

    /** Longer-form explanation for the project detail page, if different from description */
    longDescription?: string;

    /** Technologies/stack used (e.g. ["Next.js", "TypeScript", "Tailwind CSS"]) */
    technologies: string[];

    /** GitHub repository URL */
    githubUrl: string;

    /** Optional GitHub repository name used for live repo matching */
    githubRepo?: string;

    /** Live deployed URL, if available */
    liveUrl?: string;

    /** Path(s) to screenshot images in public/images/projects */
    screenshots?: string[];

    /** Notable features implemented in the project */
    keyFeatures?: string[];

    /** Technical or design challenges encountered */
    challenges?: string[];

    /** What the developer learned from building this */
    lessonsLearned?: string[];

    /** Planned or potential future enhancements */
    futureImprovements?: string[];

    /** Whether this project should appear in the home page "Featured Projects" section */
    featured?: boolean;

    /** Manual sort priority; lower numbers appear first (optional, for curated ordering) */
    order?: number;

    // --- GitHub-derived fields (populated via githubProjectAdapter.ts when synced) ---

    /** Primary language reported by GitHub */
    language?: string;

    /** GitHub star count */
    stars?: number;
        
    /** ISO timestamp of last repository update */
    lastUpdated?: string;
}

export interface TestCredential {
        role: string;
        username: string;
        password: string;
    }

    export interface Project {
        title: string;
        slug: string;
        description: string;
        githubUrl: string;
        liveUrl?: string;
        technologies: string[];
        testCredentials?: TestCredential[];
    }