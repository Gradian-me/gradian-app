import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-violet-200 text-violet-800 shadow-sm hover:bg-violet-300",
        secondary:
          "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200",
        destructive:
          "border-transparent bg-red-200 text-red-800 shadow-sm hover:bg-red-300",
        outline: "text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100",
        success:
          "border-transparent bg-emerald-200 text-emerald-800 shadow-sm hover:bg-emerald-300",
        warning:
          "border-transparent bg-amber-200 text-amber-800 shadow-sm hover:bg-amber-300",
        info:
          "border-transparent bg-blue-200 text-blue-800 shadow-sm hover:bg-blue-300",
        gradient:
          "border-transparent bg-violet-200 text-violet-800 shadow-sm hover:bg-violet-300",
        muted:
          "border-transparent bg-gray-200 text-gray-800 shadow-sm hover:bg-gray-300",
        slate:
          "border-transparent bg-slate-200 text-slate-800 shadow-sm hover:bg-slate-300",
        gray:
          "border-transparent bg-gray-200 text-gray-800 shadow-sm hover:bg-gray-300",
        zinc:
          "border-transparent bg-zinc-200 text-zinc-800 shadow-sm hover:bg-zinc-300",
        neutral:
          "border-transparent bg-neutral-200 text-neutral-800 shadow-sm hover:bg-neutral-300",
        stone:
          "border-transparent bg-stone-200 text-stone-800 shadow-sm hover:bg-stone-300",
        red:
          "border-transparent bg-red-200 text-red-800 shadow-sm hover:bg-red-300",
        orange:
          "border-transparent bg-orange-200 text-orange-800 shadow-sm hover:bg-orange-300",
        amber:
          "border-transparent bg-amber-200 text-amber-800 shadow-sm hover:bg-amber-300",
        yellow:
          "border-transparent bg-yellow-200 text-yellow-800 shadow-sm hover:bg-yellow-300",
        lime:
          "border-transparent bg-lime-200 text-lime-800 shadow-sm hover:bg-lime-300",
        green:
          "border-transparent bg-green-200 text-green-800 shadow-sm hover:bg-green-300",
        emerald:
          "border-transparent bg-emerald-200 text-emerald-800 shadow-sm hover:bg-emerald-300",
        teal:
          "border-transparent bg-teal-200 text-teal-800 shadow-sm hover:bg-teal-300",
        cyan:
          "border-transparent bg-cyan-200 text-cyan-800 shadow-sm hover:bg-cyan-300",
        sky:
          "border-transparent bg-sky-200 text-sky-800 shadow-sm hover:bg-sky-300",
        blue:
          "border-transparent bg-blue-200 text-blue-800 shadow-sm hover:bg-blue-300",
        indigo:
          "border-transparent bg-indigo-200 text-indigo-800 shadow-sm hover:bg-indigo-300",
        violet:
          "border-transparent bg-violet-200 text-violet-800 shadow-sm hover:bg-violet-300",
        purple:
          "border-transparent bg-purple-200 text-purple-800 shadow-sm hover:bg-purple-300",
        fuchsia:
          "border-transparent bg-fuchsia-200 text-fuchsia-800 shadow-sm hover:bg-fuchsia-300",
        pink:
          "border-transparent bg-pink-200 text-pink-800 shadow-sm hover:bg-pink-300",
        rose:
          "border-transparent bg-rose-200 text-rose-800 shadow-sm hover:bg-rose-300",
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
