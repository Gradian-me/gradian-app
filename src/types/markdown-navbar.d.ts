declare module 'markdown-navbar' {
  import { Component } from 'react';

  export interface MarkdownNavbarProps {
    source: string;
    className?: string;
    headingTopOffset?: number;
    updateHashAuto?: boolean;
    declarative?: boolean;
    ordered?: boolean;
    onNavItemClick?: (event: React.MouseEvent, element: HTMLElement, hashValue: string) => void;
    onHashChange?: (newHash: string, oldHash: string) => void;
  }

  const MarkdownNavbar: React.ComponentType<MarkdownNavbarProps>;
  export default MarkdownNavbar;
}
