export interface MarkdownViewerProps {
  content: string;
  showToggle?: boolean;
  /**
   * Enable editor mode with three-way toggle (editor/preview/raw)
   * When true, allows editing the markdown content
   */
  isEditable?: boolean;
  /**
   * Callback fired when content changes (only used when isEditable is true)
   */
  onChange?: (content: string) => void;
  /**
   * Array of heading levels to make sticky on scroll (as markdown syntax)
   * Example: ['#', '##'] makes h1 and h2 headings sticky
   */
  stickyHeadings?: string[];
  /**
   * Array of heading levels to show in navigation (as numbers)
   * Example: [1, 2] shows h1 and h2 headings in navigation
   */
  navigationHeadingLevels?: number[];
  /**
   * Callback to provide extracted headings and active heading ID
   */
  onNavigationData?: (data: { headings: Array<{ id: string; text: string; level: number }>; activeHeadingId?: string }) => void;
  /**
   * AI Agent ID for enhancing markdown content (e.g., "professional-writing")
   * When provided, shows an "Enhance with AI" button in the header
   */
  aiAgentId?: string;
}

export interface TableParseResult {
  headers: string[];
  data: Record<string, any>[];
}

