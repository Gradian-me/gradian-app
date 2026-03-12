"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";

export interface TicketCardHeaderProps {
  /** Icon to show in the header (e.g. CheckCircle from lucide-react). */
  icon?: React.ReactNode;
  /** Tailwind class for icon container/color (e.g. "text-primary", "bg-emerald-500/10"). */
  iconColor?: string;
  /** Main title. */
  title: string;
  /** Optional description below the title. */
  description?: string;
  className?: string;
}

export function TicketCardHeader({
  icon,
  iconColor = "text-primary bg-primary/10",
  title,
  description,
  className,
}: TicketCardHeaderProps) {
  return (
    <div
      className={cn("p-4 flex flex-col items-center text-center", className)}
      aria-labelledby="ticket-card-title"
    >
      {icon && (
        <div
          className={cn(
            "p-3 rounded-full animate-in zoom-in-50 duration-300",
            iconColor
          )}
        >
          <div className="[&>svg]:w-10 [&>svg]:h-10">{icon}</div>
        </div>
      )}
      <h2
        id="ticket-card-title"
        className="text-2xl font-semibold mt-2 text-foreground"
      >
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      )}
    </div>
  );
}
