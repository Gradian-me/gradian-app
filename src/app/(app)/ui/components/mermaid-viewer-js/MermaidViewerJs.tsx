import React, { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';

const DEFAULT_DIAGRAM = `flowchart TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`;

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: unknown) => void;
      init?: (config: unknown, node: Element | Element[]) => void;
      run?: (options: { nodes: Element[]; suppressErrors?: boolean }) => Promise<void> | void;
    };
  }
}

export function MermaidViewerJs() {
  const [code, setCode] = useState(DEFAULT_DIAGRAM);
  const [displayCode, setDisplayCode] = useState(DEFAULT_DIAGRAM);
  const [isMermaidReady, setIsMermaidReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rawRef = useRef<HTMLPreElement | null>(null);
  const zoomSliderRef = useRef<HTMLInputElement | null>(null);
  const zoomValueRef = useRef<HTMLSpanElement | null>(null);

  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  const isPanningRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastTouchDistanceRef = useRef<number | null>(null);

  const applyTransform = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const scale = scaleRef.current;
    const tx = translateXRef.current;
    const ty = translateYRef.current;
    container.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, []);

  const setScale = useCallback(
    (nextScale: number, cx?: number, cy?: number) => {
      const container = containerRef.current;
      if (!container) return;

      const oldScale = scaleRef.current;
      const clamped = Math.min(3, Math.max(0.3, nextScale));
      scaleRef.current = clamped;

      if (typeof cx === 'number' && typeof cy === 'number') {
        const rect = container.getBoundingClientRect();
        const dx = cx - rect.left;
        const dy = cy - rect.top;
        translateXRef.current -= dx * (clamped / oldScale - 1);
        translateYRef.current -= dy * (clamped / oldScale - 1);
      }

      if (zoomSliderRef.current) {
        zoomSliderRef.current.value = String(clamped);
      }
      if (zoomValueRef.current) {
        zoomValueRef.current.textContent = `${Math.round(clamped * 100)}%`;
      }

      applyTransform();
    },
    [applyTransform],
  );

  const fitToScreen = useCallback(() => {
    scaleRef.current = 1;
    translateXRef.current = 0;
    translateYRef.current = 0;

    if (zoomSliderRef.current) {
      zoomSliderRef.current.value = '1';
    }
    if (zoomValueRef.current) {
      zoomValueRef.current.textContent = '100%';
    }

    applyTransform();
  }, [applyTransform]);

  const handleRenderClick = useCallback(() => {
    setError(null);
    setDisplayCode(code);
  }, [code]);

  const handleClear = useCallback(() => {
    setCode('');
    setDisplayCode('');
    setError(null);
  }, []);

  const switchMode = useCallback((mode: 'chart' | 'raw') => {
    const container = containerRef.current;
    const raw = rawRef.current;
    if (!container || !raw) return;

    if (mode === 'chart') {
      container.style.display = 'block';
      raw.style.display = 'none';
    } else {
      container.style.display = 'block';
      raw.style.display = 'block';
    }
  }, []);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore clipboard errors for demo
    }
  }, [code]);

  const exportPNG = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) {
      // eslint-disable-next-line no-alert
      alert('No diagram to export');
      return;
    }

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('style');
    clone.removeAttribute('transform');

    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'mermaid-diagram.png';
      link.click();
    };
    img.src = url;
  }, []);

  const getTouchDistance = (e: TouchEvent) => {
    const [t0, t1] = [e.touches[0], e.touches[1]];
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const attachPanZoomListeners = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale(scaleRef.current - event.deltaY * 0.0015, event.clientX, event.clientY);
    };

    const handleMouseDown = (event: MouseEvent) => {
      isPanningRef.current = true;
      startXRef.current = event.clientX - translateXRef.current;
      startYRef.current = event.clientY - translateYRef.current;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isPanningRef.current) return;
      translateXRef.current = event.clientX - startXRef.current;
      translateYRef.current = event.clientY - startYRef.current;
      applyTransform();
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        isPanningRef.current = true;
        const touch = event.touches[0];
        startXRef.current = touch.clientX - translateXRef.current;
        startYRef.current = touch.clientY - translateYRef.current;
      } else if (event.touches.length === 2) {
        lastTouchDistanceRef.current = getTouchDistance(event);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      if (event.touches.length === 1 && isPanningRef.current) {
        const touch = event.touches[0];
        translateXRef.current = touch.clientX - startXRef.current;
        translateYRef.current = touch.clientY - startYRef.current;
        applyTransform();
      } else if (event.touches.length === 2 && lastTouchDistanceRef.current) {
        const newDist = getTouchDistance(event);
        const factor = newDist / lastTouchDistanceRef.current;
        const cx = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const cy = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        setScale(scaleRef.current * factor, cx, cy);
        lastTouchDistanceRef.current = newDist;
      }
    };

    const handleTouchEnd = () => {
      isPanningRef.current = false;
      lastTouchDistanceRef.current = null;
    };

    const handleZoomInput = () => {
      if (!zoomSliderRef.current) return;
      const value = Number.parseFloat(zoomSliderRef.current.value);
      setScale(Number.isFinite(value) ? value : 1);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    zoomSliderRef.current?.addEventListener('input', handleZoomInput);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);

      zoomSliderRef.current?.removeEventListener('input', handleZoomInput);
    };
  }, [applyTransform, setScale]);

  const renderMermaid = useCallback(() => {
    const mermaid = typeof window !== 'undefined' ? window.mermaid : undefined;
    const container = containerRef.current;
    const raw = rawRef.current;

    if (!container || !raw) {
      return;
    }

    container.innerHTML = '';
    raw.textContent = displayCode;

    if (!displayCode.trim()) {
      fitToScreen();
      return;
    }

    if (!mermaid) {
      const message = 'Mermaid library is not available on window. Check that the CDN script loaded correctly.';
      setError(message);
      container.innerHTML = `<pre style="color:red;">${message}</pre>`;
      return;
    }

    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = displayCode;
    container.appendChild(div);

    fitToScreen();

    try {
      if (typeof mermaid.run === 'function') {
        void mermaid.run({ nodes: [div], suppressErrors: false });
      } else if (typeof mermaid.init === 'function') {
        mermaid.init({ startOnLoad: false }, div);
      } else {
        throw new Error('Mermaid API does not expose run() or init().');
      }
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Failed to render diagram';
      setError(message);
      container.innerHTML = `<pre style="color:red;">${message}</pre>`;
    }
  }, [displayCode, fitToScreen]);

  useEffect(() => {
    if (!isMermaidReady) return;

    const mermaid = window.mermaid;
    if (!mermaid) {
      setError('Mermaid library failed to load from CDN.');
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    const detach = attachPanZoomListeners();
    renderMermaid();

    return () => {
      detach?.();
    };
  }, [isMermaidReady, attachPanZoomListeners, renderMermaid]);

  useEffect(() => {
    if (!isMermaidReady) return;
    renderMermaid();
  }, [displayCode, isMermaidReady, renderMermaid]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Mark ready when the script loads; the effects
          // will check for window.mermaid before using it.
          setIsMermaidReady(true);
        }}
      />

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Mermaid Flowchart Renderer (CDN JS Demo)
          </h2>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full min-h-[200px] font-mono text-sm mb-4 resize-y"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleRenderClick}>
              <RefreshCw className="h-4 w-4 me-2" />
              Render Mermaid
            </Button>
            <Button variant="outline" size="sm" onClick={fitToScreen}>
              Reset (Fit)
            </Button>
            <Button variant="outline" size="sm" onClick={exportPNG}>
              Export PNG
            </Button>
            <div className="flex items-center gap-2 ms-auto">
              <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-900/60 p-1">
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded-full bg-white shadow-sm"
                  onClick={() => switchMode('chart')}
                >
                  Chart
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded-full"
                  onClick={() => switchMode('raw')}
                >
                  Raw
                </button>
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="text-lg leading-none px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                aria-label="Copy Mermaid code"
              >
                📋
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Button variant="ghost" size="xs" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[600px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Viewer</span>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Drag to pan</span>
                <span>·</span>
                <span>Scroll / pinch to zoom</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={zoomSliderRef}
                type="range"
                min={0.3}
                max={3}
                step={0.1}
                defaultValue={1}
                className="w-36"
              />
              <span ref={zoomValueRef} className="text-xs text-gray-600 dark:text-gray-300">
                100%
              </span>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center bg-white dark:bg-gray-900">
            {!isMermaidReady && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 pointer-events-none">
                Loading Mermaid library from CDN…
              </div>
            )}
            <div
              ref={containerRef}
              className="cursor-grab transition-transform duration-75 will-change-transform origin-center"
            />
            <pre
              ref={rawRef}
              className="hidden absolute inset-0 m-0 p-4 overflow-auto text-xs font-mono bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            />
          </div>

          {error && (
            <div className="px-4 py-2 text-xs text-red-600 dark:text-red-400 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

