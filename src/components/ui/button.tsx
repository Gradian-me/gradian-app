import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-violet-500 text-white shadow-sm hover:bg-violet-600 hover:shadow-md dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700",
        destructive:
          "bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md dark:bg-red-600 dark:text-white dark:hover:bg-red-700",
        outline:
          "border border-none bg-white text-violet-700 hover:bg-violet-50 hover:border hover:border-violet-300 shadow-sm hover:shadow-md dark:border-violet-300 dark:bg-gray-800 dark:text-violet-300 dark:hover:bg-gray-700 dark:hover:border-violet-300",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
        ghost: "text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-300 dark:hover:bg-gray-800 dark:hover:text-violet-300",
        link: "text-violet-600 underline-offset-4 hover:underline hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-300",
        gradient: "bg-violet-500 text-white shadow-sm hover:bg-violet-600 hover:shadow-md dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
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
