/**
 * HTML Sanitization Utility
 * Uses DOMPurify to sanitize HTML content and prevent XSS attacks
 * Note: DOMPurify only works in browser environments, so we skip sanitization on the server
 */

import type { Config } from 'dompurify';

// Lazy load DOMPurify only in browser environment
let DOMPurify: any = null;

function getDOMPurify() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!DOMPurify) {
    try {
      // Dynamic import for browser-only usage
      DOMPurify = require('dompurify');
      // Handle both default export and named export
      if (DOMPurify.default) {
        DOMPurify = DOMPurify.default;
      }
    } catch (error) {
      console.warn('DOMPurify not available:', error);
      return null;
    }
  }
  
  return DOMPurify;
}

/**
 * Sanitize HTML content using DOMPurify
 * @param html - HTML string to sanitize
 * @param allowList - Optional list of allowed tags/attributes (default: safe markdown tags)
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(
  html: string,
  allowList?: {
    tags?: string[];
    attributes?: string[];
  }
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // On server-side, return HTML as-is (will be sanitized on client)
  if (typeof window === 'undefined') {
    return html;
  }

  const purify = getDOMPurify();
  if (!purify || typeof purify.sanitize !== 'function') {
    // Fallback: return HTML as-is if DOMPurify is not available
    console.warn('DOMPurify.sanitize is not available, returning unsanitized HTML');
    return html;
  }

  // Default configuration for markdown content (safe tags only)
  const defaultConfig: Config = {
    ALLOWED_TAGS: [
      'span', 'code', 'pre', 'strong', 'em', 'del', 'br',
      'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img'
    ],
    ALLOWED_ATTR: ['class', 'href', 'src', 'alt', 'title'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  };

  // Custom configuration if allowList provided
  const config: Config = allowList
    ? {
        ...defaultConfig,
        ALLOWED_TAGS: allowList.tags || defaultConfig.ALLOWED_TAGS,
        ALLOWED_ATTR: allowList.attributes || defaultConfig.ALLOWED_ATTR,
      }
    : defaultConfig;

  // Sanitize HTML (convert TrustedHTML to string if needed)
  const sanitized = purify.sanitize(html, config);
  return typeof sanitized === 'string' ? sanitized : String(sanitized);
}

/**
 * Sanitize SVG content (for Mermaid diagrams)
 * @param svg - SVG string to sanitize
 * @returns Sanitized SVG string
 */
export function sanitizeSvg(svg: string): string {
  if (!svg || typeof svg !== 'string') {
    return '';
  }

  // On server-side, return SVG as-is (will be sanitized on client)
  if (typeof window === 'undefined') {
    return svg;
  }

  const purify = getDOMPurify();
  if (!purify || typeof purify.sanitize !== 'function') {
    // Fallback: return SVG as-is if DOMPurify is not available
    console.warn('DOMPurify.sanitize is not available, returning unsanitized SVG');
    return svg;
  }

  // More permissive config for SVG (needed for Mermaid diagrams)
  const config: Config = {
    ALLOWED_TAGS: [
      'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
      'rect', 'text', 'tspan', 'foreignObject', 'defs', 'marker', 'use',
      'style', 'title', 'desc'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'width', 'height', 'viewBox', 'xmlns', 'xmlns:xlink',
      'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill',
      'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
      'transform', 'opacity', 'font-family', 'font-size', 'text-anchor',
      'dominant-baseline', 'href', 'xlink:href', 'style'
    ],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    // Allow SVG namespace
    NAMESPACE: 'http://www.w3.org/2000/svg',
  };

  // Sanitize SVG (convert TrustedHTML to string if needed)
  const sanitized = purify.sanitize(svg, config);
  return typeof sanitized === 'string' ? sanitized : String(sanitized);
}

/**
 * Sanitize HTML for contentEditable (allows only safe formatting tags)
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string safe for contentEditable
 */
export function sanitizeForContentEditable(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // On server-side, return HTML as-is (will be sanitized on client)
  if (typeof window === 'undefined') {
    return html;
  }

  const purify = getDOMPurify();
  if (!purify || typeof purify.sanitize !== 'function') {
    // Fallback: return HTML as-is if DOMPurify is not available
    console.warn('DOMPurify.sanitize is not available, returning unsanitized HTML');
    return html;
  }

  // Very restrictive config for contentEditable (only formatting tags)
  const config: Config = {
    ALLOWED_TAGS: ['span', 'code', 'pre', 'strong', 'em', 'del', 'br'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  };

  // Sanitize HTML (convert TrustedHTML to string if needed)
  const sanitized = purify.sanitize(html, config);
  return typeof sanitized === 'string' ? sanitized : String(sanitized);
}

