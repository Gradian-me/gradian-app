import React from 'react';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { GoToTop } from '@/gradian-ui/layout/go-to-top/components/GoToTop';
import { ModeToggle } from '@/gradian-ui/layout/mode-toggle/components/ModeToggle';
import { Logo } from '@/gradian-ui/layout/logo';
import { 
  getMarkdownPath,
  formatFilenameToTitle,
  extractFilename,
  generateMarkdownMetadata
} from '@/gradian-ui/data-display/markdown/utils/pathResolver';
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

  const filePath = path.join(process.cwd(), markdownPath);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');

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
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Documentation
                </div>
                <ModeToggle />
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
              stickyHeadings={['#', '##']}
              navigationHeadingLevels={[2]}
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

