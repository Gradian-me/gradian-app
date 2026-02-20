import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-card-foreground shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden",
      className
    )}
    style={{ height: '-webkit-fill-available' }}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight text-gray-900 dark:text-gray-200",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600 dark:text-gray-400 leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-4 border-gray-100 dark:border-gray-700", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-4", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

interface CollapsibleCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

const CollapsibleCardHeader = React.forwardRef<
  HTMLDivElement,
  CollapsibleCardHeaderProps
>(({ className, title, description, isCollapsed, onToggle, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50", className)}
    {...props}
  >
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      )}
    </div>
    <button
      onClick={onToggle}
      className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
    >
      {isCollapsed ? (
        <ChevronDown className="h-5 w-5 text-gray-600" />
      ) : (
        <ChevronUp className="h-5 w-5 text-gray-600" />
      )}
    </button>
  </div>
))
CollapsibleCardHeader.displayName = "CollapsibleCardHeader"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CollapsibleCardHeader }
