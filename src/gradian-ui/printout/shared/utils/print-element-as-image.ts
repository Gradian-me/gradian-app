/**
 * Captures an HTML element as PNG (using html-to-image) and opens the browser print
 * dialog with that image so graphics (QR, barcodes, etc.) are preserved.
 * Reusable for ticket cards, receipts, or any element that should print as a single image.
 */

const MAX_IMAGE_DIMENSION = 4096;

/**
 * Do not pass backgroundColor to toPng/toCanvas: the library would overwrite the clone's
 * background (our inlined theme colors) and make the ticket transparent/wrong.
 * Leaving it unset keeps the inlined opaque background; canvas stays transparent
 * so printed output shows white around the ticket and the border radius is visible.
 */
async function getToPng() {
  const mod = await import("html-to-image");
  return mod.toPng;
}

async function getToCanvas() {
  const mod = await import("html-to-image");
  return mod.toCanvas;
}

/** Quality presets map to capture resolution (pixelRatio) for sharper print. */
export type PrintCaptureQuality = "draft" | "normal" | "high";

const QUALITY_TO_RATIO: Record<PrintCaptureQuality, number> = {
  draft: 1,
  normal: 1.5,
  high: 2,
};

/** How to capture the element: "png" uses toPng; "canvas" uses toCanvas then exports as PNG (e.g. for ticket cards). */
export type PrintExportType = "png" | "canvas";

export interface PrintElementAsImageOptions {
  /**
   * Capture quality: draft (1x), normal (2x), high (3x). Higher = sharper print.
   * Use this instead of pixelRatio for better quality without touching ratio numbers.
   */
  quality?: PrintCaptureQuality;
  /** Pixel ratio for capture (overridden by quality if both set). Default from quality. */
  pixelRatio?: number;
  /**
   * Export method: "png" = html-to-image toPng; "canvas" = toCanvas then toDataURL (use for ticket/card print).
   * @default "png"
   */
  exportType?: PrintExportType;
  /** Callback on error (e.g. show toast). */
  onError?: (error: Error) => void;
}

export interface DownloadElementAsImageOptions extends PrintElementAsImageOptions {
  /** Filename for the download (e.g. "ticket.png"). Default "image.png". */
  filename?: string;
}

/** Options for capturing element as data URL (e.g. for embedding in a QR code). */
export interface CaptureElementAsDataUrlOptions extends PrintElementAsImageOptions {
  /** If set, scale the capture so the longest side is at most this many pixels (reduces payload for QR). */
  maxDimension?: number;
}

/** Normalize thrown value (e.g. Event from html-to-image img.onerror) to an Error with a clear message. */
function normalizeCaptureError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err instanceof Event) return new Error(`Capture failed: ${err.type || "image load error"}`);
  return new Error(String(err));
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
  const exportType = options.exportType ?? "png";
  const { onError } = options;

  const captureOptions = {
    cacheBust: true,
    pixelRatio,
    filter: defaultFilter,
  };

  try {
    const restoreShadows = stripShadowsForCapture(element);
    const restoreColors = inlineComputedColorsForCapture(element);
    try {
      let dataUrl: string;
      if (exportType === "canvas") {
        const toCanvas = await getToCanvas();
        const canvas = await toCanvas(element, captureOptions);
        dataUrl = canvas.toDataURL("image/png");
      } else {
        const toPng = await getToPng();
        dataUrl = await toPng(element, captureOptions);
      }

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = dataUrl;
      });

      if (img.naturalWidth > MAX_IMAGE_DIMENSION || img.naturalHeight > MAX_IMAGE_DIMENSION) {
        throw new Error("Captured image exceeds maximum size");
      }

      const printHtml = `
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
      </html>`;

      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;width:0;height:0;border:0;overflow:hidden;clip:rect(0,0,0,0);";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error("Could not access iframe document");
      }

      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      const printTarget = iframe.contentWindow;
      if (!printTarget) {
        document.body.removeChild(iframe);
        throw new Error("Could not access iframe window");
      }

      const cleanup = () => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      };

      printTarget.onload = () => {
        printTarget.print();
        printTarget.onafterprint = cleanup;
      };
    } finally {
      restoreColors();
      restoreShadows();
    }
  } catch (err) {
    const error = normalizeCaptureError(err);
    onError?.(error);
    throw error;
  }
}

/**
 * Captures the given element and returns a PNG data URL (e.g. for use as QR payload so scan opens image offline).
 * Use maxDimension to keep the payload small enough to fit in a QR code.
 * Safe to call only in the browser; element must be in the DOM.
 */
export async function captureElementAsDataUrl(
  element: HTMLElement | null,
  options: CaptureElementAsDataUrlOptions = {}
): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    const err = new Error("captureElementAsDataUrl is only available in the browser");
    options.onError?.(err);
    throw err;
  }
  if (!element || !element.isConnected) {
    const err = new Error("Element is not in the DOM");
    options.onError?.(err);
    throw err;
  }

  const quality = options.quality ?? "draft";
  const pixelRatio = options.pixelRatio ?? QUALITY_TO_RATIO[quality];
  const exportType = options.exportType ?? "canvas";
  const maxDimension = options.maxDimension;
  const { onError } = options;

  const captureOptions = {
    cacheBust: true,
    pixelRatio,
    filter: defaultFilter,
  };

  try {
    const restoreShadows = stripShadowsForCapture(element);
    const restoreColors = inlineComputedColorsForCapture(element);
    try {
      let dataUrl: string;
      if (exportType === "canvas") {
        const toCanvas = await getToCanvas();
        const canvas = await toCanvas(element, captureOptions);
        dataUrl = canvas.toDataURL("image/png");
      } else {
        const toPng = await getToPng();
        dataUrl = await toPng(element, captureOptions);
      }

      if (maxDimension != null && maxDimension > 0) {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load capture"));
          img.src = dataUrl;
        });
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = Math.min(maxDimension / w, maxDimension / h, 1);
        if (scale < 1) {
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          const ctx = c.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, c.width, c.height);
            dataUrl = c.toDataURL("image/png");
          }
        }
      }

      return dataUrl;
    } finally {
      restoreColors();
      restoreShadows();
    }
  } catch (err) {
    const error = normalizeCaptureError(err);
    onError?.(error);
    throw error;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(parts[1] ?? "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * Captures the given element to a PNG blob and triggers a download.
 * Uses toBlob when exportType is "canvas", otherwise converts toPng data URL to blob.
 * Safe to call only in the browser; element must be in the DOM.
 */
export async function downloadElementAsImage(
  element: HTMLElement | null,
  options: DownloadElementAsImageOptions = {}
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    const err = new Error("downloadElementAsImage is only available in the browser");
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
  const exportType = options.exportType ?? "png";
  const filename = options.filename ?? "image.png";
  const { onError } = options;

  const captureOptions = {
    cacheBust: true,
    pixelRatio,
    filter: defaultFilter,
  };

  try {
    const restoreShadows = stripShadowsForCapture(element);
    const restoreColors = inlineComputedColorsForCapture(element);
    try {
      let blob: Blob;
      if (exportType === "canvas") {
        const toCanvas = await getToCanvas();
        const canvas = await toCanvas(element, captureOptions);
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/png",
            1
          );
        });
      } else {
        const toPng = await getToPng();
        const dataUrl = await toPng(element, captureOptions);
        blob = dataUrlToBlob(dataUrl);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      restoreColors();
      restoreShadows();
    }
  } catch (err) {
    const error = normalizeCaptureError(err);
    onError?.(error);
    throw error;
  }
}
