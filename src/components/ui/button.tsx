import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-violet-500 text-white shadow-sm hover:bg-violet-600 hover:shadow-md dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700",
        destructive:
          "bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md dark:bg-red-600 dark:text-white dark:hover:bg-red-700",
        outline:
          "border border-none bg-gray-50 dark:bg-gray-700 dark:hover:bg-violet-700 dark:border-violet-700 hover:bg-violet-50 hover:border hover:border-violet-300 dark:text-violet-300 dark:hover:border-violet-300 text-violet-700 shadow-sm hover:shadow-md",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
        ghost: "text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-300 dark:hover:bg-gray-800 dark:hover:text-violet-300",
        link: "text-violet-600 underline-offset-4 hover:underline hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-300",
        gradient: "bg-gradient-to-r from-violet-500 to-purple-500 dark:from-violet-600 dark:to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm",
        square:
          "h-10 min-h-10 w-10 min-w-10 p-0 shrink-0 shadow-sm [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 squircle squircle-2xl squircle-smooth-md squircle-gray-50 squircle-border-2 squircle-border-gray-100 hover:squircle-gray-100 hover:squircle-border-gray-200 dark:squircle-gray-700 dark:squircle-border-gray-700 dark:hover:squircle-gray-600 dark:hover:squircle-border-gray-600 text-violet-700 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-300",
        squareGradient:
          "h-10 min-h-10 w-10 min-w-10 p-0 shrink-0 shadow-sm [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 squircle squircle-2xl squircle-smooth-md squircle-violet-50 squircle-border-2 squircle-border-violet-100 hover:squircle-violet-100 hover:squircle-border-violet-200 dark:squircle-violet-700 dark:squircle-border-violet-700 dark:hover:squircle-violet-600 dark:hover:squircle-border-violet-600 text-violet-700 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-300",
      },
      size: {
        default: "h-10 px-6 py-2",
        xs: "h-6 w-6 rounded-md",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
        xl: "h-14 rounded-2xl px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
