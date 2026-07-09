import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
}

interface ButtonAsButtonProps
    extends ButtonBaseProps,
        ButtonHTMLAttributes<HTMLButtonElement> {
    href?: undefined;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
    href: string;
    external?: boolean;
    children?: React.ReactNode;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-primary text-white hover:bg-primary/90",
    secondary: "bg-secondary text-background hover:bg-secondary/90",
    outline:
        "border border-muted/30 text-foreground hover:border-primary hover:text-primary",
    ghost: "text-foreground hover:bg-card",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
};

/**
 * Reusable button primitive. Renders a <button> by default, or a Next.js
 * <Link> (internal) / <a> (external, href starting with "http" or
 * external=true) when an `href` is provided — one component, no separate
 * LinkButton, per "avoid duplicated logic."
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    ({ variant = "primary", size = "md", className, ...props }, ref) => {
        const styles = cn(baseStyles, variantStyles[variant], sizeStyles[size], className);

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
    }
);

Button.displayName = "Button";