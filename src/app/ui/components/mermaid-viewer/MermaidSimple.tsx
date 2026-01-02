'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { ZoomIn, ZoomOut, RotateCcw, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { sanitizeSvg } from '@/gradian-ui/shared/utils/html-sanitizer';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';

interface MermaidSimpleProps {
  diagram: string;
  className?: string;
  showZoomControls?: boolean;
  showSaveCopyButtons?: boolean;
}

let initialized = false;
let currentTheme = '';

export function MermaidSimple({ diagram, className, showZoomControls = true, showSaveCopyButtons = true }: MermaidSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const isDark = (resolvedTheme || 'dark') === 'dark';
  const scaleRef = useRef<number>(1);
  const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const lastTouchRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);

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
          lineColor: isDark ? '#c4b5fd' : '#6d28d9',
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
          // Additional text color variables for comprehensive font handling
          classText: isDark ? '#f3f4f6' : '#1f2937',
          noteTextColor: isDark ? '#f3f4f6' : '#1f2937',
          noteBkgColor: isDark ? '#374151' : '#f3f4f6',
          labelTextColor: isDark ? '#f3f4f6' : '#1f2937',
          actorTextColor: isDark ? '#f3f4f6' : '#1f2937',
          // Mindmap colors - gradient from violet shades for better visual hierarchy
          cScale0: isDark ? '#8b5cf6' : '#7c3aed', // Root/primary node
          cScale1: isDark ? '#a78bfa' : '#8b5cf6', // First level
          cScale2: isDark ? '#c4b5fd' : '#a78bfa', // Second level
          cScale3: isDark ? '#ddd6fe' : '#c4b5fd', // Third level
          cScale4: isDark ? '#ede9fe' : '#ddd6fe', // Fourth level
          cScale5: isDark ? '#f5f3ff' : '#ede9fe', // Fifth level
        },
      });
      initialized = true;
      currentTheme = theme;
    }
  }, [isDark]);

  // Convert SVG to canvas
  const svgToCanvas = useCallback((svgElement: SVGSVGElement): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      try {
        const svg = svgElement;
        
        // Clone SVG to avoid modifying original
        const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
        
        // Get SVG dimensions
        const viewBox = svg.viewBox?.baseVal;
        let svgWidth = viewBox?.width || parseFloat(svg.getAttribute('width') || '0');
        let svgHeight = viewBox?.height || parseFloat(svg.getAttribute('height') || '0');
        
        // If no dimensions, try to get from bounding box or use defaults
        if (!svgWidth || !svgHeight || svgWidth === 0 || svgHeight === 0) {
          // Try to render temporarily to get dimensions
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.visibility = 'hidden';
          tempDiv.style.width = '1000px';
          tempDiv.style.height = '1000px';
          document.body.appendChild(tempDiv);
          tempDiv.appendChild(clonedSvg.cloneNode(true));
          
          try {
            const bbox = clonedSvg.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
              svgWidth = bbox.width;
              svgHeight = bbox.height;
            } else {
              svgWidth = 800;
              svgHeight = 600;
            }
          } catch {
            svgWidth = 800;
            svgHeight = 600;
          }
          
          document.body.removeChild(tempDiv);
        }

        // Set explicit dimensions
        clonedSvg.setAttribute('width', String(svgWidth));
        clonedSvg.setAttribute('height', String(svgHeight));
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // Ensure all stroke-dasharray attributes are preserved for dashed lines
        // This is important for journey diagrams and other diagram types with dashed lines
        const allElements = clonedSvg.querySelectorAll('*');
        allElements.forEach((el) => {
          const dashArray = el.getAttribute('stroke-dasharray');
          if (dashArray && dashArray !== 'none' && dashArray !== '0') {
            // Ensure stroke-dasharray is explicitly set in style if needed
            const style = el.getAttribute('style') || '';
            if (!style.includes('stroke-dasharray')) {
              el.setAttribute('style', `${style}; stroke-dasharray: ${dashArray};`.trim());
            }
          }
        });
        
        // Serialize SVG to string
        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        
        // Create data URL instead of blob URL for better compatibility
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;

        // Create image and canvas
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Set timeout for image loading
        const timeout = setTimeout(() => {
          reject(new Error('SVG image loading timeout'));
        }, 10000);

        img.onload = () => {
          try {
            clearTimeout(timeout);
            // Render at 3x resolution for better quality when zooming
            const qualityScale = 3;
            const baseWidth = img.width || svgWidth;
            const baseHeight = img.height || svgHeight;
            canvas.width = baseWidth * qualityScale;
            canvas.height = baseHeight * qualityScale;
            
            // Enable high-quality smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Scale context and draw at higher resolution
            ctx.scale(qualityScale, qualityScale);
            ctx.drawImage(img, 0, 0);
            resolve(canvas);
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        };

        img.onerror = (error) => {
          clearTimeout(timeout);
          console.error('SVG image load error:', error);
          reject(new Error('Failed to load SVG image. Make sure the SVG is valid.'));
        };

        // Set crossOrigin before setting src
        img.crossOrigin = 'anonymous';
        img.src = svgDataUrl;
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  // Draw canvas with current zoom and pan
  const drawCanvas = useCallback(() => {
    const sourceCanvas = canvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    const wrapper = wrapperRef.current;
    if (!sourceCanvas || !displayCanvas || !wrapper) return;

    const displayCtx = displayCanvas.getContext('2d');
    if (!displayCtx) return;

    // Update display canvas size to match wrapper - use device pixel ratio for crisp rendering
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 800;
    const height = rect.height || 600;
    
    // Set canvas size (scaled by device pixel ratio for high DPI displays)
    displayCanvas.width = width * dpr;
    displayCanvas.height = height * dpr;
    
    // Set CSS size to match container
    displayCanvas.style.width = `${width}px`;
    displayCanvas.style.height = `${height}px`;
    
    // Reset transform and scale context to match device pixel ratio
    displayCtx.setTransform(1, 0, 0, 1, 0, 0);
    displayCtx.scale(dpr, dpr);

    // Clear display canvas (using CSS dimensions, not canvas dimensions)
    displayCtx.clearRect(0, 0, width, height);

    // Calculate scale and center (using CSS dimensions)
    const scale = zoomLevel / 100;
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw scaled and panned canvas
    // Source canvas is rendered at 3x resolution, so we scale down by 1/3, then apply zoom
    displayCtx.save();
    displayCtx.translate(centerX + positionRef.current.x, centerY + positionRef.current.y);
    displayCtx.scale(scale / 3, scale / 3);
    displayCtx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    displayCtx.restore();
  }, [zoomLevel]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !diagram) return;

    setError(null);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Wait for container to be visible and have dimensions before rendering
    // This prevents "Could not find a suitable point for the given distance" errors
    const checkAndRender = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return false;

      const rect = wrapper.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && 
                       rect.top < window.innerHeight && 
                       rect.bottom > 0;
      
      return isVisible;
    };

    const attemptRender = (retries = 0) => {
      if (!checkAndRender()) {
        // Container not ready yet, retry after a short delay
        if (retries < 10) {
          setTimeout(() => attemptRender(retries + 1), 100);
          return;
        } else {
          // Fallback: render anyway after max retries
          console.warn('Mermaid container not visible after retries, rendering anyway');
        }
      }

      // Ensure wrapper has minimum dimensions for Mermaid layout calculations
      const wrapper = wrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          // Set temporary dimensions if container has none (Mermaid needs dimensions for layout)
          const originalMinWidth = wrapper.style.minWidth;
          const originalMinHeight = wrapper.style.minHeight;
          wrapper.style.minWidth = '800px';
          wrapper.style.minHeight = '600px';
          
          // Clean up temporary styles after a short delay (after Mermaid has calculated layout)
          setTimeout(() => {
            const currentWrapper = wrapperRef.current;
            if (currentWrapper) {
              currentWrapper.style.minWidth = originalMinWidth;
              currentWrapper.style.minHeight = originalMinHeight;
            }
          }, 1000);
        }
      }

      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

      mermaid.render(id, diagram).then(async (result) => {
        if (!containerRef.current || !canvasRef.current) return;

        const svgString = result.svg || '';
        
        // SECURITY: Sanitize SVG content using DOMPurify to prevent XSS
        const sanitizedSvg = sanitizeSvg(svgString);
        
        // Parse SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(sanitizedSvg, 'image/svg+xml');
        const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;

        if (svgElement && svgElement.tagName === 'svg') {
        // Handle <br/> tags in text elements (convert to line breaks for SVG)
        const textElements = svgElement.querySelectorAll('text, tspan');
        textElements.forEach((textEl) => {
          const textContent = textEl.textContent || '';
          if (textContent.includes('<br/>') || textContent.includes('<br>')) {
            // Create tspan elements for each line
            const lines = textContent.split(/<br\s*\/?>/i);
            if (lines.length > 1) {
              // Clear existing content
              textEl.textContent = '';
              // Set baseline for first line
              textEl.setAttribute('dominant-baseline', 'auto');
              
              lines.forEach((line, index) => {
                if (line.trim()) {
                  const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                  tspan.setAttribute('x', textEl.getAttribute('x') || '0');
                  if (index > 0) {
                    tspan.setAttribute('dy', '1.2em'); // Line height
                  }
                  tspan.textContent = line.trim();
                  textEl.appendChild(tspan);
                }
              });
            }
          }
        });
        
        // Add rounded corners to rectangles before rendering to canvas
        const rects = svgElement.querySelectorAll('rect');
        rects.forEach((rect) => {
          const currentRx = rect.getAttribute('rx');
          if (!currentRx || currentRx === '0') {
            rect.setAttribute('rx', '6');
            rect.setAttribute('ry', '6');
          }
        });

        // Convert SVG to canvas
        try {
          const svgCanvas = await svgToCanvas(svgElement);
          const sourceCanvas = canvasRef.current;
          const sourceCtx = sourceCanvas.getContext('2d');
          
          if (sourceCanvas && sourceCtx) {
            // Render at native size - quality will be maintained by imageSmoothingQuality in drawCanvas
            sourceCanvas.width = svgCanvas.width;
            sourceCanvas.height = svgCanvas.height;
            
            // Enable high-quality smoothing on source canvas
            sourceCtx.imageSmoothingEnabled = true;
            sourceCtx.imageSmoothingQuality = 'high';
            
            sourceCtx.drawImage(svgCanvas, 0, 0);
            
            // Reset position only on diagram change
            positionRef.current = { x: 0, y: 0 };
            
            // Calculate initial zoom to fit diagram to canvas
            // Manually draw canvas after initial render (use requestAnimationFrame to ensure DOM is ready)
            requestAnimationFrame(() => {
              const displayCanvas = displayCanvasRef.current;
              const sourceCanvas = canvasRef.current;
              const wrapper = wrapperRef.current;
              if (displayCanvas && sourceCanvas && wrapper) {
                const displayCtx = displayCanvas.getContext('2d');
                if (displayCtx) {
                  const rect = wrapper.getBoundingClientRect();
                  const dpr = window.devicePixelRatio || 1;
                  const width = rect.width || 800;
                  const height = rect.height || 600;
                  
                  displayCanvas.width = width * dpr;
                  displayCanvas.height = height * dpr;
                  displayCanvas.style.width = `${width}px`;
                  displayCanvas.style.height = `${height}px`;
                  
                  // Calculate fit-to-screen zoom level
                  // Source canvas is rendered at 3x resolution, so we need to account for that
                  const sourceWidth = sourceCanvas.width / 3; // Actual display width
                  const sourceHeight = sourceCanvas.height / 3; // Actual display height
                  
                  // Add padding (10px on each side = 20px total)
                  const padding = 20;
                  const availableWidth = width - padding;
                  const availableHeight = height - padding;
                  
                  // Calculate scale to fit both width and height, taking the smaller one
                  const scaleX = availableWidth / sourceWidth;
                  const scaleY = availableHeight / sourceHeight;
                  let fitScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
                  
                  // Apply additional scale reduction to make initial view smaller (70% of fit size)
                  fitScale = fitScale * 0.7;
                  
                  // Convert scale to zoom level (scale is 0-1, zoomLevel is 25-200)
                  const fitZoomLevel = Math.max(25, Math.min(200, Math.round(fitScale * 100)));
                  
                  // Set initial zoom to fit and update scale ref
                  scaleRef.current = fitZoomLevel / 100;
                  setZoomLevel(fitZoomLevel);
                  
                  // The useEffect watching zoomLevel will automatically call drawCanvas
                  // But we need to ensure canvas is drawn immediately, so call it here too
                  // Use the fitZoomLevel directly in the scale calculation
                  displayCtx.imageSmoothingEnabled = true;
                  displayCtx.imageSmoothingQuality = 'high';
                  
                  displayCtx.setTransform(1, 0, 0, 1, 0, 0);
                  displayCtx.scale(dpr, dpr);
                  displayCtx.clearRect(0, 0, width, height);
                  
                  const centerX = width / 2;
                  const centerY = height / 2;
                  
                  displayCtx.save();
                  displayCtx.translate(centerX, centerY);
                  // Scale down by 1/3 since sourceCanvas is rendered at 3x resolution, then apply fit zoom
                  displayCtx.scale(fitScale / 3, fitScale / 3);
                  displayCtx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
                  displayCtx.restore();
                }
              }
            });
          }
        } catch (err) {
          console.error('Failed to convert SVG to canvas:', err);
          setError('Failed to render diagram');
        }
      }
      }).catch((err) => {
        console.error('Mermaid render error:', err);
        setError(err.message || 'Failed to render diagram');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    };

    // Start render attempt with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      attemptRender();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [diagram, isDark, svgToCanvas]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 25));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    scaleRef.current = 1;
    positionRef.current = { x: 0, y: 0 };
    drawCanvas();
  };

  const handleSliderChange = (value: number[]) => {
    setZoomLevel(value[0]);
    scaleRef.current = value[0] / 100;
  };

  // Handle save as PNG
  const handleSavePng = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    // Create a temporary canvas to capture the current display
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Set canvas size to match display canvas
    tempCanvas.width = displayCanvas.width;
    tempCanvas.height = displayCanvas.height;

    // Draw the display canvas to temp canvas
    tempCtx.drawImage(displayCanvas, 0, 0);

    // Convert to PNG and download
    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Gradian_Diagram_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);


  // Handle mouse drag for panning
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      isDraggingRef.current = true;
      lastX = e.clientX;
      lastY = e.clientY;
      displayCanvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      positionRef.current.x += deltaX;
      positionRef.current.y += deltaY;
      lastX = e.clientX;
      lastY = e.clientY;
      drawCanvas();
    };

    const handleMouseUp = () => {
      isDragging = false;
      isDraggingRef.current = false;
      if (displayCanvas) {
        displayCanvas.style.cursor = 'grab';
      }
    };

    displayCanvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      displayCanvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawCanvas]);

  // Handle touch/pinch zoom
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchRef.current = {
          distance: getTouchDistance(touch1, touch2),
          center: getTouchCenter(touch1, touch2),
        };
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        lastTouchRef.current = {
          distance: 0,
          center: { x: touch.clientX, y: touch.clientY },
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && lastTouchRef.current && lastTouchRef.current.distance > 0) {
        // Pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = getTouchDistance(touch1, touch2);
        const scaleChange = currentDistance / lastTouchRef.current.distance;
        
        // Update zoom level
        setZoomLevel((prevZoom) => {
          const newZoom = Math.max(25, Math.min(200, prevZoom * scaleChange));
          scaleRef.current = newZoom / 100;
          return newZoom;
        });
        
        lastTouchRef.current = {
          distance: currentDistance,
          center: getTouchCenter(touch1, touch2),
        };
        
        drawCanvas();
      } else if (e.touches.length === 1 && lastTouchRef.current) {
        // Single touch panning
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchRef.current.center.x;
        const deltaY = touch.clientY - lastTouchRef.current.center.y;
        positionRef.current.x += deltaX;
        positionRef.current.y += deltaY;
        lastTouchRef.current.center = { x: touch.clientX, y: touch.clientY };
        drawCanvas();
      }
    };

    const handleTouchEnd = () => {
      lastTouchRef.current = null;
      isDraggingRef.current = false;
    };

    displayCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    displayCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    displayCanvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      displayCanvas.removeEventListener('touchstart', handleTouchStart);
      displayCanvas.removeEventListener('touchmove', handleTouchMove);
      displayCanvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [drawCanvas]);

  // Redraw canvas when zoom changes
  useEffect(() => {
    scaleRef.current = zoomLevel / 100;
    drawCanvas();
  }, [zoomLevel, drawCanvas]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  if (error) {
    return (
      <div className={`p-4 text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded ${className}`}>
        <p className="font-semibold mb-1">Mermaid Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
      <div className="relative">
        {(showZoomControls || showSaveCopyButtons) && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm" dir="ltr">
            {showSaveCopyButtons && (
              <>
                <CopyContent content={diagram} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSavePng}
                  className="h-7 w-7 p-0"
                  title="Save as PNG"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {showZoomControls && <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />}
              </>
            )}
            {showZoomControls && (
              <>
                <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 25}
              className="h-7 w-7 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              value={[zoomLevel]}
              onValueChange={handleSliderChange}
            min={25}
            max={200}
            step={5}
              className="w-24"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="h-7 w-7 p-0"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-7 w-7 p-0"
              title="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
              </>
            )}
          </div>
        )}
        <div 
          ref={wrapperRef}
          className="overflow-hidden relative w-full bg-gray-50 dark:bg-gray-900/50"
          style={{ minHeight: '300px', height: '500px', maxHeight: '80vh' }}
        >
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          <canvas
            ref={displayCanvasRef}
            className="bg-transparent"
            style={{ 
              display: 'block', 
              cursor: 'grab', 
              touchAction: 'none',
              width: '100%',
              height: '100%'
            }}
          />
          <div ref={containerRef} style={{ display: 'none' }} />
        </div>
      </div>
      {/* Powered by Gradian AI - Footer like CodeViewer header */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800" dir="ltr">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
            Powered by Gradian AI
          </span>
        </div>
      </div>
    </div>
  );
}

