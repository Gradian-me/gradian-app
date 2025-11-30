'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/gradian-ui/shared/utils';

export interface MarkdownNavigationProps {
  headings: Array<{ id: string; text: string; level: number }>;
  activeHeadingId?: string;
  onHeadingClick?: (id: string) => void;
  className?: string;
}

export function MarkdownNavigation({ 
  headings, 
  activeHeadingId, 
  onHeadingClick,
  className 
}: MarkdownNavigationProps) {
  if (headings.length === 0) {
    return null;
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100; // Account for sticky header
      
      // Get the element's position relative to the document
      const elementTop = element.offsetTop;
      const offsetPosition = elementTop - headerOffset;

      console.log(`Scrolling to heading #${id}`, { 
        elementTop, 
        offsetPosition, 
        headerOffset,
        scrollY: window.scrollY 
      });

      // Scroll to the element
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });

      // Update URL hash after a short delay to avoid interfering with scroll
      setTimeout(() => {
        window.history.pushState(null, '', `#${id}`);
      }, 100);

      onHeadingClick?.(id);
    } else {
      console.error(`Heading element with id "${id}" not found. Available headings:`, 
        headings.map(h => `#${h.id}`));
    }
  };

  return (
    <nav className={cn('sticky top-20 self-start', className)}>
      <div className="bg-transparent p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          On this page
        </h3>
        <ul className="space-y-1 relative pl-3">
          {/* Vertical line connecting items */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
          
          {headings.map((heading) => {
            const isActive = activeHeadingId === heading.id;
            return (
              <li key={heading.id} className="relative">
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleClick(e, heading.id)}
                  className={cn(
                    'block text-sm py-1.5 px-2 rounded transition-colors relative',
                    'hover:text-gray-900 dark:hover:text-gray-200',
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                  style={{
                    paddingLeft: `${(heading.level - 2) * 12 + 8}px`
                  }}
                >
                  {/* Active indicator - blue bar on the left */}
                  {isActive && (
                    <span 
                      className="absolute left-[-12px] top-0 bottom-0 w-0.5 bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

MarkdownNavigation.displayName = 'MarkdownNavigation';

