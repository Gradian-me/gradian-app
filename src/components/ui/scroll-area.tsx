import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    scrollbarVariant?: 'default' | 'dark' | 'minimal';
    dir?: 'ltr' | 'rtl';
  }
>(({ className, children, scrollbarVariant = 'default', dir, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    dir={dir}
    className={cn("relative overflow-hidden", scrollbarVariant !== 'default' && "group", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      dir={dir}
      className="h-full w-full rounded-[inherit]"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar variant={scrollbarVariant} />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
    variant?: 'default' | 'dark' | 'minimal'
  }
>(({ className, orientation = "vertical", variant = 'default', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-all duration-300",
      variant === 'dark' && "opacity-30 hover:opacity-100 group-hover:opacity-100",
      variant === 'minimal' && "opacity-40 hover:opacity-100 group-hover:opacity-100",
      variant === 'default' && "transition-colors hover:bg-gray-100",
      orientation === "vertical" &&
        variant === 'dark' ? "h-full w-1.5 border-l border-l-transparent p-[1px]" :
        variant === 'minimal' ? "h-full w-1 border-l border-l-transparent p-[1px]" :
        "h-full w-2.5 border-l border-l-transparent p-px",
      orientation === "horizontal" &&
        variant === 'dark' ? "h-1.5 flex-col border-t border-t-transparent p-[1px]" :
        variant === 'minimal' ? "h-1 flex-col border-t border-t-transparent p-[1px]" :
        "h-2.5 flex-col border-t border-t-transparent p-px",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb 
      className={cn(
        "relative flex-1 rounded-full transition-colors cursor-pointer",
        variant === 'dark' && "bg-gray-600/40 hover:bg-gray-500/60",
        variant === 'minimal' && "bg-gray-400/40 hover:bg-gray-400/60",
        variant === 'default' && "bg-gray-300 hover:bg-gray-500"
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
