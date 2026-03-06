"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { Printer, X, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/gradian-ui/shared/utils";
import { CodeBadge } from "@/gradian-ui/form-builder/form-elements/components/CodeBadge";
import { useReceiptSvg } from "../hooks/useReceiptSvg";
import { getReceiptChecksumForValidation } from "../utils";
import { PrintoutReceiptIframe } from "./PrintoutReceiptIframe";
import type { PrintoutReceiptProps } from "../types";

const DEFAULT_IFRAME_WIDTH = 384;

export const PrintoutReceipt: React.FC<PrintoutReceiptProps> = ({
  doc,
  printerConfig,
  triggerLabel = "Print label",
  triggerVariant = "ghost",
  open: controlledOpen,
  onOpenChange,
  iframeWidth,
  showTrigger = true,
  className,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const widthPx = iframeWidth ?? DEFAULT_IFRAME_WIDTH;

  const { svg, error } = useReceiptSvg(doc, printerConfig);
  const expectedChecksum = useMemo(() => getReceiptChecksumForValidation(doc), [doc]);
  const [showChecksum, setShowChecksum] = useState(false);

  const handlePrint = useCallback(() => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.print();
      } else {
        window.print();
      }
    } catch {
      // Ignore
    }
  }, []);

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          variant={triggerVariant}
          size="sm"
          className={cn("h-9 text-xs gap-1", className)}
          onClick={() => setOpen(true)}
          title={triggerLabel}
        >
          <Printer className="w-4 h-4" />
          {triggerLabel}
        </Button>
      )}
      <Dialog open={open} onOpenChange={(o) => setOpen(!!o)}>
        <DialogContent
          className="flex flex-col max-w-[95vw] h-[65vh] max-h-[90vh] p-4"
          hideCloseButton={false}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base">Receipt preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto flex flex-col items-center gap-4 py-2">
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Failed to generate receipt preview.
              </p>
            )}
            <PrintoutReceiptIframe
              ref={iframeRef}
              svg={svg}
              width={widthPx}
              className="shadow-inner"
            />
          </div>
          <div className="flex flex-shrink-0 flex-col gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-end gap-2">
              {expectedChecksum != null && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChecksum((s) => !s)}
                  className="gap-1 me-auto"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {showChecksum ? "Hide Signature" : "Validate Signature"}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                <X className="w-4 h-4 me-1" />
                Close
              </Button>
              <Button type="button" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 me-1" />
                Print
              </Button>
            </div>
            {expectedChecksum != null && showChecksum && (
              <div className="flex items-center gap-2">
                <CodeBadge code={expectedChecksum} className="text-[10px] py-0.5" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

PrintoutReceipt.displayName = "PrintoutReceipt";
