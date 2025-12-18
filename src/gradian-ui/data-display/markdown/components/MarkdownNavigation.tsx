'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      
      // Use getBoundingClientRect() for accurate position relative to viewport
      // Then add current scroll position to get absolute document position
      const rect = element.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const offsetPosition = absoluteTop - headerOffset;

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

  // Build nested structure: level 1 headings with their level 2 children
  const buildNestedStructure = () => {
    const nested: Array<{
      heading: { id: string; text: string; level: number };
      children: Array<{ id: string; text: string; level: number }>;
    }> = [];

    let currentLevel1: typeof nested[0] | null = null;

    headings.forEach((heading) => {
      if (heading.level === 1) {
        // Start a new level 1 section
        if (currentLevel1) {
          nested.push(currentLevel1);
        }
        currentLevel1 = {
          heading,
          children: [],
        };
      } else if (heading.level === 2 && currentLevel1) {
        // Add as child of current level 1
        currentLevel1.children.push(heading);
      } else if (heading.level === 2) {
        // Level 2 without a parent level 1 - create a virtual level 1
        nested.push({
          heading: { id: '', text: '', level: 1 },
          children: [heading],
        });
      }
    });

    // Don't forget the last level 1
    if (currentLevel1) {
      nested.push(currentLevel1);
    }

    return nested;
  };

  const nestedStructure = buildNestedStructure();

  const renderHeadingLink = (heading: { id: string; text: string; level: number }, isNested = false) => {
    const isActive = activeHeadingId === heading.id;
    return (
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
      >
        {/* Active indicator - blue bar on the left */}
        {isActive && (
          <span 
            className="absolute left-[-12px] top-0 bottom-0 w-0.5 bg-blue-600 dark:bg-blue-400"
          />
        )}
        {heading.text}
      </a>
    );
  };

  return (
    <nav className={cn('sticky top-20 self-start', className)}>
      <div className="bg-transparent">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 px-4 pt-4">
          On this page
        </h3>
        <ScrollArea className="h-[calc(100vh-8rem)] px-4 pb-4">
          <ul className="space-y-1 relative ps-3">
            {/* Vertical line connecting items */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            
            {nestedStructure.map((section) => {
              // If level 1 heading exists (not virtual), render it
              const hasLevel1 = section.heading.id !== '';
              
              return (
                <li key={section.heading.id || `section-${section.children[0]?.id}`} className="relative">
                  {hasLevel1 && (
                    <div className="relative">
                      {renderHeadingLink(section.heading, false)}
                    </div>
                  )}
                  
                  {/* Render level 2 children as nested list */}
                  {section.children.length > 0 && (
                    <ul className={cn('space-y-1 mt-1', hasLevel1 && 'ms-4 ps-2 border-l border-gray-200 dark:border-gray-700')}>
                      {section.children.map((child) => (
                        <li key={child.id} className="relative">
                          {renderHeadingLink(child, true)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </div>
    </nav>
  );
}

MarkdownNavigation.displayName = 'MarkdownNavigation';

