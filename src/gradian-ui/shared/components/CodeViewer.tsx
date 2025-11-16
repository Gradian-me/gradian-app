 'use client';
import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';

interface CodeViewerProps {
  code: string;
  programmingLanguage?: 'bash' | 'sh' | 'shell' | 'json' | 'yaml' | 'yml' | 'html' | 'css' | 'scss' | 'js' | 'jsx' | 'ts' | 'tsx' | 'python' | 'go' | 'rust' | 'java' | 'c' | 'cpp' | 'sql' | string;
  className?: string;
  title?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  programmingLanguage = 'ts',
  className,
  title,
}) => {
  const langClass = programmingLanguage ? `language-${programmingLanguage}` : '';
  const lang = String(programmingLanguage || '').toLowerCase();
  const badgeClasses = (() => {
    switch (lang) {
      case 'ts':
      case 'tsx':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'js':
      case 'jsx':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'python':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100';
      case 'go':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-800 dark:text-cyan-100';
      case 'rust':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
      case 'java':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'c':
      case 'cpp':
        return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100';
      case 'bash':
      case 'sh':
      case 'shell':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100';
      case 'json':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100';
      case 'yaml':
      case 'yml':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100';
      case 'html':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-800 dark:text-rose-100';
      case 'css':
      case 'scss':
        return 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-800 dark:text-fuchsia-100';
      case 'sql':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-800 dark:text-violet-100';
      default:
        return 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  })();
  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-violet-50 dark:bg-violet-950/30', className)}>
      <div className="flex items-center justify-between px-3 py-2 bg-violet-100 dark:bg-violet-900">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-medium text-violet-900 dark:text-violet-100 truncate">
            {title ?? 'Code Snippet'}
          </div>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide inline-flex items-center gap-1', badgeClasses)}>
            {programmingLanguage}
          </span>
        </div>
        <CopyContent content={code} />
      </div>
      <pre className={cn('text-sm leading-6 m-0 p-3 overflow-auto bg-white dark:bg-gray-900', langClass)}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

CodeViewer.displayName = 'CodeViewer';


