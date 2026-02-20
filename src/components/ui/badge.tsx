import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-violet-200 text-violet-800 shadow-sm hover:bg-violet-300 dark:bg-violet-800/50 dark:text-violet-100 dark:hover:bg-violet-700/60",
        secondary:
          "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
        destructive:
          "border-transparent bg-red-200 text-red-800 shadow-sm hover:bg-red-300 dark:bg-red-900/50 dark:text-red-100 dark:hover:bg-red-800/60",
        outline:
          "text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100 dark:text-violet-200 dark:border-violet-700 dark:bg-violet-950/40 dark:hover:bg-violet-900/50",
        success:
          "border-transparent bg-emerald-200 text-emerald-800 shadow-sm hover:bg-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-100 dark:hover:bg-emerald-800/60",
        warning:
          "border-transparent bg-amber-200 text-amber-800 shadow-sm hover:bg-amber-300 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-800/60",
        info:
          "border-transparent bg-blue-200 text-blue-800 shadow-sm hover:bg-blue-300 dark:bg-blue-900/50 dark:text-blue-100 dark:hover:bg-blue-800/60",
        gradient:
          "border-transparent bg-violet-200 text-violet-800 shadow-sm hover:bg-violet-300 dark:bg-violet-800/50 dark:text-violet-100 dark:hover:bg-violet-700/60",
        muted:
          "border-transparent bg-gray-200 text-gray-800 shadow-sm hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
        slate:
          "border-transparent bg-slate-200 text-slate-800 shadow-sm hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
        gray:
          "border-transparent bg-gray-200 text-gray-800 shadow-sm hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
        zinc:
          "border-transparent bg-zinc-200 text-zinc-800 shadow-sm hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600",
        neutral:
          "border-transparent bg-neutral-200 text-neutral-800 shadow-sm hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600",
        stone:
          "border-transparent bg-stone-200 text-stone-800 shadow-sm hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600",
        red:
          "border-transparent bg-red-200 text-red-800 shadow-sm hover:bg-red-300 dark:bg-red-900/50 dark:text-red-100 dark:hover:bg-red-800/60",
        orange:
          "border-transparent bg-orange-200 text-orange-800 shadow-sm hover:bg-orange-300 dark:bg-orange-900/50 dark:text-orange-100 dark:hover:bg-orange-800/60",
        amber:
          "border-transparent bg-amber-200 text-amber-800 shadow-sm hover:bg-amber-300 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-800/60",
        yellow:
          "border-transparent bg-yellow-200 text-yellow-800 shadow-sm hover:bg-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-100 dark:hover:bg-yellow-800/60",
        lime:
          "border-transparent bg-lime-200 text-lime-800 shadow-sm hover:bg-lime-300 dark:bg-lime-900/50 dark:text-lime-100 dark:hover:bg-lime-800/60",
        green:
          "border-transparent bg-green-200 text-green-800 shadow-sm hover:bg-green-300 dark:bg-green-900/50 dark:text-green-100 dark:hover:bg-green-800/60",
        emerald:
          "border-transparent bg-emerald-200 text-emerald-800 shadow-sm hover:bg-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-100 dark:hover:bg-emerald-800/60",
        teal:
          "border-transparent bg-teal-200 text-teal-800 shadow-sm hover:bg-teal-300 dark:bg-teal-900/50 dark:text-teal-100 dark:hover:bg-teal-800/60",
        cyan:
          "border-transparent bg-cyan-200 text-cyan-800 shadow-sm hover:bg-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-100 dark:hover:bg-cyan-800/60",
        sky:
          "border-transparent bg-sky-200 text-sky-800 shadow-sm hover:bg-sky-300 dark:bg-sky-900/50 dark:text-sky-100 dark:hover:bg-sky-800/60",
        blue:
          "border-transparent bg-blue-200 text-blue-800 shadow-sm hover:bg-blue-300 dark:bg-blue-900/50 dark:text-blue-100 dark:hover:bg-blue-800/60",
        indigo:
          "border-transparent bg-indigo-200 text-indigo-800 shadow-sm hover:bg-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-100 dark:hover:bg-indigo-800/60",
        violet:
          "border-transparent bg-violet-200 text-violet-800 shadow-sm hover:bg-violet-300 dark:bg-violet-900/50 dark:text-violet-100 dark:hover:bg-violet-800/60",
        purple:
          "border-transparent bg-purple-200 text-purple-800 shadow-sm hover:bg-purple-300 dark:bg-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-800/60",
        fuchsia:
          "border-transparent bg-fuchsia-200 text-fuchsia-800 shadow-sm hover:bg-fuchsia-300 dark:bg-fuchsia-900/50 dark:text-fuchsia-100 dark:hover:bg-fuchsia-800/60",
        pink:
          "border-transparent bg-pink-200 text-pink-800 shadow-sm hover:bg-pink-300 dark:bg-pink-900/50 dark:text-pink-100 dark:hover:bg-pink-800/60",
        rose:
          "border-transparent bg-rose-200 text-rose-800 shadow-sm hover:bg-rose-300 dark:bg-rose-900/50 dark:text-rose-100 dark:hover:bg-rose-800/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className, "text-[0.625rem]")} {...props} />
  )
}

export { Badge, badgeVariants }
