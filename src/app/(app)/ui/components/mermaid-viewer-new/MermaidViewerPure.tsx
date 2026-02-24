'use client';

import React from 'react';

/**
 * Pure presentational component for Mermaid diagram integration.
 * Renders the graph definition inside <pre> with class="mermaid" as required
 * by Mermaid's simplest integration: https://mermaid.ai/open-source/config/usage.html
 *
 * The parent must load the mermaid script and call mermaid.run() (or rely on
 * startOnLoad) so that Mermaid finds these elements and replaces them with SVG.
 */
export interface MermaidViewerPureProps {
  /** Mermaid diagram definition (e.g. graph LR, flowchart TD, sequenceDiagram, etc.) */
  definition: string;
  /** Optional className for the wrapper */
  className?: string;
}

export function MermaidViewerPure({ definition, className }: MermaidViewerPureProps) {
  return (
    <pre className={className ? `mermaid ${className}` : 'mermaid'} data-pre>
      {definition.trim()}
    </pre>
  );
}
