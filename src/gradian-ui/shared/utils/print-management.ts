/**
 * Print Management Utilities
 * General-purpose utilities for printing HTML elements with style preservation and header support
 */

import type { PrintOptions, PrintHeaderConfig } from '../types/print-management';
import { loggingCustom } from './logging-custom';
import { LogType } from '../configs/log-config';

// Constants
const PRINT_CONTAINER_ID = 'gradian-print-container';
const PRINT_STYLE_ID = 'gradian-print-styles';
const IMAGE_LOAD_TIMEOUT_MS = 5000;
const HEADER_HEIGHT = 70; // Height of header in pixels

/**
 * Validates that logoUrl is a safe URL
 */
function validateLogoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.href);
    // Allow http, https, and data URLs
    return ['http:', 'https:', 'data:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Waits for an image to load
 */
function waitForImage(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (img.complete && img.naturalHeight !== 0) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve(); // Continue even if image fails to load
    }, IMAGE_LOAD_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(); // Continue even if image fails to load
    };
  });
}

/**
 * Creates a print header element with logo, document number, and title
 */
export function createPrintHeader(options: PrintHeaderConfig): HTMLElement {
  const header = document.createElement('div');
  header.className = 'gradian-print-header';
  header.setAttribute('data-print-header', 'true');

  // Create header content container
  const headerContent = document.createElement('div');
  headerContent.style.display = 'flex';
  headerContent.style.alignItems = 'center';
  headerContent.style.justifyContent = 'space-between';
  headerContent.style.width = '100%';
  headerContent.style.padding = '10px 20px';
  headerContent.style.borderBottom = '2px solid #000';
  headerContent.style.backgroundColor = '#ffffff';
  headerContent.style.minHeight = `${HEADER_HEIGHT - 20}px`;

  // Left side: Logo
  const leftSection = document.createElement('div');
  leftSection.style.display = 'flex';
  leftSection.style.alignItems = 'center';
  leftSection.style.flex = '0 0 auto';

  if (options.logoUrl && validateLogoUrl(options.logoUrl)) {
    const logoImg = document.createElement('img');
    logoImg.src = options.logoUrl;
    logoImg.alt = 'Logo';
    logoImg.style.maxHeight = '50px';
    logoImg.style.maxWidth = '200px';
    logoImg.style.objectFit = 'contain';
    leftSection.appendChild(logoImg);
  }

  // Right side: Document info
  const rightSection = document.createElement('div');
  rightSection.style.display = 'flex';
  rightSection.style.flexDirection = 'column';
  rightSection.style.alignItems = 'flex-end';
  rightSection.style.flex = '1 1 auto';
  rightSection.style.textAlign = 'right';
  rightSection.style.marginLeft = '20px';

  if (options.documentNumber) {
    const docNumber = document.createElement('div');
    docNumber.textContent = `Document: ${options.documentNumber}`;
    docNumber.style.fontSize = '12px';
    docNumber.style.fontWeight = '600';
    docNumber.style.marginBottom = '4px';
    rightSection.appendChild(docNumber);
  }

  if (options.documentTitle) {
    const docTitle = document.createElement('div');
    docTitle.textContent = options.documentTitle;
    docTitle.style.fontSize = '14px';
    docTitle.style.fontWeight = '700';
    rightSection.appendChild(docTitle);
  }

  headerContent.appendChild(leftSection);
  headerContent.appendChild(rightSection);
  header.appendChild(headerContent);

  return header;
}

/**
 * Copies computed styles from source element to target element
 */
function copyComputedStyles(source: HTMLElement, target: HTMLElement): void {
  const computedStyle = window.getComputedStyle(source);
  const style = target.style;

  // Copy all CSS properties
  for (let i = 0; i < computedStyle.length; i++) {
    const prop = computedStyle[i];
    const value = computedStyle.getPropertyValue(prop);
    style.setProperty(prop, value, computedStyle.getPropertyPriority(prop));
  }
}

/**
 * Recursively clones element and preserves styles
 */
function cloneElementWithStyles(element: HTMLElement): HTMLElement {
  const cloned = element.cloneNode(false) as HTMLElement;
  copyComputedStyles(element, cloned);

  // Clone children
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      cloned.appendChild(cloneElementWithStyles(child as HTMLElement));
    } else if (child.nodeType === Node.TEXT_NODE) {
      cloned.appendChild(child.cloneNode(true));
    }
  }

  return cloned;
}

/**
 * Extracts font-face declarations from stylesheets
 */
function extractFontFaces(): string {
  let fontFaces = '';
  const styleSheets = Array.from(document.styleSheets);

  for (const sheet of styleSheets) {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules || []);
      for (const rule of rules) {
        if (rule instanceof CSSFontFaceRule) {
          fontFaces += rule.cssText + '\n';
        }
      }
    } catch (e) {
      // Cross-origin stylesheets may throw errors, skip them
      if (process.env.NODE_ENV === 'development') {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `Could not access stylesheet: ${e}`);
      }
    }
  }

  return fontFaces;
}

/**
 * Clones element for printing with style preservation
 */
function cloneElementForPrint(element: HTMLElement, options?: PrintOptions): HTMLElement {
  // Validate element
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Invalid element provided for printing');
  }

  // Clone the element with styles
  const cloned = cloneElementWithStyles(element);

  // Remove interactive elements if needed
  if (options?.excludeSelectors) {
    options.excludeSelectors.forEach((selector) => {
      const elements = cloned.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });
  }

  // Remove script tags for security
  const scripts = cloned.querySelectorAll('script');
  scripts.forEach((script) => script.remove());

  // Add header if configured
  if (options?.header?.includeHeader) {
    const header = createPrintHeader(options.header);
    
    // Wrap content in a container to prevent header overlay
    const contentWrapper = document.createElement('div');
    contentWrapper.style.paddingTop = `${HEADER_HEIGHT}px`;
    contentWrapper.style.position = 'relative';
    contentWrapper.className = 'gradian-print-content-wrapper';
    
    // Move all existing children (except any existing header) to the wrapper
    const children = Array.from(cloned.childNodes);
    children.forEach((child) => {
      // Skip if it's already a header
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (el.getAttribute('data-print-header') === 'true') {
          return; // Skip existing header
        }
      }
      contentWrapper.appendChild(child);
    });
    
    // Clear cloned and add header and wrapper
    cloned.innerHTML = '';
    cloned.appendChild(header);
    cloned.appendChild(contentWrapper);
  }

  // Force light mode - remove dark mode classes and styles
  const removeDarkMode = (element: HTMLElement) => {
    // Remove dark mode classes
    element.classList.remove('dark');
    element.classList.remove('dark-mode');
    
    // Remove dark: prefixed classes
    const classesToRemove: string[] = [];
    element.classList.forEach((cls) => {
      if (cls.includes('dark:')) {
        classesToRemove.push(cls);
      }
    });
    classesToRemove.forEach((cls) => element.classList.remove(cls));
    
    // Recursively process children
    element.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.classList.remove('dark');
      htmlEl.classList.remove('dark-mode');
      const childClassesToRemove: string[] = [];
      htmlEl.classList.forEach((cls) => {
        if (cls.includes('dark:')) {
          childClassesToRemove.push(cls);
        }
      });
      childClassesToRemove.forEach((cls) => htmlEl.classList.remove(cls));
    });
  };
  
  removeDarkMode(cloned);

  return cloned;
}

/**
 * Injects print-specific styles
 */
function injectPrintStyles(clonedElement: HTMLElement, options?: PrintOptions): void {
  // Remove existing print styles if any
  const existingStyle = document.getElementById(PRINT_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;

  // Extract font faces
  const fontFaces = extractFontFaces();

  // Build print CSS
  const hasHeader = options?.header?.includeHeader;
  const headerMargin = hasHeader ? HEADER_HEIGHT : 0;

  const printCSS = `
    ${fontFaces}
    
    @page {
      size: A4 portrait;
      ${hasHeader ? `margin-top: ${HEADER_HEIGHT}px;` : 'margin: 0;'}
      margin-left: 15mm;
      margin-right: 15mm;
    }
    
    @media print {
      /* Hide everything except the print container */
      body * {
        visibility: hidden;
      }
      
      #${PRINT_CONTAINER_ID},
      #${PRINT_CONTAINER_ID} * {
        visibility: visible;
      }
      
      #${PRINT_CONTAINER_ID} {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0 15mm;
        background: white !important;
        color: #000 !important;
        box-sizing: border-box !important;
      }
      
      /* Force light mode - override dark mode styles aggressively */
      #${PRINT_CONTAINER_ID} * {
        background-color: transparent !important;
        color: #000 !important;
        border-color: #000 !important;
      }
      
      /* Override all dark mode classes */
      #${PRINT_CONTAINER_ID} .dark,
      #${PRINT_CONTAINER_ID} [class*="dark:"],
      #${PRINT_CONTAINER_ID} [class*="dark\\:"] {
        background-color: transparent !important;
        background: transparent !important;
        color: #000 !important;
        border-color: #000 !important;
      }
      
      /* Force light backgrounds for common elements */
      #${PRINT_CONTAINER_ID} .bg-gray-900,
      #${PRINT_CONTAINER_ID} .bg-gray-800,
      #${PRINT_CONTAINER_ID} .bg-gray-700,
      #${PRINT_CONTAINER_ID} .dark\\:bg-gray-900,
      #${PRINT_CONTAINER_ID} .dark\\:bg-gray-800,
      #${PRINT_CONTAINER_ID} .dark\\:bg-gray-700 {
        background-color: white !important;
        background: white !important;
      }
      
      /* Force dark text for readability */
      #${PRINT_CONTAINER_ID} .text-gray-100,
      #${PRINT_CONTAINER_ID} .text-gray-200,
      #${PRINT_CONTAINER_ID} .text-gray-300,
      #${PRINT_CONTAINER_ID} .dark\\:text-gray-100,
      #${PRINT_CONTAINER_ID} .dark\\:text-gray-200,
      #${PRINT_CONTAINER_ID} .dark\\:text-gray-300 {
        color: #000 !important;
      }
      
      /* Ensure Mermaid diagrams (SVG) are visible and properly styled */
      #${PRINT_CONTAINER_ID} svg,
      #${PRINT_CONTAINER_ID} .mermaid,
      #${PRINT_CONTAINER_ID} [class*="mermaid"] {
        visibility: visible !important;
        display: block !important;
        max-width: 100% !important;
        height: auto !important;
        background: white !important;
        color: #000 !important;
      }
      
      /* Ensure SVG elements in mermaid diagrams are visible */
      #${PRINT_CONTAINER_ID} svg * {
        visibility: visible !important;
        fill: #000 !important;
        stroke: #000 !important;
      }
      
      /* Override dark mode for SVG text */
      #${PRINT_CONTAINER_ID} svg text {
        fill: #000 !important;
        color: #000 !important;
      }
      
      body {
        margin: 0;
        padding: 0;
        background: white !important;
        color: #000 !important;
      }
      
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      ${hasHeader ? `
        .gradian-print-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: ${HEADER_HEIGHT}px;
          z-index: 1000;
          background: white !important;
          page-break-inside: avoid;
          margin: 0;
          padding: 0;
        }
        
        /* Content wrapper with padding to prevent header overlay */
        .gradian-print-content-wrapper {
          padding-top: ${HEADER_HEIGHT}px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          position: relative !important;
          box-sizing: border-box !important;
        }
      ` : ''}
      
      /* Table styles for print - ensure tables fit and are readable */
      /* First, ensure prose/article containers don't overflow */
      #${PRINT_CONTAINER_ID} .prose,
      #${PRINT_CONTAINER_ID} article {
        max-width: 100% !important;
        width: 100% !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      }
      
      /* Table container styles - keep tables together */
      #${PRINT_CONTAINER_ID} table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border: 1px solid #000 !important;
        margin: 10px 0 !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
        font-size: 9px !important;
        table-layout: fixed !important;
        box-sizing: border-box !important;
      }
      
      /* Ensure all table variants fit and stay together */
      #${PRINT_CONTAINER_ID} .prose table,
      #${PRINT_CONTAINER_ID} article table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
      }
      
      #${PRINT_CONTAINER_ID} table thead {
        display: table-header-group !important;
        background: #f5f5f5 !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
      }
      
      #${PRINT_CONTAINER_ID} table tbody {
        display: table-row-group !important;
        page-break-inside: avoid !important;
      }
      
      #${PRINT_CONTAINER_ID} table tr {
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
        border-bottom: 1px solid #000 !important;
      }
      
      #${PRINT_CONTAINER_ID} table th,
      #${PRINT_CONTAINER_ID} table td {
        border: 1px solid #000 !important;
        padding: 4px 3px !important;
        text-align: left !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        hyphens: auto !important;
        box-sizing: border-box !important;
        vertical-align: top !important;
        max-width: 0 !important;
      }
      
      #${PRINT_CONTAINER_ID} table th {
        background: #f5f5f5 !important;
        font-weight: bold !important;
        color: #000 !important;
        font-size: 8px !important;
      }
      
      #${PRINT_CONTAINER_ID} table td {
        background: white !important;
        color: #000 !important;
        font-size: 8px !important;
      }
      
      /* Equal column widths for better fit */
      #${PRINT_CONTAINER_ID} table th,
      #${PRINT_CONTAINER_ID} table td {
        width: auto !important;
      }
      
      /* For 3-column tables, use equal distribution */
      #${PRINT_CONTAINER_ID} table th:nth-child(1),
      #${PRINT_CONTAINER_ID} table td:nth-child(1) {
        width: 20% !important;
      }
      #${PRINT_CONTAINER_ID} table th:nth-child(2),
      #${PRINT_CONTAINER_ID} table td:nth-child(2) {
        width: 25% !important;
      }
      #${PRINT_CONTAINER_ID} table th:nth-child(3),
      #${PRINT_CONTAINER_ID} table td:nth-child(3) {
        width: 55% !important;
      }
      
      ${options?.printMediaQuery || ''}
    }
    
    @media screen {
      #${PRINT_CONTAINER_ID} {
        position: absolute;
        left: -9999px;
        top: -9999px;
        visibility: hidden;
      }
    }
  `;

  style.textContent = printCSS;
  document.head.appendChild(style);
}

/**
 * Waits for all images in element to load
 */
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const imagePromises = Array.from(images).map((img) => waitForImage(img as HTMLImageElement));
  await Promise.all(imagePromises);
}

/**
 * Waits for Mermaid diagrams to render (checks for SVG elements)
 */
async function waitForMermaidDiagrams(element: HTMLElement): Promise<void> {
  // Check if there are mermaid code blocks
  const mermaidBlocks = element.querySelectorAll('code.language-mermaid, pre code.language-mermaid');
  if (mermaidBlocks.length === 0) {
    return Promise.resolve();
  }

  // Wait for SVG elements to appear (mermaid renders as SVG)
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    const checkMermaid = () => {
      const svgs = element.querySelectorAll('svg');
      const mermaidContainers = element.querySelectorAll('[class*="mermaid"]');
      
      // If we have SVGs or mermaid containers, diagrams are likely rendered
      if (svgs.length > 0 || mermaidContainers.length > 0) {
        // Give a bit more time for SVG to fully render
        setTimeout(resolve, 200);
        return;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        // Timeout - continue anyway
        resolve();
        return;
      }
      
      setTimeout(checkMermaid, 100);
    };
    
    checkMermaid();
  });
}

/**
 * Opens print dialog with cloned element
 */
async function openPrintDialog(clonedElement: HTMLElement, options?: PrintOptions): Promise<void> {
  // Create print container if it doesn't exist
  let printContainer = document.getElementById(PRINT_CONTAINER_ID) as HTMLElement;
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = PRINT_CONTAINER_ID;
    document.body.appendChild(printContainer);
  }

  // Clear container and add cloned element
  printContainer.innerHTML = '';
  printContainer.appendChild(clonedElement);

  // Inject print styles
  injectPrintStyles(clonedElement, options);

  // Wait for images to load (including header logo)
  await waitForImages(clonedElement);
  
  // Wait for Mermaid diagrams to render
  await waitForMermaidDiagrams(clonedElement);

  // Set document title if provided
  if (options?.title) {
    const originalTitle = document.title;
    document.title = options.title;

    // Call before print callback
    options.onBeforePrint?.();

    // Wait a bit for styles to apply
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(undefined);
        });
      });
    });

    // Open print dialog
    window.print();

    // Restore title and clean up after print
    const restoreTitle = () => {
      document.title = originalTitle;
      options?.onAfterPrint?.();
      
      // Clean up after a delay to ensure print dialog is closed
      setTimeout(() => {
        if (printContainer && printContainer.parentNode) {
          printContainer.innerHTML = '';
        }
        const style = document.getElementById(PRINT_STYLE_ID);
        if (style) {
          style.remove();
        }
      }, 100);
    };

    // Listen for afterprint event
    window.addEventListener('afterprint', restoreTitle, { once: true });
    
    // Fallback: restore after timeout if afterprint doesn't fire
    setTimeout(restoreTitle, 1000);
  } else {
    options?.onBeforePrint?.();

    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(undefined);
        });
      });
    });

    window.print();

    const cleanup = () => {
      options?.onAfterPrint?.();
      setTimeout(() => {
        if (printContainer && printContainer.parentNode) {
          printContainer.innerHTML = '';
        }
        const style = document.getElementById(PRINT_STYLE_ID);
        if (style) {
          style.remove();
        }
      }, 100);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 1000);
  }
}

/**
 * Main function to print an element
 */
export async function printElement(element: HTMLElement, options?: PrintOptions): Promise<void> {
  // Security: Validate browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Print is only available in the browser');
  }

  // Security: Validate element
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Invalid element provided for printing');
  }

  try {
    // Clone element with styles
    const clonedElement = cloneElementForPrint(element, options);

    // Open print dialog
    await openPrintDialog(clonedElement, options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    loggingCustom(LogType.CLIENT_LOG, 'error', `Print error: ${errorMessage}`);
    throw new Error(`Failed to print: ${errorMessage}`);
  }
}

