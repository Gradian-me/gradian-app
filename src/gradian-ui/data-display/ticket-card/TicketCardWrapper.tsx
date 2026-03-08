"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";
import { PrintElementButton } from "@/gradian-ui/printout";

export type TicketCardOrientation = "portrait" | "landscape";

export interface TicketCardWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, show left/right circular cut-outs for ticket strip effect. Disable in modals if it clashes. */
  showCutouts?: boolean;
  /** Tailwind class for the cut-out circles so they match the background behind the ticket (e.g. "bg-white dark:bg-gray-800"). */
  cutoutClassName?: string;
  /** When true, show a print button (top right) that captures the ticket as PNG and opens the print dialog. Button is hidden when printing. */
  showPrintButton?: boolean;
  /** Portrait (default) = taller/narrower; landscape = wider ticket, optimised horizontally. */
  orientation?: TicketCardOrientation;
}

function setRef<T>(ref: React.Ref<T> | null | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

const TicketCardWrapper = React.forwardRef<HTMLDivElement, TicketCardWrapperProps>(
  (
    {
      className,
      showCutouts = true,
      cutoutClassName = "bg-background",
      showPrintButton = true,
      orientation = "portrait",
      children,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLDivElement>(null);
    const setRefs = React.useCallback(
      (el: HTMLDivElement | null) => {
        (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        setRef(ref, el);
      },
      [ref]
    );
    return (
      <div
        ref={setRefs}
        className={cn(
          "relative w-full rounded-2xl font-sans print:shadow-none",
          orientation === "portrait" ? "max-w-sm" : "max-w-2xl",
          "border border-gray-200 dark:border-gray-700",
          "bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-gray-100",
          "animate-in fade-in-0 zoom-in-95 duration-300",
          className
        )}
        data-orientation={orientation}
        {...props}
      >
        {showPrintButton && (
          <div className="absolute top-2 right-2 z-10">
            <PrintElementButton
              elementRef={internalRef}
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700"
            />
          </div>
        )}
        {showCutouts && (
          <>
            <div
              className={cn("print:hidden absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full", cutoutClassName)}
              aria-hidden
            />
            <div
              className={cn("print:hidden absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full", cutoutClassName)}
              aria-hidden
            />
          </>
        )}
        {children}
      </div>
    );
  }
);

TicketCardWrapper.displayName = "TicketCardWrapper";

export { TicketCardWrapper };
