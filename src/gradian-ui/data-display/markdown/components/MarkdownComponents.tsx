'use client';

import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { TableWrapper } from '../../table/components/TableWrapper';
import { parseMarkdownTable, createTableColumns, createTableConfig } from '../utils/tableParser';

/**
 * Create custom components for ReactMarkdown with sticky headings support
 * @param stickyHeadings - Array of heading levels to make sticky (e.g., ['#', '##'])
 */
export function createMarkdownComponents(stickyHeadings: string[] = []) {
  // Determine which heading levels should be sticky
  const isSticky = (level: number): boolean => {
    const headingMark = '#'.repeat(level);
    return stickyHeadings.includes(headingMark);
  };

  return {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    if (!inline && match) {
      return (
        <div className="my-4">
          <CodeViewer
            code={String(children).replace(/\n$/, '')}
            programmingLanguage={language}
            title={language}
          />
        </div>
      );
    }
    
    return (
      <code 
        className="bg-gray-100 dark:bg-gray-700/50 dark:border dark:border-gray-600/50 px-1.5 py-0.5 rounded text-sm font-mono text-gray-900 dark:text-gray-100 dark:shadow-sm" 
        {...props}
      >
        {children}
      </code>
    );
  },
  h1: ({ children, id, ...props }: any) => {
    const sticky = isSticky(1);
    // remark-slug provides the id prop automatically
    return (
      <h1 
        id={id}
        className={cn(
          "text-3xl font-bold mt-12 mb-6 text-gray-900 dark:text-gray-100 border-b-2 border-gray-300 dark:border-gray-600 pb-3",
          sticky && "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-4"
        )}
        {...props}
      >
        {children}
      </h1>
    );
  },
  h2: ({ children, id, ...props }: any) => {
    const sticky = isSticky(2);
    // remark-slug provides the id prop automatically
    return (
      <h2 
        id={id}
        className={cn(
          "text-2xl font-bold mt-10 mb-5 text-gray-900 dark:text-gray-100 scroll-mt-20",
          sticky && "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-3"
        )}
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children, id, ...props }: any) => {
    const sticky = isSticky(3);
    // remark-slug provides the id prop automatically
    return (
      <h3 
        id={id}
        className={cn(
          "text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 scroll-mt-20",
          sticky && "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-2"
        )}
        {...props}
      >
        {children}
      </h3>
    );
  },
  h4: ({ children, id, ...props }: any) => {
    const sticky = isSticky(4);
    // remark-slug provides the id prop automatically
    return (
      <h4 
        id={id}
        className={cn(
          "text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100 scroll-mt-20",
          sticky && "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-2"
        )}
        {...props}
      >
        {children}
      </h4>
    );
  },
  p: ({ children }: any) => (
    <p className="mb-4 text-gray-700 dark:text-gray-300 leading-7">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc ml-6 mb-4 space-y-1 text-gray-700 dark:text-gray-300">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal ml-6 mb-4 space-y-1 text-gray-700 dark:text-gray-300">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="mb-1">{children}</li>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      className="text-violet-600 dark:text-violet-400 hover:underline"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-violet-500 dark:border-violet-400 pl-4 py-2 my-4 bg-violet-50 dark:bg-violet-950/20 italic text-gray-700 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  table: ({ node, children }: any) => {
    const parsed = parseMarkdownTable(node);
    
    if (!parsed) {
      // Fallback to default table rendering if parsing fails
      return (
        <div className="overflow-x-auto my-6">
          <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
            {children}
          </table>
        </div>
      );
    }
    
    const { headers, data } = parsed;
    const columns = createTableColumns(headers);
    const tableConfig = createTableConfig(columns, data);
    
    return (
      <div className="my-6">
        <TableWrapper
          tableConfig={tableConfig}
          columns={columns}
          data={data}
          showCards={false}
          disableAnimation={false}
        />
      </div>
    );
  },
  thead: ({ children }: any) => (
    <thead className="bg-gray-50 dark:bg-gray-700">{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider border border-gray-200 dark:border-gray-700">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
      {children}
    </td>
  ),
  hr: () => (
    <hr className="my-8 border-gray-200 dark:border-gray-700" />
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">
      {children}
    </strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
  ),
  };
}

/**
 * Default markdown components (for backward compatibility)
 */
export const markdownComponents = createMarkdownComponents();

