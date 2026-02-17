"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useLanguageStore } from "@/stores/language.store"
import { isRTL, getDefaultLanguage } from "@/gradian-ui/shared/utils/translation-utils"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const language = useLanguageStore((s) => s.language)
  const lang = language || getDefaultLanguage()
  const rtl = isRTL(lang)
  const dir = rtl ? "rtl" : "ltr"
  const position = rtl ? "bottom-left" : "bottom-right"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir={dir}
      position={position}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-popover/95 dark:group-[.toaster]:backdrop-blur-sm",
          description: "group-[.toast]:text-popover-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }

