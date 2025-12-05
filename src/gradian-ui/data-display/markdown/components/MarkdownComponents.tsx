'use client';

import React from 'react';
import { CodeComponent } from './markdown-elements/CodeComponent';
import { createHeadingComponent } from './markdown-elements/HeadingComponents';
import { UnorderedList, OrderedList, ListItem } from './markdown-elements/ListComponents';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from './markdown-elements/TableComponents';
import { Paragraph, Link, Blockquote, Strong, Emphasis, HorizontalRule } from './markdown-elements/TextComponents';
import { getStickyHeadingsChecker } from '../hooks/useStickyHeadings';

/**
 * Create custom components for ReactMarkdown with sticky headings support
 * @param stickyHeadings - Array of heading levels to make sticky (e.g., ['#', '##'])
 * @param markdownLoadedTimestamp - Timestamp when markdown finished loading (for triggering mermaid refresh)
 */
export function createMarkdownComponents(stickyHeadings: string[] = [], markdownLoadedTimestamp?: number) {
  const { isSticky } = getStickyHeadingsChecker(stickyHeadings);

  return {
    code: (props: any) => (
      <CodeComponent {...props} markdownLoadedTimestamp={markdownLoadedTimestamp} />
    ),
    h1: createHeadingComponent({ level: 1, isSticky }),
    h2: createHeadingComponent({ level: 2, isSticky }),
    h3: createHeadingComponent({ level: 3, isSticky }),
    h4: createHeadingComponent({ level: 4, isSticky }),
    p: Paragraph,
    ul: UnorderedList,
    ol: OrderedList,
    li: ListItem,
    a: Link,
    blockquote: Blockquote,
    table: Table,
    thead: TableHead,
    tbody: TableBody,
    tr: TableRow,
    th: TableHeader,
    td: TableCell,
    hr: HorizontalRule,
    strong: Strong,
    em: Emphasis,
  };
}

/**
 * Default markdown components (for backward compatibility)
 */
export const markdownComponents = createMarkdownComponents();
