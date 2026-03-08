"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";

export interface TicketCardContentItem {
  label: string;
  value: React.ReactNode;
}

export interface TicketCardContentProps {
  /** Array of label/value pairs to display. */
  items: TicketCardContentItem[];
  /** Number of columns in the grid (1, 2, 3, etc.). Default 2. */
  colspan?: number;
  /** Optional class for the container. */
  className?: string;
}

const DashedLine = () => (
  <div
    className="w-full border-t-2 border-dashed border-gray-300 dark:border-gray-500"
    aria-hidden="true"
  />
);

const COLSPAN_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

export function TicketCardContent({
  items,
  colspan = 2,
  className,
}: TicketCardContentProps) {
  if (!items.length) return null;

  const gridCols = COLSPAN_CLASS[colspan] ?? COLSPAN_CLASS[2];

  return (
    <div className={cn("px-8 pb-4 space-y-4", className)}>
      <DashedLine />
      <div className={cn("grid gap-4 text-left", gridCols)}>
        {items.map((item, index) => (
          <div key={index}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
            <div className="font-medium text-foreground mt-0.5 break-all">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
