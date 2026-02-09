"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"
import { useLanguageStore } from "@/stores/language.store"
import { isRTL } from "@/gradian-ui/shared/utils/translation-utils"

type TabsRootProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsRootProps & { dir?: 'ltr' | 'rtl' }
>(({ dir: dirProp, ...props }, ref) => {
  const language = useLanguageStore((s) => s.language)
  const dir = dirProp ?? (isRTL(language || 'en') ? 'rtl' : 'ltr')
  return (
    <TabsPrimitive.Root
      ref={ref}
      dir={dir}
      {...props}
    />
  )
})
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex min-h-10 items-center justify-start rounded-lg bg-gray-100 dark:bg-gray-800 gap-1 ps-1 pe-1 pt-1 pb-1 text-gray-700 dark:text-gray-300 select-none",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ps-3 pe-3 py-1.5 text-sm font-medium leading-relaxed ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "text-gray-600 dark:text-gray-300",
      "data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm",
      "dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-violet-300",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

