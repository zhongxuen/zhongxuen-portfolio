import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
}

interface ButtonAsButtonProps extends ButtonBaseProps, ButtonHTMLAttributes<HTMLButtonElement> {
    href?: undefined;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
    href: string;
    external?: boolean;
    children?: React.ReactNode;
    "aria-label"?: string;
    download?: boolean | string;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const baseStyles =
    "bp-focus inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-wide transition-[background-color,border-color,color,box-shadow,scale] duration-fast ease-bp active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

/**
 * `link` is the demoted-action variant (docs/uiux.md §4.2): a mono text link
 * used where a third button would flatten the CTA hierarchy. It opts out of
 * the size scale's fixed height on purpose.
 */
const variantStyles: Record<ButtonVariant, string> = {
    /*
     * `bp-sheen` — a band of light crossing the fill once per hover. Only the
     * primary variant carries it: it is the loudest hover treatment on the
     * site, and putting it on a second variant would flatten exactly the
     * hierarchy the variants exist to express (docs/uiux.md §4.2).
     */
    primary:
        "bp-sheen bg-accent text-accent-ink shadow-plate hover:bg-accent-deep active:bg-accent-deep",
    secondary:
        "border border-line-strong bg-surface-alt text-ink hover:border-accent hover:text-accent",
    outline: "border border-line-ui text-ink hover:border-accent hover:text-accent",
    ghost: "text-ink-muted hover:bg-surface hover:text-ink",
    link: "bp-meta h-auto gap-1.5 p-0 text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-6 text-base",
};

/**
 * Reusable button primitive. Renders a <button> by default, or a Next.js
 * <Link> (internal) / <a> (external, href starting with "http" or
 * external=true) when an `href` is provided — one component, no separate
 * LinkButton, per "avoid duplicated logic."
 *
 * Focus is handled by the shared `bp-focus` utility so every control on the
 * site rings identically; do not add a per-component focus style.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    ({ variant = "primary", size = "md", className, ...props }, ref) => {
        const styles = cn(
            baseStyles,
            variant !== "link" && sizeStyles[size],
            variantStyles[variant],
            className,
        );

        if ("href" in props && props.href) {
            const { href, external, children, ...rest } = props;

            if (external || href.startsWith("http")) {
                return (
                    <a
                        ref={ref as React.Ref<HTMLAnchorElement>}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles}
                        {...rest}
                    >
                        {children}
                    </a>
                );
            }

            return (
                <Link
                    ref={ref as React.Ref<HTMLAnchorElement>}
                    href={href}
                    className={styles}
                    {...rest}
                >
                    {children}
                </Link>
            );
        }

        const { children, ...rest } = props as ButtonAsButtonProps;

        return (
            <button ref={ref as React.Ref<HTMLButtonElement>} className={styles} {...rest}>
                {children}
            </button>
        );
    },
);

Button.displayName = "Button";
