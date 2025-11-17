'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/gradian-ui/shared/utils';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  programmingLanguage?: 'bash' | 'sh' | 'shell' | 'json' | 'yaml' | 'yml' | 'html' | 'css' | 'scss' | 'js' | 'jsx' | 'ts' | 'tsx' | 'python' | 'go' | 'rust' | 'java' | 'c' | 'cpp' | 'sql' | string;
  className?: string;
  title?: string;
  initialLineNumbers?: number; // Number of lines to show initially (default: 20)
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  programmingLanguage = 'ts',
  className,
  title,
  initialLineNumbers = 20,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Count lines in code
  const totalLines = useMemo(() => {
    return code.split('\n').length;
  }, [code]);

  // Check if code needs truncation
  const needsTruncation = totalLines > initialLineNumbers;

  // Get truncated code if needed
  const displayedCode = useMemo(() => {
    if (!needsTruncation || isExpanded) {
      return code;
    }
    const lines = code.split('\n');
    return lines.slice(0, initialLineNumbers).join('\n');
  }, [code, needsTruncation, isExpanded, initialLineNumbers]);
  
  // Map programming language to syntax highlighter language
  const mapLanguage = (lang: string): string => {
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'tsx',
      'js': 'javascript',
      'jsx': 'jsx',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'python': 'python',
      'go': 'go',
      'rust': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'sql': 'sql',
      'bash': 'bash',
      'sh': 'bash',
      'shell': 'bash',
    };
    return langMap[lang.toLowerCase()] || lang.toLowerCase();
  };

  const syntaxLanguage = mapLanguage(programmingLanguage);
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
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800', className)}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {title ?? 'Code Snippet'}
          </div>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide inline-flex items-center gap-1', badgeClasses)}>
            {programmingLanguage}
          </span>
        </div>
        <CopyContent content={code} />
      </div>
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          {mounted ? (
            <motion.div
              key={isExpanded ? 'expanded' : 'collapsed'}
              initial={{ opacity: 0, height: 'auto' }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <SyntaxHighlighter
                language={syntaxLanguage}
                style={nightOwl}
                showLineNumbers
                startingLineNumber={1}
                wrapLines
                wrapLongLines
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5rem',
                  borderRadius: 0,
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  },
                }}
                lineNumberStyle={{
                  minWidth: '3em',
                  paddingRight: '1em',
                  userSelect: 'none',
                }}
              >
                {displayedCode}
              </SyntaxHighlighter>
            </motion.div>
          ) : (
            <pre className={cn('text-sm leading-6 m-0 p-4 overflow-auto bg-gray-200 dark:bg-gray-600 font-mono text-gray-900 dark:text-gray-100')}>
              <code>{displayedCode}</code>
            </pre>
          )}
        </AnimatePresence>
        {needsTruncation && (
          <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
            {!isExpanded ? (
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center justify-center w-full px-3 py-1.5 border-2 border-dashed border-gray-400 dark:border-gray-500 rounded-lg text-gray-700 dark:text-gray-200 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/30 transition-colors duration-200 text-sm"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Show all {totalLines} lines
              </button>
            ) : (
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center justify-center w-full px-3 py-1.5 border-2 border-dashed border-gray-400 dark:border-gray-500 rounded-lg text-gray-700 dark:text-gray-200 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/30 transition-colors duration-200 text-sm"
              >
                <ChevronUp className="w-4 h-4 mr-2" />
                Collapse to first {initialLineNumbers} lines
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

CodeViewer.displayName = 'CodeViewer';


