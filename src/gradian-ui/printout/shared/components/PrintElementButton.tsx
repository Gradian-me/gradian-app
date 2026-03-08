"use client";

import React, { useCallback } from "react";
import type { RefObject } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/gradian-ui/shared/utils";
import { printElementAsImage } from "../utils/print-element-as-image";

export interface PrintElementButtonProps {
  /** Ref to the element to capture and print (e.g. ticket card root). */
  elementRef: RefObject<HTMLElement | null>;
  /** Optional class for the button. */
  className?: string;
  /** Optional label (default: "Print"). */
  label?: string;
  /** Called when print fails. */
  onError?: (error: Error) => void;
  /** Button variant/size - passed to Button. */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button that captures the element at elementRef as PNG and opens the print dialog.
 * The button is hidden when printing (print:hidden) so it does not appear on the printed page.
 */
export function PrintElementButton({
  elementRef,
  className,
  label = "Print",
  onError,
  variant = "outline",
  size = "sm",
}: PrintElementButtonProps) {
  const [printing, setPrinting] = React.useState(false);

  const handlePrint = useCallback(async () => {
    const el = elementRef.current;
    if (!el) return;
    setPrinting(true);
    try {
      await printElementAsImage(el, {
        quality: "normal",
        onError: (err) => {
          onError?.(err);
        },
      });
    } finally {
      setPrinting(false);
    }
  }, [elementRef, onError]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={printing}
      className={cn("print:hidden", className)}
      title={label}
      aria-label={label}
    >
      <Printer className="h-4 w-4 shrink-0" aria-hidden />
      {size !== "icon" && label ? <span className="ml-1.5">{label}</span> : null}
    </Button>
  );
}
