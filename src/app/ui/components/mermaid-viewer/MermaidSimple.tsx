'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

interface MermaidSimpleProps {
  diagram: string;
  className?: string;
}

let initialized = false;
let currentTheme = '';

export function MermaidSimple({ diagram, className }: MermaidSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const isDark = (resolvedTheme || 'dark') === 'dark';

  useEffect(() => {
    const theme = isDark ? 'dark' : 'default';
    
    if (!initialized || currentTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme,
        themeVariables: {
          // Violet-based color scheme for readability in both modes
          primaryColor: isDark ? '#8b5cf6' : '#7c3aed',
          primaryTextColor: isDark ? '#e9d5ff' : '#4c1d95',
          primaryBorderColor: isDark ? '#a78bfa' : '#6d28d9',
          lineColor: isDark ? '#a78bfa' : '#7c3aed',
          secondaryColor: isDark ? '#a78bfa' : '#8b5cf6',
          tertiaryColor: isDark ? '#c4b5fd' : '#a78bfa',
          background: isDark ? '#1f2937' : '#ffffff',
          mainBkgColor: isDark ? '#1f2937' : '#ffffff',
          secondBkgColor: isDark ? '#374151' : '#f9fafb',
          textColor: isDark ? '#f3f4f6' : '#1f2937',
          edgeLabelBackground: isDark ? '#374151' : '#f3f4f6',
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          nodeBorder: isDark ? '#a78bfa' : '#7c3aed',
          nodeBkg: isDark ? '#1f2937' : '#ffffff',
          clusterBkg: isDark ? '#374151' : '#f9fafb',
          clusterBorder: isDark ? '#8b5cf6' : '#7c3aed',
          defaultLinkColor: isDark ? '#a78bfa' : '#7c3aed',
          titleColor: isDark ? '#f3f4f6' : '#1f2937',
        },
      });
      initialized = true;
      currentTheme = theme;
    }
  }, [isDark]);

  useEffect(() => {
    if (!containerRef.current || !diagram) return;

    setError(null);
    containerRef.current.innerHTML = '';
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    mermaid.render(id, diagram).then((result) => {
      if (containerRef.current) {
        containerRef.current.innerHTML = result.svg;
        
        // Add rounded corners to all rectangles
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          const rects = svg.querySelectorAll('rect');
          rects.forEach((rect) => {
            // Add roundness if not already set (preserve existing rx/ry)
            const currentRx = rect.getAttribute('rx');
            if (!currentRx || currentRx === '0') {
              rect.setAttribute('rx', '6');
              rect.setAttribute('ry', '6');
            }
          });
        }
      }
    }).catch((err) => {
      console.error('Mermaid render error:', err);
      setError(err.message || 'Failed to render diagram');
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    });
  }, [diagram, isDark]);

  if (error) {
    return (
      <div className={`p-4 text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded ${className}`}>
        <p className="font-semibold mb-1">Mermaid Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}

