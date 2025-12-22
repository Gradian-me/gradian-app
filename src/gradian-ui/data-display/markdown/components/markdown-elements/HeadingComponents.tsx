'use client';

import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';

export interface HeadingProps {
  children?: React.ReactNode;
  id?: string;
  [key: string]: any;
}

interface HeadingComponentProps extends HeadingProps {
  level: number;
  isSticky: boolean;
}

function Heading({ level, isSticky, children, id, ...props }: HeadingComponentProps) {
  const baseClasses = {
    1: "text-3xl font-bold mt-10 mb-6 text-gray-900 dark:text-gray-100 border-b-2 border-gray-300 dark:border-gray-600 pb-3",
    2: "text-2xl font-bold mt-8 mb-5 text-gray-900 dark:text-gray-100 scroll-mt-20",
    3: "text-xl font-semibold mt-6 mb-4 text-gray-900 dark:text-gray-100 scroll-mt-20",
    4: "text-lg font-semibold mt-4 mb-3 text-gray-900 dark:text-gray-100 scroll-mt-20",
  };

  const stickyClasses = {
    1: "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-4",
    2: "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-3",
    3: "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-2",
    4: "sticky top-16 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-2 -mt-2 mb-2",
  };

  const className = cn(
    baseClasses[level as keyof typeof baseClasses],
    isSticky && stickyClasses[level as keyof typeof stickyClasses]
  );

  const headingProps = { id, className, ...props };

  switch (level) {
    case 1:
      return <h1 {...headingProps}>{children ?? null}</h1>;
    case 2:
      return <h2 {...headingProps}>{children ?? null}</h2>;
    case 3:
      return <h3 {...headingProps}>{children ?? null}</h3>;
    case 4:
      return <h4 {...headingProps}>{children ?? null}</h4>;
    default:
      return <h1 {...headingProps}>{children ?? null}</h1>;
  }
}

export interface CreateHeadingProps {
  level: number;
  isSticky: (level: number) => boolean;
}

export function createHeadingComponent({ level, isSticky }: CreateHeadingProps) {
  const HeadingComponent = ({ children, id, ...props }: HeadingProps) => (
    <Heading level={level} isSticky={isSticky(level)} id={id} {...props}>
      {children ?? null}
    </Heading>
  );
  HeadingComponent.displayName = `Heading${level}`;
  return HeadingComponent;
}

