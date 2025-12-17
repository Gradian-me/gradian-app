"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex gap-2", className)}
    {...props}
  />
))
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      // Base styles
      "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200",
      // Focus styles
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-violet-500 dark:focus-visible:ring-offset-gray-900",
      // Light mode - default state
      "border-gray-200 bg-white text-gray-700 shadow-sm",
      "hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md",
      // Light mode - selected state
      "data-[state=on]:border-violet-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-violet-500 data-[state=on]:to-purple-600 data-[state=on]:text-white data-[state=on]:shadow-md data-[state=on]:font-semibold",
      // Dark mode - default state
      "dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
      "dark:hover:border-violet-500 dark:hover:bg-gray-700 dark:hover:text-violet-300 dark:hover:shadow-lg",
      // Dark mode - selected state
      "dark:data-[state=on]:border-violet-500 dark:data-[state=on]:bg-gradient-to-r dark:data-[state=on]:from-violet-600 dark:data-[state=on]:to-purple-700 dark:data-[state=on]:text-white dark:data-[state=on]:shadow-lg",
      // Disabled state
      "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
      // Active press effect
      "active:scale-[0.98]",
      className
    )}
    {...props}
  />
))
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }


