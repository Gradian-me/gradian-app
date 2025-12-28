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

// Global state to ensure mermaid is loaded and initialized only once
const globalMermaidState = {
  instance: null as any,
  initialized: false,
  currentTheme: '',
  loadingPromise: null as Promise<any> | null
};

export function MermaidDiagramSimple({ diagram, className, markdownLoadedTimestamp }: MermaidDiagramSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastRenderKeyRef = useRef<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [hasSvg, setHasSvg] = useState<boolean>(false);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const mountedRef = useRef<boolean>(false); // Keep for internal checks in callbacks
  const isRenderingRef = useRef<boolean>(false); // Keep for internal checks in callbacks

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
        // Use sans-serif font
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        // Node dimensions
        nodeBorder: isDark ? '#a78bfa' : '#6d28d9',
        nodeBkg: isDark ? '#1f2937' : '#ffffff',
        // Cluster dimensions
        clusterBkg: isDark ? '#374151' : '#f9fafb',
        clusterBorder: isDark ? '#6366f1' : '#4f46e5',
        // Default link color
        defaultLinkColor: isDark ? '#6366f1' : '#4f46e5',
        // Title color
        titleColor: isDark ? '#f3f4f6' : '#111827',
      },
    };
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
      const isDark = (resolvedTheme || 'dark') === 'dark';
      const { theme, themeVariables } = getThemeConfig(isDark);

      // Reinitialize mermaid only if theme changes or not initialized yet
      if (!globalMermaidState.initialized || globalMermaidState.currentTheme !== theme) {
        mermaidInstance.initialize({
          startOnLoad: false,
          theme,
          themeVariables,
          securityLevel: 'loose',
          flowchart: { 
            htmlLabels: true, 
            curve: 'basis', 
            useMaxWidth: true,
            nodeSpacing: 50,
            rankSpacing: 30,
            padding: 10
          },
          sequence: { useMaxWidth: true, diagramMarginX: 10, diagramMarginY: 10 },
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
        
        // Ensure SVG is centered and make nodes smaller
        const insertedSvg = container.querySelector('svg');
        if (insertedSvg) {
          insertedSvg.style.display = 'block';
          insertedSvg.style.margin = '0 auto';
          insertedSvg.style.maxWidth = '100%';
          insertedSvg.style.height = 'auto';
          insertedSvg.style.transform = 'scale(1)';
          insertedSvg.style.transformOrigin = 'center center';
          
          // Clean up previous style element if it exists
          if (styleElementRef.current && styleElementRef.current.parentNode) {
            styleElementRef.current.parentNode.removeChild(styleElementRef.current);
            styleElementRef.current = null;
          }
          
          // Make nodes smaller by scaling down font sizes and node dimensions
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
            #${svgId} .flowchart-label {
              margin: 0 !important;
            }
            #${svgId} .node rect,
            #${svgId} .node circle,
            #${svgId} .node ellipse,
            #${svgId} .node polygon,
            #${svgId} .node path {
              font-size: 13px !important;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #${svgId} .nodeLabel {
              font-size: 13px !important;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #${svgId} .nodeLabel tspan {
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
            #${svgId} .nodeLabel foreignObject > div > p {
              margin: 0 !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }
            #${svgId} .nodeLabel foreignObject > div > span {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }
            #${svgId} .edgeLabel {
              font-size: 11px !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #${svgId} .cluster-label {
              font-size: 13px !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #${svgId} text {
              font-size: 13px !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #${svgId} .node {
              min-width: 80px !important;
            }
            #${svgId} .node rect {
              rx: 6px !important;
              ry: 6px !important;
            }
            #${svgId} .nodeLabel foreignObject {
              overflow: visible !important;
              height: auto !important;
              min-width: 80px !important;
            }
          `;
          document.head.appendChild(style);
          styleElementRef.current = style;
          
          // Post-process to ensure all node labels wrap properly
          // Use multiple animation frames to ensure DOM is fully rendered and measured
          const processNodes = () => {
            // Process HTML labels (foreignObject)
            const foreignObjects = insertedSvg.querySelectorAll('.nodeLabel foreignObject');
            foreignObjects.forEach((fo: any) => {
              const div = fo.querySelector('div');
              if (div) {
                const textContent = div.textContent || '';
                
                // Calculate required width based on text length
                // For 11px font, estimate ~6-7px per character
                // Allow for wrapping: if text is long, set a reasonable max width
                const charCount = textContent.length;
                let requiredWidth: number;
                
                if (charCount <= 20) {
                  // Short text: single line (adjusted for 13px font)
                  requiredWidth = Math.max(charCount * 8 + 40, 120);
                } else if (charCount <= 40) {
                  // Medium text: allow 2 lines
                  requiredWidth = Math.max(charCount * 4 + 40, 180);
                } else {
                  // Long text: allow 3+ lines
                  requiredWidth = Math.min(charCount * 3 + 40, 450);
                }
                
                // Get current width
                const currentWidth = parseFloat(fo.getAttribute('width') || '0');
                
                // Set new width if needed
                if (requiredWidth > currentWidth) {
                  fo.setAttribute('width', requiredWidth.toString());
                }
                
                // Ensure div can wrap
                div.style.width = '100%';
                div.style.maxWidth = '100%';
                
                // Update foreignObject height to accommodate wrapped text
                const divHeight = div.scrollHeight || div.offsetHeight;
                if (divHeight > 0) {
                  const currentHeight = parseFloat(fo.getAttribute('height') || '0');
                  if (divHeight + 8 > currentHeight) {
                    fo.setAttribute('height', (divHeight + 8).toString());
                  }
                }
                
                // Update the node rectangle to match foreignObject dimensions
                const node = fo.closest('.node');
                if (node) {
                  const rect = node.querySelector('rect');
                  if (rect) {
                    // Update width
                    const currentRectWidth = parseFloat(rect.getAttribute('width') || '0');
                    if (requiredWidth > currentRectWidth) {
                      rect.setAttribute('width', requiredWidth.toString());
                    }
                    // Update height
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
                    // Expand node if text is wider than current width (with padding)
                    if (textBBox.width + 20 > currentWidth) {
                      rect.setAttribute('width', (textBBox.width + 20).toString());
                    }
                  } catch (e) {
                    // getBBox might fail if element is not rendered yet
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
                // Wait a bit more for final layout
                setTimeout(() => {
                  const svgRect = insertedSvg.getBoundingClientRect();
                  const viewBox = insertedSvg.viewBox?.baseVal;
                  
                  // Use viewBox height if available (more accurate), otherwise use rendered height
                  let svgHeight = 0;
                  if (viewBox && viewBox.height > 0) {
                    svgHeight = viewBox.height;
                  } else if (svgRect.height > 0) {
                    // If using rendered height, account for scale already applied
                    svgHeight = svgRect.height / 1; // Reverse the scale to get original height
                  }
                  
                  // Account for the scale transform (1)
                  const scaledHeight = svgHeight * 1;
                  
                  // Set container height to fit the scaled diagram with minimal padding
                  if (scaledHeight > 0 && container) {
                    container.style.height = `${scaledHeight + 8}px`; // 8px for minimal vertical padding
                    container.style.minHeight = 'auto';
                    container.style.maxHeight = 'none';
                    container.style.overflow = 'visible';
                  }
                }, 100);
              }
            });
          });
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
  }, [cleanDiagram, renderKey, resolvedTheme, initializeMermaid, getThemeConfig]);

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
