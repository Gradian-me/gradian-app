import { createElement, type ReactNode } from 'react';

export interface HighlightSegment {
  text: string;
  match: boolean;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRegex = (query: string): RegExp | null => {
  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const pattern = tokens.map(escapeRegExp).join('|');
  return new RegExp(`(${pattern})`, 'gi');
};

export const getHighlightSegments = (text: string, query: string): HighlightSegment[] => {
  if (!text || !query) {
    return [{ text, match: false }];
  }

  const regex = buildRegex(query);
  if (!regex) {
    return [{ text, match: false }];
  }

  const parts = text.split(regex).filter((part) => part !== '');

  if (parts.length === 0) {
    return [{ text, match: false }];
  }

  const loweredTokens = query
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  return parts.map((part) => ({
    text: part,
    match: loweredTokens.includes(part.toLowerCase()),
  }));
};

export const renderHighlightedText = (
  text: string,
  query: string,
  highlightClassName = 'bg-yellow-200 text-gray-900 rounded px-0.5'
): ReactNode => {
  if (!text || !query) {
    return text;
  }

  const segments = getHighlightSegments(text, query);
  const hasMatch = segments.some((segment) => segment.match);

  if (!hasMatch) {
    return text;
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


