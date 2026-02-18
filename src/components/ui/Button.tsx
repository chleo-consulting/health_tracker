import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-peach-400 to-peach-600 text-white shadow-md shadow-peach-200 hover:from-peach-500 hover:to-peach-700 disabled:from-peach-300 disabled:to-peach-300 focus-visible:ring-peach-400",
  secondary:
    "bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 focus-visible:ring-gray-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 focus-visible:ring-red-500",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 disabled:text-gray-400 focus-visible:ring-gray-400",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
