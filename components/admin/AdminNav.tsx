"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BriefcaseBusiness,
    FileText,
    FolderGit2,
    LayoutDashboard,
    RefreshCw,
    Settings,
    Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The admin console's rail navigation.
 *
 * A client component for one reason — `usePathname()`, so the active item is
 * marked without every page passing its own identity down. Nothing else here
 * needs the browser.
 *
 * `/admin` is matched exactly rather than by prefix; everything else by prefix,
 * so /admin/projects/jobnow still lights up Projects.
 */
const items = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/projects", label: "Projects", icon: FolderGit2 },
    { href: "/admin/career", label: "Career", icon: BriefcaseBusiness },
    { href: "/admin/sync", label: "Sync", icon: RefreshCw },
    { href: "/admin/resume", label: "Résumé", icon: FileText },
    { href: "/admin/health", label: "Health", icon: Stethoscope },
    { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminNav() {
    const pathname = usePathname();

    return (
        <nav aria-label="Admin sections" className="flex gap-1 lg:flex-col">
            {items.map(({ href, label, icon: Icon, ...rest }) => {
                const exact = "exact" in rest && rest.exact;
                const active = exact ? pathname === href : pathname.startsWith(href);

                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "bp-focus flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-[background-color,color,border-color] duration-fast ease-bp",
                            active
                                ? "bg-surface-alt font-medium text-accent"
                                : "text-ink-muted hover:bg-surface hover:text-ink",
                        )}
                    >
                        <Icon size={16} aria-hidden="true" className="shrink-0" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
