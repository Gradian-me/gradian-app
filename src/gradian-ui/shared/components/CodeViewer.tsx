'use client';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/gradian-ui/shared/utils';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';

interface CodeViewerProps {
  code: string;
  programmingLanguage?: 'bash' | 'sh' | 'shell' | 'json' | 'yaml' | 'yml' | 'html' | 'css' | 'scss' | 'js' | 'jsx' | 'ts' | 'tsx' | 'python' | 'go' | 'rust' | 'java' | 'c' | 'cpp' | 'sql' | string;
  className?: string;
  title?: string;
  initialLineNumbers?: number; // Number of lines to show initially (default: 20)
  isEditable?: boolean; // Whether the code can be edited
  onChange?: (code: string) => void; // Callback when code changes (required if isEditable is true)
  onLanguageChange?: (language: string) => void; // Callback when language changes
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  programmingLanguage = 'ts',
  className,
  title,
  initialLineNumbers = 20,
  isEditable = false,
  onChange,
  onLanguageChange,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editableCode, setEditableCode] = useState(code);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync editableCode with code prop when code changes externally
  useEffect(() => {
    if (isEditable) {
      setEditableCode(code);
    }
  }, [code, isEditable]);

  // Available programming languages for the Select dropdown
  const availableLanguages = [
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' },
    { id: 'scss', label: 'SCSS' },
    { id: 'js', label: 'JavaScript' },
    { id: 'jsx', label: 'JSX' },
    { id: 'ts', label: 'TypeScript' },
    { id: 'tsx', label: 'TSX' },
    { id: 'json', label: 'JSON' },
    { id: 'yaml', label: 'YAML' },
    { id: 'python', label: 'Python' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
    { id: 'java', label: 'Java' },
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'sql', label: 'SQL' },
    { id: 'bash', label: 'Bash' },
    { id: 'sh', label: 'Shell' },
  ];

  const handleCodeChange = (newCode: string) => {
    setEditableCode(newCode);
    onChange?.(newCode);
  };

  const handleLanguageChange = (newLanguage: string) => {
    onLanguageChange?.(newLanguage);
  };

  // Use editableCode when editable, otherwise use code prop
  const currentCode = isEditable ? editableCode : code;

  // Count lines in code
  const totalLines = useMemo(() => {
    return currentCode.split('\n').length;
  }, [currentCode]);

  // Check if code needs truncation (only when not editable)
  const needsTruncation = !isEditable && totalLines > initialLineNumbers;

  // Get truncated code if needed
  const displayedCode = useMemo(() => {
    if (!needsTruncation || isExpanded) {
      return currentCode;
    }
    const lines = currentCode.split('\n');
    return lines.slice(0, initialLineNumbers).join('\n');
  }, [currentCode, needsTruncation, isExpanded, initialLineNumbers]);
  
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {title ?? 'Code Snippet'}
          </div>
          {isEditable ? (
            <div className="shrink-0">
              <Select
                config={{
                  name: 'code-language-select',
                  label: '',
                }}
                options={availableLanguages}
                value={programmingLanguage}
                onValueChange={handleLanguageChange}
                size="sm"
                className="w-32"
              />
            </div>
          ) : (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide inline-flex items-center gap-1', badgeClasses)}>
              {programmingLanguage}
            </span>
          )}
        </div>
        <CopyContent content={currentCode} />
      </div>
      <div className="overflow-hidden">
        {isEditable ? (
          <textarea
            ref={textareaRef}
            value={editableCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            className={cn(
              'w-full bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100',
              'font-mono text-sm leading-6 p-4',
              'border-0 outline-none resize-none',
              'focus:ring-0 focus:outline-none',
              'overflow-auto'
            )}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              whiteSpace: 'pre',
              wordBreak: 'normal',
              minHeight: '420px',
            }}
            spellCheck={false}
          />
        ) : (
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
                    borderRadius: 0
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
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
        )}
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


