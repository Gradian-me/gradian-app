/**
 * PDF Export Utility for Markdown Content
 * Exports markdown content as PDF with A4 portrait formatting
 */

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

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.779527559; // Conversion factor: 1mm = 3.779527559px at 96 DPI
const DEFAULT_MARGINS = {
  top: 20,
  right: 15,
  bottom: 20,
  left: 15,
};

/**
 * Exports HTML element to PDF with A4 portrait formatting
 */
export async function exportMarkdownToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PDF export is only available in the browser');
  }

  // Dynamically import libraries - use webpack magic comments to create separate chunks
  // This prevents webpack from trying to bundle these during SSR
  // @ts-expect-error - jsPDF types may not be available, but module exists at runtime
  const jsPDFModule = await import(/* webpackChunkName: "jspdf" */ 'jspdf');
  // @ts-expect-error - html2canvas types may not be available, but module exists at runtime
  const html2canvasModule = await import(/* webpackChunkName: "html2canvas" */ 'html2canvas');
  
  const jsPDF: any = jsPDFModule.jsPDF || jsPDFModule.default?.jsPDF || jsPDFModule.default;
  const html2canvas: any = html2canvasModule.default || html2canvasModule;

  const {
    filename = `markdown-export-${Date.now()}.pdf`,
    title = 'Markdown Document',
    margins = DEFAULT_MARGINS,
  } = options;

  try {
    // Calculate usable page dimensions in pixels
    const pageWidthPx = (A4_WIDTH_MM - margins.left - margins.right) * MM_TO_PX;
    const pageHeightPx = (A4_HEIGHT_MM - margins.top - margins.bottom) * MM_TO_PX;

    // Create a clone of the element for processing
    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.width = `${pageWidthPx}px`;
    document.body.appendChild(clonedElement);

    // Wait for any images to load
    await waitForImages(clonedElement);

    // Create canvas from HTML
    const canvas = await html2canvas(clonedElement, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: pageWidthPx,
      windowWidth: pageWidthPx,
    });

    // Clean up cloned element
    document.body.removeChild(clonedElement);

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
    console.error('Error exporting PDF:', error);
    throw new Error('Failed to export PDF. Please try again.');
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
    return new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Continue even if image fails to load
      // Timeout after 5 seconds
      setTimeout(() => resolve(), 5000);
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
  if (typeof window === 'undefined') {
    throw new Error('PDF export is only available in the browser');
  }

  // Dynamically import libraries - use webpack magic comments to create separate chunks
  // @ts-expect-error - jsPDF types may not be available, but module exists at runtime
  const jsPDFModule = await import(/* webpackChunkName: "jspdf" */ 'jspdf');
  const jsPDF: any = jsPDFModule.jsPDF || jsPDFModule.default?.jsPDF || jsPDFModule.default;

  const {
    filename = `markdown-export-${Date.now()}.pdf`,
    title = 'Markdown Document',
    margins = DEFAULT_MARGINS,
  } = options;

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
    console.error('Error exporting PDF (advanced):', error);
    // Fallback to canvas-based export
    return exportMarkdownToPdf(element, options);
  }
}

