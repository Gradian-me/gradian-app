/**
 * Print Management Types
 * Types for the general-purpose print management system
 */

/**
 * Configuration for print header that appears on all pages
 */
export interface PrintHeaderConfig {
  /**
   * Whether to include header on all pages
   */
  includeHeader: boolean;
  /**
   * Document number to display in header
   */
  documentNumber?: string;
  /**
   * Document title to display in header
   */
  documentTitle?: string;
  /**
   * URL of logo image to display in header
   */
  logoUrl?: string;
}

/**
 * Options for print functionality
 */
export interface PrintOptions {
  /**
   * Document title for print (meta title)
   */
  title?: string;
  /**
   * Header configuration
   */
  header?: PrintHeaderConfig;
  /**
   * CSS selectors to exclude from print
   */
  excludeSelectors?: string[];
  /**
   * Whether to include computed styles (default: true)
   */
  includeStyles?: boolean;
  /**
   * Custom print media query CSS
   */
  printMediaQuery?: string;
  /**
   * Callback before opening print dialog
   */
  onBeforePrint?: () => void;
  /**
   * Callback after print dialog closes
   */
  onAfterPrint?: () => void;
}

