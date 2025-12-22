import fs from 'fs';
import path from 'path';
import { validateFilePath } from '@/gradian-ui/shared/utils/security-utils';

/**
 * Search recursively for markdown files in a directory
 */
function findMarkdownFile(dir: string, targetRoute: string): string | null {
  if (!fs.existsSync(dir)) return null;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    // SECURITY: Validate path to prevent path traversal
    // entry.name comes from fs.readdirSync which sanitizes directory entries
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
    // Path is validated below with startsWith check before use
    const fullPath = path.join(dir, entry.name);
    const resolvedPath = path.resolve(fullPath);
    const baseDir = path.resolve(dir);
    
    // SECURITY: Ensure the resolved path is within the base directory
    // This prevents directory traversal attacks (e.g., ../../../etc/passwd)
    if (!resolvedPath.startsWith(baseDir)) {
      continue; // Skip this entry if it's outside the base directory
    }
    
    if (entry.isDirectory()) {
      const found = findMarkdownFile(resolvedPath, targetRoute);
      if (found) return found;
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Match by filename (case-insensitive, with hyphens/underscores normalized)
      const fileName = entry.name.replace(/\.md$/, '').toLowerCase();
      const normalizedRoute = targetRoute.toLowerCase().replace(/[_-]/g, '-');
      const normalizedFileName = fileName.replace(/[_-]/g, '-');
      
      if (normalizedFileName === normalizedRoute || fileName === targetRoute.toLowerCase()) {
        return resolvedPath;
      }
    }
  }
  
  return null;
}

/**
 * Get markdown file path from route parameter array
 * Route array will be like: ['src', 'docs', 'form-embedding', 'THIRD_PARTY_CDN_GUIDE']
 * Or for backward compatibility: ['third-party-cdn-guide']
 * 
 * @param route - Array of route segments
 * @param docsBasePath - Base path to search for docs (default: 'src/docs')
 * @returns Relative path to markdown file or null if not found
 */
export function getMarkdownPath(
  route: string[],
  docsBasePath: string = 'src/docs'
): string | null {
  if (!route || route.length === 0) {
    return null;
  }

  // If route has multiple segments, treat it as a full path
  if (route.length > 1) {
    // Join segments with path separator
    const filePath = route.join('/');
    
    // Add .md extension if not present
    const fullPath = filePath.endsWith('.md') 
      ? filePath 
      : `${filePath}.md`;
    
    // SECURITY: Validate path to prevent path traversal using security utility
    const validatedPath = validateFilePath(fullPath, process.cwd());
    if (!validatedPath) {
      return null;
    }
    
    return path.relative(process.cwd(), validatedPath);
  }

  // Single segment: backward compatibility - try to find file automatically in docs directory
  const routeName = route[0];
  // SECURITY: Validate base path to prevent path traversal using security utility
  const validatedBasePath = validateFilePath(docsBasePath, process.cwd());
  if (!validatedBasePath) {
    return null;
  }
  
  const foundPath = findMarkdownFile(validatedBasePath, routeName);
  if (foundPath) {
    // SECURITY: Validate found path is within project root using security utility
    const validatedFoundPath = validateFilePath(foundPath, process.cwd());
    if (!validatedFoundPath) {
      return null;
    }
    // Return relative path from project root
    return path.relative(process.cwd(), validatedFoundPath);
  }

  return null;
}

/**
 * Format filename to title
 * Converts 'THIRD_PARTY_CDN_GUIDE' to 'Third Party Cdn Guide'
 */
export function formatFilenameToTitle(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Extract filename from markdown path
 */
export function extractFilename(markdownPath: string): string {
  return markdownPath.split('/').pop()?.replace(/\.md$/, '') || 'Documentation';
}

/**
 * Extract filename from route array
 * Used for generating metadata when the file path isn't available
 */
export function extractFilenameFromRoute(route: string[]): string {
  return route && route.length > 0
    ? route[route.length - 1].replace(/\.md$/, '')
    : 'Documentation';
}

/**
 * Generate metadata for markdown page
 */
export function generateMarkdownMetadata(route: string[]): {
  title: string;
  description: string;
} {
  const fileName = extractFilenameFromRoute(route);
  const title = formatFilenameToTitle(fileName);
  
  return {
    title: title || 'Documentation',
    description: `Documentation: ${fileName}`,
  };
}

