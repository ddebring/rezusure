import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-[14px]",
    "text-sm font-semibold tracking-[-0.01em]",
    "transition-all duration-200",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-[var(--ring)]",
    "focus-visible:ring-offset-2",
    "disabled:pointer-events-none",
    "disabled:cursor-not-allowed",
    "disabled:opacity-60",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "border border-black/[0.06]",
          "bg-[var(--accent)]",
          "text-[var(--accent-foreground)]",
          "shadow-[0_10px_28px_rgba(199,245,54,0.22)]",
          "hover:bg-[var(--accent-strong)]",
          "hover:-translate-y-[1px]",
        ].join(" "),

        secondary: [
          "border border-[var(--border)]",
          "bg-white",
          "text-[var(--foreground)]",
          "hover:bg-[var(--panel-strong)]",
        ].join(" "),

        outline: [
          "border border-black/[0.12]",
          "bg-white",
          "text-[var(--foreground)]",
          "hover:bg-black/[0.025]",
        ].join(" "),

        dark: [
          "border border-[#111111]",
          "bg-[#111111]",
          "text-white",
          "hover:bg-[#24211f]",
        ].join(" "),

        ghost: [
          "bg-transparent",
          "text-[var(--foreground)]",
          "hover:bg-[var(--panel-strong)]",
        ].join(" "),

        default: [
          "border border-black/[0.06]",
          "bg-[var(--accent)]",
          "text-[var(--accent-foreground)]",
          "shadow-[0_10px_28px_rgba(199,245,54,0.22)]",
          "hover:bg-[var(--accent-strong)]",
        ].join(" "),

        destructive: [
          "bg-red-600",
          "text-white",
          "hover:bg-red-700",
        ].join(" "),
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({
            variant,
            size,
          }),
          disabled && "cursor-not-allowed",
          className
        )}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };