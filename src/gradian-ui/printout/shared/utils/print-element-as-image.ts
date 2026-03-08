/**
 * Captures an HTML element as PNG (using html-to-image) and opens the browser print
 * dialog with that image so graphics (QR, barcodes, etc.) are preserved.
 * Reusable for ticket cards, receipts, or any element that should print as a single image.
 */

const MAX_IMAGE_DIMENSION = 4096;

/**
 * Do not pass backgroundColor to toPng: the library would overwrite the clone's
 * background (our inlined theme colors) and make the ticket transparent/wrong.
 * Leaving it unset keeps the inlined opaque background; canvas stays transparent
 * so printed output shows white around the ticket and the border radius is visible.
 */
async function getToPng() {
  const mod = await import("html-to-image");
  return mod.toPng;
}

/** Quality presets map to capture resolution (pixelRatio) for sharper print. */
export type PrintCaptureQuality = "draft" | "normal" | "high";

const QUALITY_TO_RATIO: Record<PrintCaptureQuality, number> = {
  draft: 1,
  normal: 1.5,
  high: 2,
};

export interface PrintElementAsImageOptions {
  /**
   * Capture quality: draft (1x), normal (2x), high (3x). Higher = sharper print.
   * Use this instead of pixelRatio for better quality without touching ratio numbers.
   */
  quality?: PrintCaptureQuality;
  /** Pixel ratio for capture (overridden by quality if both set). Default from quality. */
  pixelRatio?: number;
  /** Callback on error (e.g. show toast). */
  onError?: (error: Error) => void;
}

/** Filter out nodes that should not appear in the printed image (e.g. print button). */
function defaultFilter(node: HTMLElement): boolean {
  if (node.classList?.contains("print:hidden")) return false;
  return true;
}

/** Strip box-shadow from element and all descendants; return a restorer that reverts them. */
function stripShadowsForCapture(root: HTMLElement): () => void {
  const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
  const saved: string[] = [];
  nodes.forEach((el) => {
    const htmlEl = el as HTMLElement;
    saved.push(htmlEl.style.boxShadow);
    htmlEl.style.setProperty("box-shadow", "none", "important");
  });
  return () => {
    nodes.forEach((el, i) => {
      (el as HTMLElement).style.boxShadow = saved[i];
    });
  };
}

/** Inline computed colors so the clone (rendered inside SVG) matches the current theme. */
const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
] as const;

function inlineComputedColorsForCapture(root: HTMLElement): () => void {
  const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
  const saved: Partial<Record<(typeof COLOR_PROPS)[number], string>>[] = [];
  const win = root.ownerDocument?.defaultView ?? window;

  nodes.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computed = win.getComputedStyle(htmlEl);
    const prev: Partial<Record<(typeof COLOR_PROPS)[number], string>> = {};
    COLOR_PROPS.forEach((prop) => {
      const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
      const value = computed.getPropertyValue(cssProp);
      if (value) {
        prev[prop] = htmlEl.style.getPropertyValue(cssProp);
        htmlEl.style.setProperty(cssProp, value, "important");
      }
    });
    saved.push(prev);
  });

  return () => {
    nodes.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      const prev = saved[i];
      if (!prev) return;
      (Object.keys(prev) as (typeof COLOR_PROPS)[number][]).forEach((prop) => {
        const v = prev[prop];
        if (v === undefined) return;
        const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
        if (v === "") htmlEl.style.removeProperty(cssProp);
        else htmlEl.style.setProperty(cssProp, v);
      });
    });
  };
}

/**
 * Captures the given element to a PNG and opens the print dialog with that image.
 * Safe to call only in the browser; element must be in the DOM.
 */
export async function printElementAsImage(
  element: HTMLElement | null,
  options: PrintElementAsImageOptions = {}
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    const err = new Error("printElementAsImage is only available in the browser");
    options.onError?.(err);
    throw err;
  }
  if (!element || !element.isConnected) {
    const err = new Error("Element is not in the DOM");
    options.onError?.(err);
    throw err;
  }

  const quality = options.quality ?? "normal";
  const pixelRatio = options.pixelRatio ?? QUALITY_TO_RATIO[quality];
  const { onError } = options;

  try {
    const restoreShadows = stripShadowsForCapture(element);
    const restoreColors = inlineComputedColorsForCapture(element);
    try {
      const toPng = await getToPng();
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio,
        filter: defaultFilter,
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = dataUrl;
      });

      if (img.naturalWidth > MAX_IMAGE_DIMENSION || img.naturalHeight > MAX_IMAGE_DIMENSION) {
        throw new Error("Captured image exceeds maximum size");
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("Popup blocked. Allow popups to print.");
      }

      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="Print" />
        </body>
      </html>
    `);
      printWindow.document.close();
      printWindow.focus();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      };
    } finally {
      restoreColors();
      restoreShadows();
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
    throw error;
  }
}
