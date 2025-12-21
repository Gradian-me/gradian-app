/**
 * HTML Sanitization Utility
 * Uses DOMPurify to sanitize HTML content and prevent XSS attacks
 */

import DOMPurify from 'dompurify';

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

  // Default configuration for markdown content (safe tags only)
  const defaultConfig: DOMPurify.Config = {
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
  const config: DOMPurify.Config = allowList
    ? {
        ...defaultConfig,
        ALLOWED_TAGS: allowList.tags || defaultConfig.ALLOWED_TAGS,
        ALLOWED_ATTR: allowList.attributes || defaultConfig.ALLOWED_ATTR,
      }
    : defaultConfig;

  // Sanitize HTML
  return DOMPurify.sanitize(html, config);
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

  // More permissive config for SVG (needed for Mermaid diagrams)
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
      'rect', 'text', 'tspan', 'foreignObject', 'defs', 'marker', 'use',
      'style', 'title', 'desc'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'width', 'height', 'viewBox', 'xmlns', 'xmlns:xlink',
      'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill',
      'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'transform', 'opacity', 'font-family', 'font-size', 'text-anchor',
      'dominant-baseline', 'href', 'xlink:href', 'style'
    ],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    // Allow SVG namespace
    NAMESPACE: 'http://www.w3.org/2000/svg',
  };

  return DOMPurify.sanitize(svg, config);
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

  // Very restrictive config for contentEditable (only formatting tags)
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: ['span', 'code', 'pre', 'strong', 'em', 'del', 'br'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(html, config);
}

