'use client';

import { useEffect, useRef } from 'react';

const DEFAULT_FAVICON_URL = '/logo/favicon.ico';
const FAVICON_SIZE = 32;
const BADGE_RADIUS = 10;
const BADGE_OFFSET = 2;
const MAX_DISPLAY = 99;
const BADGE_FILL = '#7c3aed';
const BADGE_STROKE = '#fff';

function getAllIconLinks(): HTMLLinkElement[] {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel~="icon"]'));
}

function getOrCreateIconLink(defaultHref: string): HTMLLinkElement {
  const links = getAllIconLinks();
  if (links.length > 0) return links[0];
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = defaultHref.startsWith('/') ? defaultHref : `${window.location.origin}/${defaultHref}`;
  document.head.appendChild(link);
  return link;
}

function drawBadgeOnContext(
  ctx: CanvasRenderingContext2D,
  displayCount: string,
): void {
  const cx = FAVICON_SIZE - BADGE_RADIUS - BADGE_OFFSET;
  const cy = BADGE_RADIUS + BADGE_OFFSET;
  ctx.beginPath();
  ctx.arc(cx, cy, BADGE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = BADGE_FILL;
  ctx.fill();
  ctx.strokeStyle = BADGE_STROKE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = BADGE_STROKE;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayCount, cx, cy);
}

/**
 * Draw favicon at full opacity, then badge on top. No fading.
 * If favicon fails to load or canvas is tainted, fallback: badge on neutral background (no red).
 */
function createFaviconWithBadge(
  count: number,
  faviconUrl: string,
  originalHref: string,
  allLinks: HTMLLinkElement[],
): void {
  const displayCount = count > MAX_DISPLAY ? `${MAX_DISPLAY}+` : String(count);
  const resolvedUrl =
    faviconUrl.startsWith('http') || faviconUrl.startsWith('/')
      ? faviconUrl
      : `${window.location.origin}/${faviconUrl}`;

  const applyToLinks = (dataUrl: string) => {
    if (dataUrl && dataUrl !== 'data:,') {
      allLinks.forEach((link) => {
        link.href = dataUrl;
      });
    }
  };

  const fallbackBadgeOnly = () => {
    const canvas = document.createElement('canvas');
    canvas.width = FAVICON_SIZE;
    canvas.height = FAVICON_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
    drawBadgeOnContext(ctx, displayCount);
    applyToLinks(canvas.toDataURL('image/png'));
  };

  const canvas = document.createElement('canvas');
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    fallbackBadgeOnly();
    return;
  }

  const img = new Image();
  img.onerror = fallbackBadgeOnly;
  img.onload = () => {
    try {
      ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
      drawBadgeOnContext(ctx, displayCount);
      applyToLinks(canvas.toDataURL('image/png'));
    } catch {
      fallbackBadgeOnly();
    }
  };
  img.src = resolvedUrl;
}

export interface UseFaviconBadgeOptions {
  /** Override favicon URL. Default: /logo/favicon.ico */
  faviconUrl?: string;
}

/**
 * When count > 0: draws the real favicon at full opacity with a violet badge overlay.
 * When count is 0 or undefined, or on unmount: restores the original favicon.
 */
export function useFaviconBadge(
  count: number | undefined,
  options: UseFaviconBadgeOptions = {}
) {
  const { faviconUrl = DEFAULT_FAVICON_URL } = options;
  const originalHrefRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.head) return;

    const primaryLink = getOrCreateIconLink(faviconUrl);
    const allLinks = getAllIconLinks();

    if (originalHrefRef.current === null) {
      const href = primaryLink.getAttribute('href') ?? primaryLink.href ?? '';
      originalHrefRef.current =
        href || (faviconUrl.startsWith('/') ? faviconUrl : `${window.location.origin}/${faviconUrl}`);
    }

    const originalHref = originalHrefRef.current;

    if (count == null || count <= 0) {
      allLinks.forEach((link) => {
        link.href = originalHref;
      });
      return;
    }

    createFaviconWithBadge(count, faviconUrl, originalHref, allLinks);

    return () => {
      getAllIconLinks().forEach((link) => {
        link.href = originalHref;
      });
    };
  }, [count, faviconUrl]);
}
