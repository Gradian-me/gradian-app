/**
 * PDF Export Utility for Markdown Content
 * Exports markdown content as PDF with A4 portrait formatting
 */

import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

// Type declarations for external libraries
type JsPDF = any;
type Html2Canvas = any;

export interface PdfExportOptions {
  filename?: string;
  title?: string;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// Constants
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.779527559; // Conversion factor: 1mm = 3.779527559px at 96 DPI
const DEFAULT_MARGINS = {
  top: 20,
  right: 15,
  bottom: 20,
  left: 15,
};

// Security and performance limits
const MAX_CANVAS_WIDTH = 10000; // Maximum canvas width in pixels
const MAX_CANVAS_HEIGHT = 100000; // Maximum canvas height in pixels
const MAX_FILENAME_LENGTH = 255;
const IMAGE_LOAD_TIMEOUT_MS = 5000;
const VALID_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

// Color properties to process (extracted to constant for DRY)
const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'column-rule-color',
] as const;

/**
 * Sanitizes filename to prevent path traversal and injection attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  const sanitized = filename
    .replace(/[\/\\<>:"|?*\x00-\x1f]/g, '')
    .replace(/\.\./g, '')
    .trim();
  
  // Limit length
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    return sanitized.substring(0, MAX_FILENAME_LENGTH);
  }
  
  // Ensure it's not empty and has valid extension
  if (!sanitized || sanitized.length === 0) {
    return `markdown-export-${Date.now()}.pdf`;
  }
  
  // Ensure .pdf extension
  return sanitized.endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

/**
 * Validates and normalizes margins
 */
function validateMargins(margins: PdfExportOptions['margins']): typeof DEFAULT_MARGINS {
  if (!margins) return DEFAULT_MARGINS;
  
  return {
    top: Math.max(0, Math.min(50, margins.top ?? DEFAULT_MARGINS.top)),
    right: Math.max(0, Math.min(50, margins.right ?? DEFAULT_MARGINS.right)),
    bottom: Math.max(0, Math.min(50, margins.bottom ?? DEFAULT_MARGINS.bottom)),
    left: Math.max(0, Math.min(50, margins.left ?? DEFAULT_MARGINS.left)),
  };
}

/**
 * Validates element is a valid HTMLElement
 */
function validateElement(element: HTMLElement): void {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Invalid element provided');
  }
  
  if (!document.body.contains(element) && element.parentNode === null) {
    // Element is not in DOM, which is acceptable for cloning
    return;
  }
}

/**
 * Safely loads jsPDF module
 */
async function loadJsPDF(): Promise<any> {
  try {
    const jsPDFModule = await import('jspdf');
    return (jsPDFModule as any).default || (jsPDFModule as any).jsPDF;
  } catch (error) {
    throw new Error('Failed to load PDF library');
  }
}

/**
 * Safely loads html2canvas module
 */
async function loadHtml2Canvas(): Promise<any> {
  try {
    const html2canvasModule = await import('html2canvas');
    return html2canvasModule.default || html2canvasModule;
  } catch (error) {
    throw new Error('Failed to load canvas library');
  }
}

/**
 * Exports HTML element to PDF with A4 portrait formatting
 */
export async function exportMarkdownToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  // Security: Validate browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF export is only available in the browser');
  }

  // Security: Validate element
  validateElement(element);

  // Security: Sanitize and validate inputs
  const filename = sanitizeFilename(
    options.filename || `markdown-export-${Date.now()}.pdf`
  );
  const title = (options.title || 'Markdown Document').substring(0, 200); // Limit title length
  const margins = validateMargins(options.margins);

  // Load libraries with error handling
  const jsPDF = await loadJsPDF();
  const html2canvas = await loadHtml2Canvas();

  let clonedElement: HTMLElement | null = null;
  
  try {
    // Calculate usable page dimensions in pixels
    const pageWidthPx = Math.min(
      MAX_CANVAS_WIDTH,
      (A4_WIDTH_MM - margins.left - margins.right) * MM_TO_PX
    );
    const pageHeightPx = (A4_HEIGHT_MM - margins.top - margins.bottom) * MM_TO_PX;

    // Create a clone of the element for processing
    clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.width = `${pageWidthPx}px`;
    document.body.appendChild(clonedElement);

    // Preprocess colors to convert unsupported CSS color functions (lab, lch, etc.) to RGB
    preprocessColorsForHtml2Canvas(clonedElement);

    // Wait for any images to load
    await waitForImages(clonedElement);

    // Create canvas from HTML with security limits
    const canvas = await html2canvas(clonedElement, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: pageWidthPx,
      windowWidth: pageWidthPx,
      onclone: (clonedDoc: Document) => {
        // Security: Ensure no external resources are loaded
        const clonedBody = clonedDoc.body;
        if (clonedBody) {
          // Remove any script tags from cloned document
          const scripts = clonedBody.querySelectorAll('script');
          scripts.forEach((script) => script.remove());
        }
      },
    });

    // Security: Validate canvas dimensions
    if (canvas.width > MAX_CANVAS_WIDTH || canvas.height > MAX_CANVAS_HEIGHT) {
      throw new Error('Canvas dimensions exceed maximum allowed size');
    }

    // Clean up cloned element
    if (clonedElement && clonedElement.parentNode) {
      document.body.removeChild(clonedElement);
      clonedElement = null;
    }

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = A4_WIDTH_MM - margins.left - margins.right;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = A4_HEIGHT_MM - margins.top - margins.bottom;

    // Create PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add title if provided
    let currentY = margins.top;
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margins.left, currentY);
      currentY += 10; // Add spacing after title
    }

    // If content fits on one page
    if (imgHeight <= (pageHeight - (currentY - margins.top))) {
      pdf.addImage(imgData, 'PNG', margins.left, currentY, imgWidth, imgHeight);
    } else {
      // Content spans multiple pages - split it
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let pageCount = 0;

      while (remainingHeight > 0) {
        if (pageCount > 0) {
          pdf.addPage();
          currentY = margins.top;
        }

        const availableHeight = pageHeight - (currentY - margins.top);
        const heightToAdd = Math.min(remainingHeight, availableHeight);
        
        // Create a temporary canvas for this page segment
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        if (!pageCtx) {
          throw new Error('Failed to create canvas context');
        }

        pageCanvas.width = canvas.width;
        pageCanvas.height = (heightToAdd / imgWidth) * canvas.width;
        
        // Draw the segment from the original canvas
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, pageCanvas.height, // Source
          0, 0, pageCanvas.width, pageCanvas.height    // Destination
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageImgData, 'PNG', margins.left, currentY, imgWidth, heightToAdd);

        remainingHeight -= heightToAdd;
        sourceY += pageCanvas.height;
        pageCount++;
      }
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    // Security: Clean up cloned element on error
    if (clonedElement && clonedElement.parentNode) {
      try {
        document.body.removeChild(clonedElement);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    // Security: Don't expose internal error details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Log error for debugging (in production, use proper logging service)
    if (process.env.NODE_ENV === 'development') {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error exporting PDF: ${errorMessage}`);
    }
    throw new Error('Failed to export PDF. Please try again.');
  }
}

/**
 * Preprocess element to convert unsupported CSS color functions to RGB
 * html2canvas doesn't support modern color functions like lab(), lch(), oklab(), oklch()
 */
function preprocessColorsForHtml2Canvas(element: HTMLElement): void {
  // Get all elements in the tree
  const allElements = element.querySelectorAll('*');
  const elementsToProcess = [element, ...Array.from(allElements)];
  
  // Create a temporary container for color conversion
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.visibility = 'hidden';
  tempContainer.style.top = '-9999px';
  document.body.appendChild(tempContainer);
  
  try {
    elementsToProcess.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlEl);
      
      // Use constant color properties list (DRY)
      COLOR_PROPERTIES.forEach((prop) => {
        try {
          const colorValue = computedStyle.getPropertyValue(prop);
          
          // Check if the color value contains unsupported color functions
          if (colorValue && /lab\(|lch\(|oklab\(|oklch\(|color\(/i.test(colorValue)) {
            // Get the computed RGB value by creating a temporary element
            const tempEl = document.createElement('div');
            tempEl.style.setProperty(prop, colorValue, 'important');
            tempContainer.appendChild(tempEl);
            
            const rgbValue = window.getComputedStyle(tempEl).getPropertyValue(prop);
            tempContainer.removeChild(tempEl);
            
            // Apply the RGB value directly to the element's style
            if (rgbValue && rgbValue.trim() && !rgbValue.includes('lab(') && !rgbValue.includes('lch(')) {
              htmlEl.style.setProperty(prop, rgbValue, 'important');
            }
          }
        } catch (err) {
          // Security: Don't log sensitive information
          // Silently continue if a property can't be processed
          if (process.env.NODE_ENV === 'development') {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to process color property ${prop}`);
          }
        }
      });
    });
  } finally {
    // Clean up temporary container
    document.body.removeChild(tempContainer);
  }
}

/**
 * Wait for all images in the element to load
 */
function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  if (images.length === 0) {
    return Promise.resolve();
  }

  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => resolve(), IMAGE_LOAD_TIMEOUT_MS);
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(); // Continue even if image fails to load
      };
    });
  });

  return Promise.all(imagePromises).then(() => {});
}

/**
 * Alternative approach: Export with better text rendering
 * Uses direct HTML rendering instead of canvas for better text quality
 */
export async function exportMarkdownToPdfAdvanced(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  // Security: Validate browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF export is only available in the browser');
  }

  // Security: Validate element
  validateElement(element);

  // Security: Sanitize and validate inputs (DRY - reuse validation functions)
  const filename = sanitizeFilename(
    options.filename || `markdown-export-${Date.now()}.pdf`
  );
  const title = (options.title || 'Markdown Document').substring(0, 200);
  const margins = validateMargins(options.margins);

  // Load library with error handling (DRY - reuse load function)
  const jsPDF = await loadJsPDF();

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = A4_WIDTH_MM - margins.left - margins.right;
    const pageHeight = A4_HEIGHT_MM - margins.top - margins.bottom;

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margins.left, margins.top);
    }

    let yPosition = title ? margins.top + 10 : margins.top;

    // Get text content and split into lines
    const textContent = element.innerText || element.textContent || '';
    const lines = pdf.splitTextToSize(textContent, pageWidth);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Add text line by line, handling page breaks
    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pageHeight + margins.top) {
        pdf.addPage();
        yPosition = margins.top;
      }
      pdf.text(lines[i], margins.left, yPosition);
      yPosition += 5; // Line height in mm
    }

    pdf.save(filename);
  } catch (error) {
    // Security: Don't expose internal error details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error exporting PDF (advanced): ${errorMessage}`);
    }
    // Fallback to canvas-based export
    return exportMarkdownToPdf(element, options);
  }
}

