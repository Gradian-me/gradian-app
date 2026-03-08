"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";

export interface TicketCardBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function TicketCardBadge({ children, className }: TicketCardBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold font-mono tracking-wide",
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        className
      )}
    >
      {children}
    </span>
  );
}
