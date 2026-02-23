'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import 'markdown-navbar/dist/navbar.css';
import './markdown-navbar-theme.css';

const NAV_SKELETON_MIN_MS = 280;

function MarkdownNavSkeleton() {
  return (
    <div className="space-y-1.5 pt-1" aria-hidden>
      {[0.6, 0.85, 0.75, 0.9, 0.7, 0.8, 0.65].map((w, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded"
          style={{ width: `${w * 100}%` }}
        />
      ))}
    </div>
  );
}

const MarkdownNavbarLib = dynamic<import('markdown-navbar').MarkdownNavbarProps>(
  () => import('markdown-navbar').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <MarkdownNavSkeleton />,
  }
);

const ACTIVE_ANCHOR_SELECTOR = '.markdown-navigation .title-anchor.active';

export interface MarkdownNavigationProps {
  /** Markdown source string – headings are parsed from this to build the nav (required when using markdown-navbar) */
  source: string;
  /** Offset in px from top when scrolling to a heading (e.g. for sticky header) */
  headingTopOffset?: number;
  /** Whether to show numbered prefixes (1., 1.1, etc.) */
  ordered?: boolean;
  /** Whether to auto-update URL hash on scroll */
  updateHashAuto?: boolean;
  /** Use heading text as hash instead of heading-0, heading-1 (requires unique heading text) */
  declarative?: boolean;
  /** Callback when a nav item is clicked */
  onNavItemClick?: (event: React.MouseEvent, element: HTMLElement, hashValue: string) => void;
  /** Callback when hash changes (e.g. on scroll) */
  onHashChange?: (newHash: string, oldHash: string) => void;
  className?: string;
}

const HEADER_OFFSET = 100;

function scrollToHeading(hashValue: string, headerOffset: number): void {
  const withHash = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue;
  if (!withHash) return;

  // Package sets data-id; remark-slug sets id. Try both.
  const byDataId = document.querySelector(`[data-id="${withHash}"]`);
  const byId = document.getElementById(withHash);
  const target = (byDataId ?? byId) as HTMLElement | null;

  if (!target) return;

  const rect = target.getBoundingClientRect();
  const absoluteTop = rect.top + window.scrollY;
  const offsetPosition = Math.max(0, absoluteTop - headerOffset);

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
}

const SCROLL_NAV_DEBOUNCE_MS = 120;
/** If the first heading's top is below this (px) from viewport top, consider it "not in view" and keep last active */
const FIRST_HEADING_IN_VIEW_TOP_THRESHOLD = 80;
/** Px below ref line (headingTopOffset) to still consider a heading "at top" for correct active detection */
const VIEWPORT_ACTIVE_TOP_THRESHOLD = 120;

function getHashFromAnchor(anchor: Element): string {
  const href = anchor.getAttribute('href') ?? '';
  return href.replace(/^#/, '');
}

/** Scroll the currently active nav item into view within the nav sidebar (runs after library updates .active) */
function scrollActiveNavIntoView(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const container = containerRef.current;
  if (!container) return;
  const active = container.querySelector<HTMLElement>(ACTIVE_ANCHOR_SELECTOR);
  if (!active) return;
  active.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' });
}

/** True if the first heading element is within the viewport (user has actually scrolled to it). */
function isFirstHeadingInView(firstHeadingHash: string, headingTopOffset: number): boolean {
  const el =
    document.getElementById(firstHeadingHash) ??
    document.querySelector<HTMLElement>(`[data-id="${firstHeadingHash}"]`);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.top <= headingTopOffset + FIRST_HEADING_IN_VIEW_TOP_THRESHOLD && r.bottom >= 0;
}

/**
 * When the library sets active to the first item but the first heading isn't in view, re-apply
 * .active to the last active item. Called from MutationObserver so we run immediately after every
 * library re-render that sets first as active (library re-renders on every scroll).
 */
function applyKeepLastActive(
  container: HTMLDivElement,
  headingTopOffset: number,
  lastActiveHashRef: React.MutableRefObject<string | null>
): void {
  const anchors = container.querySelectorAll<HTMLElement>('.markdown-navigation .title-anchor');
  const firstAnchor = anchors[0];
  if (!firstAnchor) return;

  const activeEl = container.querySelector<HTMLElement>(ACTIVE_ANCHOR_SELECTOR);
  if (!activeEl || activeEl !== firstAnchor) return;

  const firstHeadingHash = getHashFromAnchor(firstAnchor);
  const lastActive = lastActiveHashRef.current;
  if (!lastActive || lastActive === firstHeadingHash) return;
  if (isFirstHeadingInView(firstHeadingHash, headingTopOffset)) return;

  firstAnchor.classList.remove('active');
  const lastAnchor = container.querySelector<HTMLElement>(
    `.title-anchor[href="#${CSS.escape(lastActive)}"]`
  );
  if (lastAnchor) lastAnchor.classList.add('active');
}

/**
 * Get the heading hash that should be active based on viewport (getBoundingClientRect).
 * The library uses offsetTop + window.scrollY which can be wrong with scroll containers or layout.
 * We use the last heading whose top is at or above the reference line (headingTopOffset + threshold).
 */
function getCorrectActiveHeadingHash(
  container: HTMLDivElement,
  headingTopOffset: number
): string | null {
  const anchors = container.querySelectorAll<HTMLElement>('.markdown-navigation .title-anchor');
  const refLine = headingTopOffset + VIEWPORT_ACTIVE_TOP_THRESHOLD;
  let lastHash: string | null = null;
  for (let i = 0; i < anchors.length; i++) {
    const hash = getHashFromAnchor(anchors[i]);
    if (!hash) continue;
    const el =
      document.getElementById(hash) ??
      document.querySelector<HTMLElement>(`[data-id="${CSS.escape(hash)}"]`);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    if (top <= refLine) lastHash = hash;
    else break;
  }
  // When no heading is at/above ref line (e.g. gap between sections or above first), return null
  // so we don't force first; applyKeepLastActive will keep last active.
  return lastHash;
}

/**
 * If the library's active item doesn't match the heading actually at the top of the viewport,
 * patch the nav to highlight the correct item (fixes threshold/offsetTop vs viewport mismatch).
 */
function applyCorrectActiveByViewport(
  container: HTMLDivElement,
  headingTopOffset: number,
  lastActiveHashRef: React.MutableRefObject<string | null>
): void {
  const correctHash = getCorrectActiveHeadingHash(container, headingTopOffset);
  if (!correctHash) return;
  const activeEl = container.querySelector<HTMLElement>(ACTIVE_ANCHOR_SELECTOR);
  const currentHash = activeEl ? getHashFromAnchor(activeEl) : null;
  if (currentHash === correctHash) return;
  const anchors = container.querySelectorAll<HTMLElement>('.markdown-navigation .title-anchor');
  anchors.forEach((a) => a.classList.remove('active'));
  const target = container.querySelector<HTMLElement>(
    `.title-anchor[href="#${CSS.escape(correctHash)}"]`
  );
  if (target) {
    target.classList.add('active');
    lastActiveHashRef.current = correctHash;
  }
}

export function MarkdownNavigation({
  source,
  headingTopOffset = HEADER_OFFSET,
  ordered = true,
  updateHashAuto = true,
  declarative = false,
  onNavItemClick,
  onHashChange,
  className,
}: MarkdownNavigationProps) {
  const trimmed = typeof source === 'string' ? source.trim() : '';
  const hasHeadings = /^#+\s/m.test(trimmed);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const scrollNavTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveHashRef = useRef<string | null>(null);
  const headingTopOffsetRef = useRef(headingTopOffset);
  headingTopOffsetRef.current = headingTopOffset;

  const handleNavItemClick = useCallback(
    (evt: React.MouseEvent, element: HTMLElement, hashValue: string) => {
      onNavItemClick?.(evt, element, hashValue);
      // Run after the package’s scroll so we override with correct position + smooth scroll
      const id = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue;
      setTimeout(() => scrollToHeading(id, headingTopOffset), 10);
    },
    [headingTopOffset, onNavItemClick]
  );

  const handleHashChange = useCallback(
    (newHash: string, oldHash: string) => {
      onHashChange?.(newHash, oldHash);
      if (scrollNavTimeoutRef.current) clearTimeout(scrollNavTimeoutRef.current);
      scrollNavTimeoutRef.current = setTimeout(() => {
        scrollNavTimeoutRef.current = null;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const container = navContainerRef.current;
            if (!container) return;
            const activeEl = container.querySelector<HTMLElement>(ACTIVE_ANCHOR_SELECTOR);
            if (activeEl) {
              const hash = getHashFromAnchor(activeEl);
              if (hash) lastActiveHashRef.current = hash;
            }
            scrollActiveNavIntoView(navContainerRef);
          });
        });
      }, SCROLL_NAV_DEBOUNCE_MS);
    },
    [onHashChange]
  );

  const runNavCorrections = useCallback(() => {
    const cont = navContainerRef.current;
    if (!cont) return;
    const offset = headingTopOffsetRef.current;
    // Fix wrong active when library uses offsetTop and we're in scroll container / RTL: use viewport position
    applyCorrectActiveByViewport(cont, offset, lastActiveHashRef);
    const activeEl = cont.querySelector<HTMLElement>(ACTIVE_ANCHOR_SELECTOR);
    const anchors = cont.querySelectorAll<HTMLElement>('.markdown-navigation .title-anchor');
    const firstAnchor = anchors[0];
    if (activeEl && activeEl !== firstAnchor && firstAnchor) {
      const hash = getHashFromAnchor(activeEl);
      if (hash) lastActiveHashRef.current = hash;
    }
    applyKeepLastActive(cont, offset, lastActiveHashRef);
  }, []);

  // Correct active item by viewport on scroll. Use double rAF so we run after the library's
  // scroll handler and re-render (library overwrites our patch otherwise, e.g. gap 5.3→5.4 shows first).
  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          runNavCorrections();
        });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [runNavCorrections]);

  // Re-apply viewport correction and "keep last active" whenever the library re-renders (class changes).
  // Run in rAF so we apply after the library's DOM update is complete.
  useEffect(() => {
    const container = navContainerRef.current;
    if (!container) return;
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => runNavCorrections());
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [runNavCorrections]);

  useEffect(() => {
    return () => {
      if (scrollNavTimeoutRef.current) clearTimeout(scrollNavTimeoutRef.current);
    };
  }, []);

  const [skeletonDone, setSkeletonDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSkeletonDone(true), NAV_SKELETON_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  if (!trimmed || !hasHeadings) {
    return null;
  }

  const labelOnThisPage = getT(TRANSLATION_KEYS.MARKDOWN_NAV_ON_THIS_PAGE);

  return (
    <nav className={cn('sticky top-20 self-start', className)} aria-label={labelOnThisPage}>
      <div className="bg-transparent">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 px-4 pt-4 font-sans">
          {labelOnThisPage}
        </h3>
        <ScrollArea className="h-[calc(100vh-10rem)] px-4 pb-4 scrollbar-hidden">
          <div
            ref={navContainerRef}
            className="gradian-markdown-nav relative ps-3 min-w-0 w-full"
            dir="auto"
          >
            {/* Vertical line connecting items */}
            <div className="absolute start-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 pointer-events-none" />
            {!skeletonDone ? (
              <MarkdownNavSkeleton />
            ) : (
              <MarkdownNavbarLib
                source={source}
                headingTopOffset={headingTopOffset}
                ordered={ordered}
                updateHashAuto={updateHashAuto}
                declarative={declarative}
                className="border-0"
                onNavItemClick={handleNavItemClick}
                onHashChange={handleHashChange}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </nav>
  );
}

MarkdownNavigation.displayName = 'MarkdownNavigation';
