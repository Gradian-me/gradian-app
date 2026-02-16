"use client"

import * as React from "react"

import { Moon, Sun } from "lucide-react"

import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export interface ModeToggleProps {
  /**
   * CSS class name
   */
  className?: string;
  /**
   * Button variant (square = squircle style for page action bar)
   */
  variant?: 'outline' | 'square';
}

export function ModeToggle({ className, variant = 'outline' }: ModeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch by only showing after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    // Get the resolved theme (handles "system" theme)
    const currentTheme = theme === "system" 
      ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme
    
    setTheme(currentTheme === "light" ? "dark" : "light")
  }

  const size = variant === 'square' ? 'sm' : 'icon';

  // Show loading state during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} disabled type="button">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

ModeToggle.displayName = 'ModeToggle';

