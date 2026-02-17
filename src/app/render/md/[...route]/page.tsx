import React from 'react';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { GoToTop } from '@/gradian-ui/layout/go-to-top/components/GoToTop';
import { Logo } from '@/gradian-ui/layout/logo';
import { 
  getMarkdownPath,
  formatFilenameToTitle,
  extractFilename,
  generateMarkdownMetadata
} from '@/gradian-ui/data-display/markdown/utils/pathResolver';
import { PageActionButtons } from '@/gradian-ui/layout/components/PageActionButtons';
import { MarkdownPageClient } from './MarkdownPageClient';

interface PageProps {
  params: Promise<{
    route: string[];
  }>;
  searchParams: Promise<{
    hideHeader?: string;
  }>;
}


export default async function MarkdownRenderPage({ params, searchParams }: PageProps) {
  const { route } = await params;
  const { hideHeader } = await searchParams;
  const shouldHideHeader = hideHeader === 'true' || hideHeader === '1';

  const markdownPath = getMarkdownPath(route);

  if (!markdownPath) {
    notFound();
  }

  // SECURITY: Validate path to prevent path traversal using security utility
  const { validateFilePath } = await import('@/gradian-ui/shared/utils/security-utils');
  const validatedPath = validateFilePath(markdownPath, process.cwd());
  if (!validatedPath) {
    notFound();
  }
  const resolvedPath = validatedPath;

  // SECURITY: Explicitly verify file has .md extension to prevent reading non-markdown files
  const normalizedPath = resolvedPath.toLowerCase();
  if (!normalizedPath.endsWith('.md')) {
    notFound();
  }

  // SECURITY: Restrict access to only allowed directories (docs and public markdown files)
  // Prevent access to source code, config files, and other sensitive project files.
  // Use base+sep so "src/docs" does not allow "src/docs-backup" (path prefix edge case)
  const allowedBasePaths = [
    path.resolve(process.cwd(), 'src', 'docs'),
    path.resolve(process.cwd(), 'public'),
  ];
  const isInAllowedDirectory = allowedBasePaths.some(allowedPath => {
    const baseWithSep = allowedPath + path.sep;
    return resolvedPath === allowedPath || resolvedPath.startsWith(baseWithSep);
  });
  if (!isInAllowedDirectory) {
    notFound();
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    notFound();
  }

  // SECURITY: Verify it's actually a file (not a directory)
  // Use lstatSync to detect symlinks and prevent symlink-based path traversal
  const stats = fs.lstatSync(resolvedPath);
  if (stats.isSymbolicLink()) {
    // SECURITY: Block symlinks to prevent accessing files outside allowed directories
    notFound();
  }
  if (!stats.isFile()) {
    notFound();
  }
  
  // SECURITY: Double-check resolved path after following symlink (if any)
  // This ensures even if a symlink exists, the final resolved path is still in allowed directory
  const realPath = fs.realpathSync(resolvedPath);
  const isRealPathInAllowedDirectory = allowedBasePaths.some(allowedPath => {
    const baseWithSep = allowedPath + path.sep;
    return realPath === allowedPath || realPath.startsWith(baseWithSep);
  });
  if (!isRealPathInAllowedDirectory) {
    notFound();
  }
  
  // SECURITY: Verify real path also ends with .md extension
  if (!realPath.toLowerCase().endsWith('.md')) {
    notFound();
  }

  // SECURITY: Read file with explicit encoding to prevent binary file injection
  // Use realPath to ensure we're reading the actual file (not a symlink)
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(realPath, 'utf8');
  } catch (error) {
    // SECURITY: Don't expose internal errors to prevent information leakage
    notFound();
  }

  // Extract filename and format title for header
  const fileName = extractFilename(markdownPath);
  const title = formatFilenameToTitle(fileName);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Minimal Header */}
      {!shouldHideHeader && (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Logo variant="auto" width={140} height={45} />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <PageActionButtons 
                  showHome={false} 
                  showDownload={false} 
                  showGoToUrl={false}
                  layout="inline"
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <div className="py-8">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <MarkdownPageClient
              content={fileContents}
              stickyHeadings={['##']}
              navigationHeadingLevels={[1, 2]}
              documentTitle={title}
              documentNumber={fileName}
            />
          </div>
        </div>
      </div>

      {/* GoToTop Button */}
      <GoToTop threshold={300} position="bottom-right" />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { route } = await params;
  return generateMarkdownMetadata(route);
}

