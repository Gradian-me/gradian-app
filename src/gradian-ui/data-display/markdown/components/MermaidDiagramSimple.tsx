'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { RefreshCw, Download, Sparkles } from 'lucide-react';
import { CopyContent } from '../../../form-builder/form-elements/components/CopyContent';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sanitizeSvg } from '@/gradian-ui/shared/utils/html-sanitizer';

interface MermaidDiagramSimpleProps {
  diagram: string;
  className?: string;
  markdownLoadedTimestamp?: number;
}

// Supported Mermaid diagram types
const SUPPORTED_DIAGRAM_TYPES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'gantt',
  'pie',
  'journey',
  'classDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'gitgraph',
  'mindmap',
  'timeline',
  'quadrantChart',
  'requirement',
] as const;

type DiagramType = (typeof SUPPORTED_DIAGRAM_TYPES)[number];

// Global state to ensure mermaid is loaded and initialized only once
const globalMermaidState = {
  instance: null as any,
  initialized: false,
  currentTheme: '',
  loadingPromise: null as Promise<any> | null,
};

/**
 * Detects the diagram type from the diagram code
 */
function detectDiagramType(diagram: string): { type: DiagramType | null; direction?: string } {
  if (!diagram?.trim()) {
    return { type: null };
  }

  const firstLine = diagram.trim().split('\n')[0].trim();
  
  // Match diagram type with direction (e.g., "flowchart TD", "graph LR")
  const withDirectionMatch = firstLine.match(/^(graph|flowchart)\s+(TD|LR|TB|BT|RL)/i);
  if (withDirectionMatch) {
    return { type: withDirectionMatch[1].toLowerCase() as DiagramType, direction: withDirectionMatch[2] };
  }

  // Match diagram type without direction
  for (const type of SUPPORTED_DIAGRAM_TYPES) {
    const regex = new RegExp(`^${type}(?:-v2)?\\s*$`, 'i');
    if (regex.test(firstLine)) {
      return { type: type as DiagramType };
    }
  }

  return { type: null };
}

/**
 * Cleans and formats diagram code for consistent rendering
 */
function cleanDiagramCode(diagram: string): string {
  if (!diagram?.trim()) return '';

  let cleaned = diagram.trim();

  // Remove markdown code block markers if present
  cleaned = cleaned.replace(/^```\s*mermaid\s*\n?/i, '');
  cleaned = cleaned.replace(/```\s*$/i, '');
  cleaned = cleaned.trim();

  // Detect diagram type
  const { type: diagramType } = detectDiagramType(cleaned);
  
  // Different cleaning strategies based on diagram type
  if (!diagramType || ['graph', 'flowchart'].includes(diagramType)) {
    // Flowchart-specific cleaning
    cleaned = cleaned.replace(/\s*--\s*>\s*/g, ' --> ');
    cleaned = cleaned.replace(/\s*==\s*>\s*/g, ' ==> ');
    
    // Split into lines and process each line
    let lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let typeDeclaration = '';
    if (lines.length > 0) {
      const firstLine = lines[0];
      const diagramMatch = firstLine.match(/^(graph|flowchart)\s+(TD|LR|TB|BT|RL)/i);
      if (diagramMatch) {
        typeDeclaration = `${diagramMatch[1]} ${diagramMatch[2]}`;
        lines = lines.slice(1);
      } else {
        const diagramMatchSimple = firstLine.match(/^(graph|flowchart)\s*$/i);
        if (diagramMatchSimple) {
          typeDeclaration = diagramMatchSimple[1];
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
    if (typeDeclaration) {
      result.push(typeDeclaration);
    }
    result.push(...processedLines.map(line => '    ' + line));
    
    return result.join('\n').trim();
  } else {
    // For other diagram types, just clean up basic formatting
    const lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Preserve indentation for diagram types that use it (mindmap, timeline, etc.)
    const needsIndentation = ['mindmap', 'timeline', 'journey'].includes(diagramType);
    
    if (needsIndentation) {
      return lines.join('\n');
    } else {
      // For other types, normalize spacing but preserve structure
      return lines.map(line => {
        // Normalize multiple spaces to single space, but preserve colons for stateDiagram, journey, etc.
        return line.replace(/\s+/g, ' ').trim();
      }).join('\n');
    }
  }
}

/**
 * Gets comprehensive Mermaid configuration for all chart types
 */
function getMermaidConfig(isDark: boolean) {
  const theme = isDark ? 'dark' : 'default';
  
  const themeVariables = {
    // Violet-based color scheme for readability in both dark and light modes
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
    // Additional variables for different chart types (violet shades)
    cScale0: isDark ? '#8b5cf6' : '#7c3aed',
    cScale1: isDark ? '#a78bfa' : '#8b5cf6',
    cScale2: isDark ? '#c4b5fd' : '#a78bfa',
    // State diagram colors
    stateBkg: isDark ? '#374151' : '#f3f4f6',
    stateBorder: isDark ? '#a78bfa' : '#6d28d9',
    // Class diagram colors
    classText: isDark ? '#f3f4f6' : '#111827',
    classBkg: isDark ? '#1f2937' : '#ffffff',
    // ER diagram colors
    erBkg: isDark ? '#1f2937' : '#ffffff',
    erBorder: isDark ? '#a78bfa' : '#6d28d9',
  };

  return {
    theme,
    themeVariables,
    // Comprehensive configuration for all chart types
    startOnLoad: false,
    securityLevel: 'loose' as const,
    
    // Flowchart/Graph configuration
    flowchart: {
      htmlLabels: true,
      curve: 'basis' as const,
      useMaxWidth: true,
      nodeSpacing: 50,
      rankSpacing: 30,
      padding: 10,
    },
    
    // Sequence diagram configuration
    sequence: {
      useMaxWidth: true,
      diagramMarginX: 10,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: true,
      bottomMarginAdj: 1,
      rightAngles: false,
      showSequenceNumbers: false,
    },
    
    // Gantt chart configuration
    gantt: {
      useMaxWidth: true,
      leftPadding: 75,
      gridLineStartPadding: 35,
      fontSize: 11,
      fontFamily: themeVariables.fontFamily,
      numberSectionStyles: 4,
      axisFormat: '%Y-%m-%d',
      bottomPadding: 25,
    },
    
    // Pie chart configuration
    pie: {
      useMaxWidth: true,
      textPosition: 0.75,
    },
    
    // Journey diagram configuration
    journey: {
      useMaxWidth: true,
      diagramMarginX: 50,
      diagramMarginY: 10,
      leftMargin: 150,
      width: 150,
      height: 50,
      taskMargin: 10,
      loopHeight: 75,
      taskFontSize: 13,
      taskFontFamily: themeVariables.fontFamily,
      labelFontSize: 13,
      labelFontFamily: themeVariables.fontFamily,
      sectionFontSize: 13,
      sectionFontFamily: themeVariables.fontFamily,
      sectionBkgColor: isDark ? '#374151' : '#f3f4f6',
      altSectionBkgColor: isDark ? '#1f2937' : '#ffffff',
      gridColor: isDark ? '#4b5563' : '#d1d5db',
      doneTaskBkgColor: isDark ? '#10b981' : '#059669',
      doneTaskBorderColor: isDark ? '#059669' : '#047857',
      activeTaskBkgColor: isDark ? '#6366f1' : '#4f46e5',
      activeTaskBorderColor: isDark ? '#4f46e5' : '#4338ca',
      gridBkgColor: isDark ? '#1f2937' : '#ffffff',
    },
    
    // State diagram configuration
    state: {
      useMaxWidth: true,
      diagramMarginX: 50,
      diagramMarginY: 50,
      nodeSpacing: 100,
      rankSpacing: 100,
    },
    
    // Class diagram configuration
    class: {
      useMaxWidth: true,
      padding: 10,
      dividerMargin: 10,
      paddingX: 10,
      paddingY: 10,
    },
    
    // ER diagram configuration
    er: {
      useMaxWidth: true,
      padding: 20,
      diagramPadding: 20,
      layoutDirection: 'TB' as const,
      minEntityWidth: 100,
      minEntityHeight: 75,
      entityPadding: 15,
      stroke: themeVariables.erBorder,
      fill: themeVariables.erBkg,
      fontSize: 13,
      fontFamily: themeVariables.fontFamily,
    },
    
    // Gitgraph configuration
    gitGraph: {
      useMaxWidth: true,
      theme: theme,
      themeVariables: {
        primaryColor: themeVariables.primaryColor,
        primaryTextColor: themeVariables.textColor,
        primaryBorderColor: themeVariables.primaryBorderColor,
        lineColor: themeVariables.lineColor,
        secondaryColor: themeVariables.secondaryColor,
        tertiaryColor: themeVariables.tertiaryColor,
        background: themeVariables.background,
        mainBkgColor: themeVariables.mainBkgColor,
        textColor: themeVariables.textColor,
        commitLabelFontSize: 12,
        commitLabelFontFamily: themeVariables.fontFamily,
        commitLabelFontWeight: 'normal',
        commitLabelColor: themeVariables.textColor,
      },
    },
    
    // Mindmap configuration
    mindmap: {
      useMaxWidth: true,
      padding: 5,
      maxNodeWidth: 200,
    },
    
    // Timeline configuration
    timeline: {
      useMaxWidth: true,
      padding: 10,
      backgroundColor: themeVariables.background,
      fontColor: themeVariables.textColor,
      fontSize: themeVariables.fontSize,
      fontFamily: themeVariables.fontFamily,
    },
  };
}

export function MermaidDiagramSimple({ diagram, className, markdownLoadedTimestamp }: MermaidDiagramSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastRenderKeyRef = useRef<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [hasSvg, setHasSvg] = useState<boolean>(false);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const mountedRef = useRef<boolean>(false);
  const isRenderingRef = useRef<boolean>(false);

  // Clean and format the diagram code
  const cleanDiagram = useMemo(() => cleanDiagramCode(diagram), [diagram]);

  // Create a stable render key
  const renderKey = useMemo(() => {
    if (!cleanDiagram) return '';
    const theme = resolvedTheme || 'dark';
    return `${cleanDiagram}-${theme}`;
  }, [cleanDiagram, resolvedTheme]);

  // Memoize Mermaid configuration based on theme
  const mermaidConfig = useMemo(() => {
    const isDark = (resolvedTheme || 'dark') === 'dark';
    return getMermaidConfig(isDark);
  }, [resolvedTheme]);

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

    // Start loading - use dynamic import from installed package
    globalMermaidState.loadingPromise = (async () => {
      try {
        // Use the installed package (more secure, no CSP issues, already in dependencies)
        const mermaidModule = await import('mermaid');
        const mermaidInstance = mermaidModule.default || mermaidModule;
        
        // Store on window for compatibility
        if (typeof window !== 'undefined') {
          (window as any).mermaid = mermaidInstance;
        }
        
        globalMermaidState.instance = mermaidInstance;
        globalMermaidState.loadingPromise = null;
        return mermaidInstance;
      } catch (importError: any) {
        console.warn('[Mermaid] Failed to load from package, trying CDN fallback:', importError);
        
        // Fallback to CDN if package import fails
        return new Promise<any>((resolve, reject) => {
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
                reject(new Error('Mermaid loading timeout - CDN fallback failed'));
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
            reject(new Error('Failed to load Mermaid from CDN - check CSP settings and network connection'));
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
      }
    })();

    return globalMermaidState.loadingPromise;
  }, []);

  // Store the last rendered diagram to prevent re-rendering the same content
  const lastRenderedDiagramRef = useRef<string>('');
  const forceRefreshRef = useRef<boolean>(false);

  // Render diagram function
  const renderDiagram = useCallback(async (force = false) => {
    if (!mountedRef.current || !containerRef.current || !cleanDiagram) {
      return;
    }

    // Check if we need to re-render - compare actual diagram content, not just renderKey
    if (!force && !forceRefreshRef.current && cleanDiagram === lastRenderedDiagramRef.current && renderKey === lastRenderKeyRef.current) {
      // Already rendered this exact diagram with this theme
      return;
    }

    // Reset force refresh flag
    if (forceRefreshRef.current) {
      forceRefreshRef.current = false;
    }

    // Prevent concurrent renders
    if (isRenderingRef.current) {
      return;
    }

    isRenderingRef.current = true;
    setIsRendering(true);
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
      const currentConfig = mermaidConfig;

      // Reinitialize mermaid only if theme changes or not initialized yet
      if (!globalMermaidState.initialized || globalMermaidState.currentTheme !== currentConfig.theme) {
        mermaidInstance.initialize(currentConfig);
        globalMermaidState.initialized = true;
        globalMermaidState.currentTheme = currentConfig.theme;
        console.log(`Mermaid initialized with theme: ${currentConfig.theme}`);
      }

      if (!mountedRef.current || savedRenderKey !== lastRenderKeyRef.current || savedCleanDiagram !== lastRenderedDiagramRef.current) {
        return;
      }

      // Clear previous content
      container.innerHTML = '';
      setHasSvg(false);
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
        const svgString = typeof svg === 'string' ? svg : svg.outerHTML;
        // SECURITY: Sanitize SVG content using DOMPurify for defense in depth
        // The diagram content is validated before rendering, and mermaid sanitizes SVG output
        const sanitizedSvg = sanitizeSvg(svgString);
        
        // SECURITY: Use DOMParser instead of innerHTML to avoid insecure-document-method warnings
        // Parse the sanitized SVG and append it as a proper DOM node
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(sanitizedSvg, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // Clear container using removeChild (safer than innerHTML)
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        
        // Append the parsed SVG element
        if (svgElement && svgElement.tagName === 'svg') {
          container.appendChild(svgElement);
        } else {
          // Fallback: if parsing fails, use insertAdjacentHTML (safer than innerHTML)
          container.insertAdjacentHTML('beforeend', sanitizedSvg);
        }
        
        // Apply styling and post-processing
        const insertedSvg = container.querySelector('svg');
        
        // Add rounded corners to all rectangles
        if (insertedSvg) {
          const rects = insertedSvg.querySelectorAll('rect');
          rects.forEach((rect) => {
            // Add roundness if not already set (preserve existing rx/ry)
            const currentRx = rect.getAttribute('rx');
            if (!currentRx || currentRx === '0') {
              rect.setAttribute('rx', '6');
              rect.setAttribute('ry', '6');
            }
          });
        }
        if (insertedSvg) {
          insertedSvg.style.display = 'block';
          insertedSvg.style.margin = '0 auto';
          insertedSvg.style.maxWidth = '100%';
          insertedSvg.style.height = 'auto';
          insertedSvg.style.transformOrigin = 'center center';
          
          // Clean up previous style element if it exists
          if (styleElementRef.current && styleElementRef.current.parentNode) {
            styleElementRef.current.parentNode.removeChild(styleElementRef.current);
            styleElementRef.current = null;
          }
          
          // Create comprehensive styles for all chart types
          const svgId = insertedSvg.id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          if (!insertedSvg.id) {
            insertedSvg.id = svgId;
          }
          
          const style = document.createElement('style');
          style.id = `mermaid-style-${svgId}`;
          style.textContent = `
            #${svgId} {
              transform: scale(1) !important;
              transform-origin: center center !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #${svgId} text,
            #${svgId} .nodeLabel,
            #${svgId} .edgeLabel,
            #${svgId} .cluster-label,
            #${svgId} .label,
            #${svgId} .labelText,
            #${svgId} .sectionTitle,
            #${svgId} .taskText,
            #${svgId} .taskTextOutsideRight,
            #${svgId} .taskTextOutsideLeft,
            #${svgId} .state-note,
            #${svgId} .stateLabel,
            #${svgId} .noteText,
            #${svgId} .messageText,
            #${svgId} .actor,
            #${svgId} .titleText,
            #${svgId} .pieTitleText,
            #${svgId} .slice,
            #${svgId} .journey-section,
            #${svgId} .classText,
            #${svgId} .classBoxText,
            #${svgId} .entityBoxText {
              font-size: 13px !important;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
            }
            #${svgId} .nodeLabel tspan,
            #${svgId} .edgeLabel tspan {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }
            #${svgId} .nodeLabel foreignObject {
              overflow: visible !important;
              height: auto !important;
            }
            #${svgId} .nodeLabel foreignObject > div {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              text-align: center !important;
              padding: 8px 12px !important;
              line-height: 1.4 !important;
              display: block !important;
              box-sizing: border-box !important;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #${svgId} .nodeLabel foreignObject > div > p,
            #${svgId} .nodeLabel foreignObject > div > span {
              margin: 0 !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }
            #${svgId} .node {
              min-width: 80px !important;
            }
            #${svgId} .node rect {
              rx: 6px !important;
              ry: 6px !important;
            }
            #${svgId} .nodeLabel foreignObject {
              min-width: 80px !important;
            }
            #${svgId} .flowchart-label {
              margin: 0 !important;
            }
          `;
          document.head.appendChild(style);
          styleElementRef.current = style;
          
          // Post-process to ensure all node labels wrap properly (mainly for flowcharts)
          const diagramType = detectDiagramType(savedCleanDiagram);
          if (diagramType.type === 'flowchart' || diagramType.type === 'graph') {
            const processNodes = () => {
              // Process HTML labels (foreignObject)
              const foreignObjects = insertedSvg.querySelectorAll('.nodeLabel foreignObject');
              foreignObjects.forEach((fo: any) => {
                const div = fo.querySelector('div');
                if (div) {
                  const textContent = div.textContent || '';
                  const charCount = textContent.length;
                  let requiredWidth: number;
                  
                  if (charCount <= 20) {
                    requiredWidth = Math.max(charCount * 8 + 40, 120);
                  } else if (charCount <= 40) {
                    requiredWidth = Math.max(charCount * 4 + 40, 180);
                  } else {
                    requiredWidth = Math.min(charCount * 3 + 40, 450);
                  }
                  
                  const currentWidth = parseFloat(fo.getAttribute('width') || '0');
                  if (requiredWidth > currentWidth) {
                    fo.setAttribute('width', requiredWidth.toString());
                  }
                  
                  div.style.width = '100%';
                  div.style.maxWidth = '100%';
                  
                  const divHeight = div.scrollHeight || div.offsetHeight;
                  if (divHeight > 0) {
                    const currentHeight = parseFloat(fo.getAttribute('height') || '0');
                    if (divHeight + 8 > currentHeight) {
                      fo.setAttribute('height', (divHeight + 8).toString());
                    }
                  }
                  
                  const node = fo.closest('.node');
                  if (node) {
                    const rect = node.querySelector('rect');
                    if (rect) {
                      const currentRectWidth = parseFloat(rect.getAttribute('width') || '0');
                      if (requiredWidth > currentRectWidth) {
                        rect.setAttribute('width', requiredWidth.toString());
                      }
                      const foHeight = parseFloat(fo.getAttribute('height') || '0');
                      const currentRectHeight = parseFloat(rect.getAttribute('height') || '0');
                      if (foHeight > currentRectHeight) {
                        rect.setAttribute('height', foHeight.toString());
                      }
                    }
                  }
                }
              });
              
              // Process SVG text labels (non-HTML)
              const allNodes = insertedSvg.querySelectorAll('.node');
              allNodes.forEach((node: any) => {
                const hasForeignObject = node.querySelector('.nodeLabel foreignObject');
                if (!hasForeignObject) {
                  const rect = node.querySelector('rect');
                  const textEl = node.querySelector('.nodeLabel text');
                  if (rect && textEl) {
                    try {
                      const textBBox = textEl.getBBox();
                      const currentWidth = parseFloat(rect.getAttribute('width') || '0');
                      if (textBBox.width + 20 > currentWidth) {
                        rect.setAttribute('width', (textBBox.width + 20).toString());
                      }
                    } catch (e) {
                      console.debug('Could not get text bbox:', e);
                    }
                  }
                }
              });
            };
            
            // Use multiple frames to ensure proper measurement
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                processNodes();
                
                // Adjust container height to fit the diagram
                if (insertedSvg && container) {
                  setTimeout(() => {
                    const svgRect = insertedSvg.getBoundingClientRect();
                    const viewBox = insertedSvg.viewBox?.baseVal;
                    
                    let svgHeight = 0;
                    if (viewBox && viewBox.height > 0) {
                      svgHeight = viewBox.height;
                    } else if (svgRect.height > 0) {
                      svgHeight = svgRect.height;
                    }
                    
                    if (svgHeight > 0 && container) {
                      container.style.height = `${svgHeight + 8}px`;
                      container.style.minHeight = 'auto';
                      container.style.maxHeight = 'none';
                      container.style.overflow = 'visible';
                    }
                  }, 100);
                }
              });
            });
          }
        }
        
        if (bindFunctions && typeof bindFunctions === 'function') {
          bindFunctions(container);
        }
        isRenderingRef.current = false;
        setIsRendering(false);
        setHasSvg(true);
      } else {
        isRenderingRef.current = false;
        setIsRendering(false);
      }
    } catch (err: any) {
      console.error('Mermaid rendering error in simple viewer:', err);
      isRenderingRef.current = false;
      setIsRendering(false);
      setHasSvg(false);
      if (mountedRef.current && savedRenderKey === lastRenderKeyRef.current && containerRef.current === container) {
        const errorMsg = err.message || 'Failed to render diagram';
        setError(errorMsg);
        container.innerHTML = '';
      }
    }
  }, [cleanDiagram, renderKey, mermaidConfig, initializeMermaid]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (!mountedRef.current || !containerRef.current || !cleanDiagram) {
      return;
    }
    // Force refresh by clearing the last rendered diagram
    lastRenderedDiagramRef.current = '';
    lastRenderKeyRef.current = '';
    forceRefreshRef.current = true;
    renderDiagram(true);
  }, [cleanDiagram, renderDiagram]);

  // Export PNG handler
  const handleExportPNG = useCallback(async () => {
    if (!containerRef.current) {
      toast.error('No diagram to export');
      return;
    }

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) {
      toast.error('Diagram not ready for export');
      return;
    }

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Get SVG dimensions
      const svgRect = svgElement.getBoundingClientRect();
      const viewBox = svgElement.viewBox?.baseVal;
      const svgWidth = viewBox?.width || parseFloat(svgElement.getAttribute('width') || '0') || svgRect.width || 800;
      const svgHeight = viewBox?.height || parseFloat(svgElement.getAttribute('height') || '0') || svgRect.height || 600;

      // Set explicit dimensions on cloned SVG
      clonedSvg.setAttribute('width', String(svgWidth));
      clonedSvg.setAttribute('height', String(svgHeight));
      clonedSvg.setAttribute('style', 'max-width: none; max-height: none;');
      
      // Remove any external references that might cause CORS issues
      const externalImages = clonedSvg.querySelectorAll('image');
      externalImages.forEach((img) => {
        const href = img.getAttribute('href') || img.getAttribute('xlink:href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          // Remove external images to avoid CORS issues
          img.remove();
        }
      });

      // Get SVG content and convert to data URL
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      
      // Use FileReader to create a data URL instead of object URL
      const reader = new FileReader();
      const svgDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Failed to read SVG blob'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read SVG blob'));
        reader.readAsDataURL(svgBlob);
      });

      // Create an image element to load the SVG
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        toast.error('Failed to create canvas context');
        return;
      }

      // Wait for image to load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Set canvas dimensions with some padding
            const padding = 20;
            const scale = 2; // Higher resolution
            canvas.width = (img.width + padding * 2) * scale;
            canvas.height = (img.height + padding * 2) * scale;

            // Scale context for higher resolution
            ctx.scale(scale, scale);

            // Clear canvas (transparent background)
            ctx.clearRect(0, 0, canvas.width / scale, canvas.height / scale);

            // Draw the image on canvas with padding
            ctx.drawImage(img, padding, padding);

            // Convert to PNG
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to create PNG blob'));
                return;
              }

              // Create download link
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `Gradian_Diagram_${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Cleanup
              URL.revokeObjectURL(url);
              resolve();
            }, 'image/png');
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load SVG image'));
        };

        // Set crossOrigin before setting src to avoid CORS issues
        img.crossOrigin = 'anonymous';
        img.src = svgDataUrl;
      });

      toast.success('Diagram exported as PNG');
    } catch (err: any) {
      console.error('Export PNG error:', err);
      toast.error(err.message || 'Failed to export diagram as PNG');
    }
  }, []);

  // Mount effect (runs once)
  useEffect(() => {
    mountedRef.current = true;
    setIsMounted(true);
    return () => {
      mountedRef.current = false;
      setIsMounted(false);
      // Clean up style element on unmount
      if (styleElementRef.current && styleElementRef.current.parentNode) {
        styleElementRef.current.parentNode.removeChild(styleElementRef.current);
        styleElementRef.current = null;
      }
    };
  }, []);

  // Update hasSvg state when container content changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const checkSvg = () => {
      const hasSvgElement = !!containerRef.current?.querySelector('svg');
      setHasSvg(hasSvgElement);
    };
    
    // Check immediately
    checkSvg();
    
    // Use MutationObserver to watch for SVG changes
    const observer = new MutationObserver(checkSvg);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }
    
    return () => observer.disconnect();
  }, [renderKey, cleanDiagram]);

  // Track last markdown loaded timestamp to detect changes
  const lastMarkdownLoadedTimestampRef = useRef<number | undefined>(undefined);
  
  // Render effect (runs when diagram, theme, or markdown loading timestamp changes)
  useEffect(() => {
    if (!mountedRef.current || !renderKey || !cleanDiagram) {
      return;
    }
    
    // Check if markdownLoadedTimestamp has changed
    const markdownJustLoaded = markdownLoadedTimestamp && 
      markdownLoadedTimestamp !== lastMarkdownLoadedTimestampRef.current;
    
    if (markdownJustLoaded) {
      lastMarkdownLoadedTimestampRef.current = markdownLoadedTimestamp;
      // Reset rendering state when markdown loads so we force a fresh render
      lastRenderedDiagramRef.current = '';
      lastRenderKeyRef.current = '';
    }
    
    // If container already has SVG content and diagram hasn't changed, preserve it
    // UNLESS markdown just loaded (which requires a refresh)
    if (!markdownJustLoaded && 
        containerRef.current && 
        containerRef.current.innerHTML && 
        containerRef.current.innerHTML.includes('<svg') &&
        cleanDiagram === lastRenderedDiagramRef.current &&
        renderKey === lastRenderKeyRef.current) {
      // Already rendered and nothing changed, skip
      return;
    }
    
    // Use requestAnimationFrame to ensure DOM is ready, then a small delay for Mermaid initialization
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Small delay to ensure Mermaid library is ready
        timerId = setTimeout(() => {
          if (mountedRef.current && containerRef.current) {
            renderDiagram();
          }
          timerId = null;
        }, 100); // Small delay to ensure all components are ready
      });
    });
    
    return () => {
      cancelAnimationFrame(rafId);
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    };
  }, [renderKey, cleanDiagram, renderDiagram, markdownLoadedTimestamp]);

  if (!isMounted) {
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
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className || ''}`}>
      {/* Header with actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Diagram
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="h-3 w-3 text-violet-500" />
            Powered by Gradian AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRendering}
            className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-all duration-200"
            title="Refresh diagram"
            aria-label="Refresh diagram"
          >
            <RefreshCw 
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isRendering && 'animate-spin'
              )} 
            />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExportPNG}
            disabled={!hasSvg}
            className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-all duration-200"
            title="Export as PNG"
            aria-label="Export as PNG"
          >
            <Download className="h-4 w-4" />
          </Button>
          <CopyContent 
            content={cleanDiagram}
            className="h-7 w-7"
          />
        </div>
      </div>

      {/* Diagram content */}
      <div className="flex justify-center overflow-x-auto bg-white dark:bg-gray-900 py-2 px-4">
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
          className="mermaid w-full flex justify-center"
          suppressHydrationWarning
        />
      )}
      </div>
    </div>
  );
}

MermaidDiagramSimple.displayName = 'MermaidDiagramSimple';
