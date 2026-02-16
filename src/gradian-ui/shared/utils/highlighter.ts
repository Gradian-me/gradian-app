import { createElement, type ReactNode } from 'react';

export interface HighlightSegment {
  text: string;
  match: boolean;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRegex = (query: string): RegExp | null => {
  if (typeof query !== 'string') return null;
  const tokens = query
    .split(/\s+/)
    .map((token) => (typeof token === 'string' ? token : '').trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const pattern = tokens.map(escapeRegExp).join('|');
  return new RegExp(`(${pattern})`, 'gi');
};

export const getHighlightSegments = (text: string, query: string): HighlightSegment[] => {
  const safeText = typeof text === 'string' ? text : String(text ?? '');
  const safeQuery = typeof query === 'string' ? query : String(query ?? '');
  if (!safeText || !safeQuery) {
    return [{ text: safeText, match: false }];
  }

  const regex = buildRegex(safeQuery);
  if (!regex) {
    return [{ text: safeText, match: false }];
  }

  const parts = safeText.split(regex).filter((part) => part !== '');

  if (parts.length === 0) {
    return [{ text: safeText, match: false }];
  }

  const loweredTokens = safeQuery
    .split(/\s+/)
    .map((token) => (typeof token === 'string' ? token : '').trim().toLowerCase())
    .filter(Boolean);

  return parts.map((part) => ({
    text: part,
    match: loweredTokens.includes((typeof part === 'string' ? part : '').toLowerCase()),
  }));
};

export const renderHighlightedText = (
  text: string,
  query: string,
  highlightClassName = 'bg-yellow-200 text-gray-900 rounded px-0.5'
): ReactNode => {
  const safeText = typeof text === 'string' ? text : String(text ?? '');
  const safeQuery = typeof query === 'string' ? query : String(query ?? '');
  if (!safeText || !safeQuery) {
    return safeText;
  }

  const segments = getHighlightSegments(safeText, safeQuery);
  const hasMatch = segments.some((segment) => segment.match);

  if (!hasMatch) {
    return safeText;
  }

  return segments.map((segment, index) =>
    segment.match
      ? createElement(
          'mark',
          {
            key: `highlight-${index}`,
            className: highlightClassName,
          },
          segment.text
        )
      : createElement(
          'span',
          {
            key: `text-${index}`,
          },
          segment.text
        )
  );
};


