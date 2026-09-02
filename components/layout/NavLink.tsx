"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSamePageHash, resolveNavHref } from "@/lib/navigation";

type NavLinkProps = Omit<React.ComponentPropsWithoutRef<"a">, "href"> & {
    /** An href from data/navigation.ts — bare `#section` or a real route. */
    href: string;
    /**
     * Section id, echoed onto the rendered anchor so NavUnderline can find and
     * measure the active link. Declared explicitly because `data-*` attributes
     * are only inferred on intrinsic JSX elements, not on a typed props object
     * being spread through a wrapper like this one.
     */
    "data-nav-id"?: string;
};

/**
 * Renders one navigation entry, resolved against the current route.
 *
 * A `#section` link on `/` stays a plain `<a>`. The browser then handles it as
 * a same-document fragment navigation: it scrolls using the `scroll-behavior:
 * smooth` and `scroll-padding-top` declared on `html` in app/globals.css (both
 * already reduced-motion aware), and it records the jump in session history,
 * so Back returns to the section the visitor came from. That is the whole
 * smooth-scroll mechanism — there is no JS counterpart to keep in step with it.
 *
 * Everything else — the same link from a subpage, or a genuine route — goes
 * through next/link for client-side navigation.
 */
export function NavLink({ href, children, ...rest }: NavLinkProps) {
    const isHome = usePathname() === "/";

    if (isSamePageHash(href, isHome)) {
        return (
            <a href={href} {...rest}>
                {children}
            </a>
        );
    }

    return (
        <Link href={resolveNavHref(href, isHome)} {...rest}>
            {children}
        </Link>
    );
}
