import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg" | "full";
}

export function Button({
    children,
    className = "",
    variant = "primary",
    size = "md",
    ...props
}: ButtonProps) {
    const baseStyles =
        "font-semibold rounded-full transition-all duration-200 active:scale-95 inline-flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-ink text-ground hover:bg-ink-hover shadow-sm",
        secondary: "bg-surface-2 text-ink hover:bg-surface-3",
        outline: "border border-ink/20 text-ink hover:bg-ink/5",
        ghost: "text-ink hover:bg-ink/10",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-6 py-2.5 text-base",
        lg: "px-8 py-3 text-lg",
        full: "w-full py-3 text-lg",
    };

    const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
        <button className={combinedClasses} {...props}>
            {children}
        </button>
    );
}
