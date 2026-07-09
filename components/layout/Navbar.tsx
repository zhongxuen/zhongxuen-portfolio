"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { navigation } from "@/data/navigation";
import { useScroll } from "@/hooks/useScroll";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";

/**
 * Primary site navigation. Renders inline on desktop, collapses to a
 * hamburger-triggered dropdown on mobile. Background becomes opaque
 * once the page is scrolled past the threshold (via useScroll), so it
 * stays legible over hero content without a permanent hard border.
 */
export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { isScrolled } = useScroll();

    function closeMenu(): void {
        setIsOpen(false);
    }

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-colors duration-200",
                isScrolled
                    ? "bg-background/90 backdrop-blur-sm border-b border-muted/10"
                    : "bg-transparent"
            )}
        >
            <Container className="flex h-16 items-center justify-between">
                <Link
                    href="/"
                    className="font-heading text-lg font-semibold text-foreground"
                    onClick={closeMenu}
                >
                    GZX
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    {navigation.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-card"
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isOpen}
                >
                    {isOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </Container>

            {isOpen && (
                <nav className="md:hidden border-t border-muted/10 bg-background">
                    <Container className="flex flex-col gap-1 py-4">
                        {navigation.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={closeMenu}
                                className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-foreground"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </Container>
                </nav>
            )}
        </header>
    );
}