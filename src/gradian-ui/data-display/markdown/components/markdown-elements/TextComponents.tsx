'use client';

import React from 'react';

export interface ParagraphProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export interface LinkProps {
  href?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export interface BlockquoteProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export interface StrongProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export interface EmphasisProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export function Paragraph({ children }: ParagraphProps) {
  return (
    <p dir="auto" className="mb-4 text-gray-700 dark:text-gray-300 leading-7">
      {children || ''}
    </p>
  );
}

export function Link({ href, children }: LinkProps) {
  return (
    <a
      href={href}
      className="text-violet-600 dark:text-violet-400 hover:underline"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children || ''}
    </a>
  );
}

export function Blockquote({ children }: BlockquoteProps) {
  return (
    <blockquote className="border-l-4 border-violet-500 dark:border-violet-400 ps-4 py-2 my-4 bg-violet-50 dark:bg-violet-950/20 italic text-gray-700 dark:text-gray-300">
      {children || ''}
    </blockquote>
  );
}

export function Strong({ children }: StrongProps) {
  return (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">
      {children || ''}
    </strong>
  );
}

export function Emphasis({ children }: EmphasisProps) {
  return (
    <em className="italic text-gray-700 dark:text-gray-300">{children || ''}</em>
  );
}

export function HorizontalRule() {
  return (
    <hr className="my-8 border-gray-200 dark:border-gray-700" />
  );
}

