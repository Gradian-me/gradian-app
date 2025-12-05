'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';

interface MermaidDiagramSimpleProps {
  diagram: string;
  className?: string;
}

// Global state to ensure mermaid is loaded and initialized only once
const globalMermaidState = {
  instance: null as any,
  initialized: false,
  currentTheme: '',
  loadingPromise: null as Promise<any> | null
};

export function MermaidDiagramSimple({ diagram, className }: MermaidDiagramSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const mountedRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastRenderKeyRef = useRef<string>('');
  const isRenderingRef = useRef<boolean>(false);

  // Clean and format the diagram code
  const cleanDiagram = useMemo(() => {
    if (!diagram?.trim()) return '';
    
    let cleaned = diagram.trim();
    
    // Remove markdown code block markers if present
    cleaned = cleaned.replace(/^```\s*mermaid\s*\n?/i, '');
    cleaned = cleaned.replace(/```\s*$/i, '');
    cleaned = cleaned.trim();
    
    // Fix any malformed arrows (spaces inside arrow operators)
    cleaned = cleaned.replace(/\s*--\s*>\s*/g, ' --> ');
    cleaned = cleaned.replace(/\s*==\s*>\s*/g, ' ==> ');
    
    // Split into lines and process each line
    let lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let diagramType = '';
    if (lines.length > 0) {
      const firstLine = lines[0];
      const diagramMatch = firstLine.match(/^(graph|flowchart|sequenceDiagram|gantt|pie|journey|classDiagram|stateDiagram|erDiagram|gitgraph|mindmap|timeline|quadrantChart|requirement)\s+(TD|LR|TB|BT|RL)/i);
      if (diagramMatch) {
        diagramType = `${diagramMatch[1]} ${diagramMatch[2]}`;
        lines = lines.slice(1);
      } else {
        const diagramMatchSimple = firstLine.match(/^(graph|flowchart|sequenceDiagram|gantt|pie|journey|classDiagram|stateDiagram|erDiagram|gitgraph|mindmap|timeline|quadrantChart|requirement)\s*$/i);
        if (diagramMatchSimple) {
          diagramType = diagramMatchSimple[1];
          lines = lines.slice(1);
        }
      }
    }
    
    // Process each line to fix spacing and concatenation
    const processedLines = lines.flatMap(line => {
      // Split if we find: closing bracket/brace/paren followed by node ID (without arrow in between)
      line = line.replace(/([\]\}\)])([A-Z0-9]+(?:\[|\(|\{))/gi, '$1 $2');
      
      // Split on arrows that are followed by a node (not edge labels)
      line = line.replace(/(-->(?:\|[^\|]+\|)?\s*)([A-Z0-9]+(?:\[|\(|\{))/gi, '$1\n$2');
      line = line.replace(/(==>(?:\|[^\|]+\|)?\s*)([A-Z0-9]+(?:\[|\(|\{))/gi, '$1\n$2');
      
      // Now split the line by newline characters that might have been introduced
      return line.split('\n').map(subLine => {
        // Fix spacing around arrows
        subLine = subLine.replace(/(\S)-->/g, '$1 -->');
        subLine = subLine.replace(/-->(?=\S)/g, '--> ');
        subLine = subLine.replace(/(\S)==>/g, '$1 ==>');
        subLine = subLine.replace(/==>(?=\S)/g, '==> ');
        
        // Fix node definitions: merge node ID with brackets/braces
        subLine = subLine.replace(/\b([A-Z0-9]+)\s+([\[\(\{])/gi, '$1$2');
        
        // Fix edge labels
        subLine = subLine.replace(/-->\s*\|\s*/g, ' -->|');
        subLine = subLine.replace(/\|\s*([^|]+)\s*\|/g, '|$1|');
        
        // Remove spaces inside brackets/braces/parentheses
        subLine = subLine.replace(/(\[)\s+/g, '$1');
        subLine = subLine.replace(/\s+(\])/g, '$1');
        subLine = subLine.replace(/(\{)\s+/g, '$1');
        subLine = subLine.replace(/\s+(\})/g, '$1');
        subLine = subLine.replace(/(\()\s+/g, '$1');
        subLine = subLine.replace(/\s+(\))/g, '$1');
        
        // Normalize multiple spaces to single space
        subLine = subLine.replace(/\s+/g, ' ').trim();
        
        return subLine;
      }).filter(subLine => subLine.length > 0);
    }).filter(line => line.length > 0);
    
    const result: string[] = [];
    if (diagramType) {
      result.push(diagramType);
    }
    result.push(...processedLines.map(line => '    ' + line));
    
    return result.join('\n').trim();
  }, [diagram]);

  // Create a stable render key
  const renderKey = useMemo(() => {
    if (!cleanDiagram) return '';
    const theme = resolvedTheme || 'dark';
    return `${cleanDiagram}-${theme}`;
  }, [cleanDiagram, resolvedTheme]);

  // Initialize mermaid (only once)
  const initializeMermaid = useCallback(async () => {
    // Always check window first in case it was loaded by another component
    if (typeof window !== 'undefined' && (window as any).mermaid) {
      if (!globalMermaidState.instance) {
        globalMermaidState.instance = (window as any).mermaid;
      }
      return globalMermaidState.instance;
    }

    if (globalMermaidState.instance) {
      return globalMermaidState.instance;
    }

    // If already loading, wait for it
    if (globalMermaidState.loadingPromise) {
      return globalMermaidState.loadingPromise;
    }

    // Start loading
    globalMermaidState.loadingPromise = new Promise<any>((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[data-mermaid-cdn]');
      if (existingScript) {
        // Wait for mermaid to be available
        const checkInterval = setInterval(() => {
          if ((window as any).mermaid) {
            clearInterval(checkInterval);
            globalMermaidState.instance = (window as any).mermaid;
            globalMermaidState.loadingPromise = null;
            resolve(globalMermaidState.instance);
          }
        }, 50);
        setTimeout(() => {
          clearInterval(checkInterval);
          if ((window as any).mermaid) {
            globalMermaidState.instance = (window as any).mermaid;
            globalMermaidState.loadingPromise = null;
            resolve(globalMermaidState.instance);
          } else {
            globalMermaidState.loadingPromise = null;
            reject(new Error('Mermaid loading timeout'));
          }
        }, 5000);
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.setAttribute('data-mermaid-cdn', 'true');
      script.textContent = `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.12.2/+esm';
        window.mermaid = mermaid;
        window.__mermaidReady = true;
        window.dispatchEvent(new CustomEvent('mermaidLoaded'));
      `;
      
      // Listen for custom event
      const handleMermaidLoaded = () => {
        window.removeEventListener('mermaidLoaded', handleMermaidLoaded);
        if ((window as any).mermaid) {
          globalMermaidState.instance = (window as any).mermaid;
          globalMermaidState.loadingPromise = null;
          resolve(globalMermaidState.instance);
        } else {
          globalMermaidState.loadingPromise = null;
          reject(new Error('Mermaid loaded but not found on window'));
        }
      };
      
      window.addEventListener('mermaidLoaded', handleMermaidLoaded);
      
      script.onerror = () => {
        window.removeEventListener('mermaidLoaded', handleMermaidLoaded);
        globalMermaidState.loadingPromise = null;
        reject(new Error('Failed to load Mermaid from CDN'));
      };
      
      document.head.appendChild(script);
      
      // Fallback timeout
      setTimeout(() => {
        window.removeEventListener('mermaidLoaded', handleMermaidLoaded);
        if (!globalMermaidState.instance) {
          globalMermaidState.loadingPromise = null;
          reject(new Error('Mermaid loading timeout'));
        }
      }, 10000);
    });

    return globalMermaidState.loadingPromise;
  }, []);

  // Get theme configuration
  const getThemeConfig = useCallback((isDark: boolean) => {
    return {
      theme: isDark ? 'dark' : 'default',
      themeVariables: {
        primaryColor: isDark ? '#8b5cf6' : '#7c3aed',
        primaryTextColor: isDark ? '#e9d5ff' : '#4c1d95',
        primaryBorderColor: isDark ? '#a78bfa' : '#6d28d9',
        lineColor: isDark ? '#6366f1' : '#4f46e5',
        secondaryColor: isDark ? '#6366f1' : '#4f46e5',
        tertiaryColor: isDark ? '#3b82f6' : '#2563eb',
        background: isDark ? '#1f2937' : '#ffffff',
        mainBkgColor: isDark ? '#1f2937' : '#ffffff',
        secondBkgColor: isDark ? '#374151' : '#f9fafb',
        textColor: isDark ? '#f3f4f6' : '#111827',
        edgeLabelBackground: isDark ? '#374151' : '#f3f4f6',
      },
    };
  }, []);

  // Store the last rendered diagram to prevent re-rendering the same content
  const lastRenderedDiagramRef = useRef<string>('');

  // Render diagram function
  const renderDiagram = useCallback(async () => {
    if (!mountedRef.current || !containerRef.current || !cleanDiagram) {
      return;
    }

    // Check if we need to re-render - compare actual diagram content, not just renderKey
    if (cleanDiagram === lastRenderedDiagramRef.current && renderKey === lastRenderKeyRef.current) {
      // Already rendered this exact diagram with this theme
      return;
    }

    // Prevent concurrent renders
    if (isRenderingRef.current) {
      return;
    }

    isRenderingRef.current = true;
    lastRenderKeyRef.current = renderKey;
    lastRenderedDiagramRef.current = cleanDiagram;
    setError(null);

    const container = containerRef.current;
    const savedRenderKey = renderKey;
    const savedCleanDiagram = cleanDiagram;

    // Show loading state only if container is empty or content is different
    if (!container.innerHTML || container.innerHTML.includes('Loading')) {
      container.innerHTML = '<div class="flex items-center justify-center min-h-[100px]"><div class="text-gray-500 dark:text-gray-400">Loading diagram...</div></div>';
    }

    try {
      const mermaidInstance = await initializeMermaid();
      const isDark = (resolvedTheme || 'dark') === 'dark';
      const { theme, themeVariables } = getThemeConfig(isDark);

      // Reinitialize mermaid only if theme changes or not initialized yet
      if (!globalMermaidState.initialized || globalMermaidState.currentTheme !== theme) {
        mermaidInstance.initialize({
          startOnLoad: false,
          theme,
          themeVariables,
          securityLevel: 'loose',
          flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
          sequence: { useMaxWidth: true },
          gantt: { useMaxWidth: true },
          pie: { useMaxWidth: true },
          journey: { useMaxWidth: true },
        });
        globalMermaidState.initialized = true;
        globalMermaidState.currentTheme = theme;
        console.log(`Mermaid initialized with theme: ${theme}`);
      }

      if (!mountedRef.current || savedRenderKey !== lastRenderKeyRef.current || savedCleanDiagram !== lastRenderedDiagramRef.current) {
        return;
      }

      // Clear previous content
      container.innerHTML = '';
      const id = `mermaid-simple-${Math.random().toString(36).substr(2, 9)}`;
      
      // Use mermaidAPI.render if available, otherwise use render
      const renderMethod = mermaidInstance.mermaidAPI?.render || mermaidInstance.render;
      
      const result = await renderMethod(id, savedCleanDiagram);
      const svg = result.svg || result;
      const bindFunctions = result.bindFunctions;

      // Double-check everything is still valid before inserting SVG
      if (mountedRef.current && 
          savedRenderKey === lastRenderKeyRef.current && 
          savedCleanDiagram === lastRenderedDiagramRef.current &&
          containerRef.current === container) {
        container.innerHTML = typeof svg === 'string' ? svg : svg.outerHTML;
        if (bindFunctions && typeof bindFunctions === 'function') {
          bindFunctions(container);
        }
        isRenderingRef.current = false;
      } else {
        isRenderingRef.current = false;
      }
    } catch (err: any) {
      console.error('Mermaid rendering error in simple viewer:', err);
      isRenderingRef.current = false;
      if (mountedRef.current && savedRenderKey === lastRenderKeyRef.current && containerRef.current === container) {
        const errorMsg = err.message || 'Failed to render diagram';
        setError(errorMsg);
        container.innerHTML = '';
      }
    }
  }, [cleanDiagram, renderKey, resolvedTheme, initializeMermaid, getThemeConfig]);

  // Mount effect (runs once)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Render effect (runs when diagram or theme changes)
  useEffect(() => {
    if (!mountedRef.current || !renderKey || !cleanDiagram) {
      return;
    }
    
    // If container already has SVG content and diagram hasn't changed, preserve it
    if (containerRef.current && 
        containerRef.current.innerHTML && 
        containerRef.current.innerHTML.includes('<svg') &&
        cleanDiagram === lastRenderedDiagramRef.current &&
        renderKey === lastRenderKeyRef.current) {
      // Already rendered, skip
      return;
    }
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mountedRef.current && containerRef.current) {
        renderDiagram();
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [renderKey, cleanDiagram, renderDiagram]);

  if (!mountedRef.current) {
    return (
      <div className={`flex items-center justify-center min-h-[100px] bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className || ''}`}>
        <div className="text-gray-500 dark:text-gray-400">Loading diagram...</div>
      </div>
    );
  }

  if (!cleanDiagram) {
    return null;
  }

  return (
    <div className={`flex justify-center overflow-x-auto ${className || ''}`}>
      {error ? (
        <div className="text-red-500 dark:text-red-400 p-4 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 w-full">
          <p className="font-semibold mb-1">Mermaid Diagram Error</p>
          <p className="text-sm mb-2">{error}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold mb-1">Error Details</summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
              <code>{diagram}</code>
            </pre>
          </details>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="mermaid w-full"
          suppressHydrationWarning
        />
      )}
    </div>
  );
}

MermaidDiagramSimple.displayName = 'MermaidDiagramSimple';
