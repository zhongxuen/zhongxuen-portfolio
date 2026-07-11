import { useCallback } from "react";

/**
 * Custom hook for smooth scrolling to sections without duplicating hash in URL.
 * Prevents the #about#about#about issue by managing the history state properly.
 */
export function useSmoothScroll() {
    const scrollToSection = useCallback((sectionId: string) => {
        // Clear any duplicate hashes from the URL
        const hash = `#${sectionId.replace(/^#/, "")}`;
        
        // Update URL only if it doesn't already have this hash
        if (!window.location.hash || window.location.hash !== hash) {
            window.history.pushState(null, "", hash);
        }
        
        // Scroll to the element
        const element = document.getElementById(sectionId.replace(/^#/, ""));
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    return { scrollToSection };
}
