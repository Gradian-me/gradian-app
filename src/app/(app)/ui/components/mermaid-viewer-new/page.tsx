'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';
import { sanitizeSvg } from '@/gradian-ui/shared/utils/html-sanitizer';

const DEFAULT_DIAGRAM = `graph LR
    A --- B
    B-->C[fa:fa-ban forbidden]
    B-->D(fa:fa-spinner);`;

export default function MermaidViewerNewPage() {
  const [mermaidCode, setMermaidCode] = useState(DEFAULT_DIAGRAM);
  const [displayCode, setDisplayCode] = useState(DEFAULT_DIAGRAM);
  const [mounted, setMounted] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useSetLayoutProps({
    title: 'Mermaid Viewer (New)',
    subtitle: 'Simple integration with mermaid.render()',
    icon: 'Workflow',
  });

  const handleRender = () => {
    setDisplayCode(mermaidCode);
  };

  const handleClear = () => {
    setMermaidCode('');
    setDisplayCode('');
    setSvgContent(null);
    setError(null);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !displayCode.trim()) {
      setSvgContent(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setError(null);
    setIsRendering(true);

    const run = async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        if (cancelled) return;

        mermaid.initialize({ startOnLoad: false });

        const id = `mermaid-new-${Math.random().toString(36).slice(2, 11)}`;
        const offscreen = document.createElement('div');
        offscreen.setAttribute('aria-hidden', 'true');
        offscreen.style.cssText = 'position:absolute;left:-9999px;width:800px;height:600px;overflow:hidden;pointer-events:none;';
        document.body.appendChild(offscreen);

        try {
          const result = await mermaid.render(id, displayCode.trim(), offscreen);
          if (cancelled) return;
          const raw = result?.svg ?? '';
          const sanitized = typeof window !== 'undefined' ? sanitizeSvg(raw) : raw;
          setSvgContent(sanitized);
          setError(null);
        } finally {
          try {
            if (offscreen.parentNode) offscreen.parentNode.removeChild(offscreen);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setSvgContent(null);
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mounted, displayCode]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mermaid Diagram Code
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleRender} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
              <RefreshCw className="h-4 w-4 me-2" />
              Render Diagram
            </Button>
          </div>
        </div>

        <Textarea
          value={mermaidCode}
          onChange={(e) => setMermaidCode(e.target.value)}
          placeholder="Enter Mermaid diagram (e.g. graph LR, flowchart TD, sequenceDiagram...)"
          className="min-h-[200px] font-mono text-sm resize-y"
        />

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Renders with <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">mermaid.render()</code> and sanitized SVG output.
        </p>
      </div>

      {displayCode ? (
        <div
          ref={containerRef}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex justify-center items-center min-h-[200px]"
        >
          {!mounted ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
          ) : isRendering ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Rendering diagram…</div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-sm max-w-full overflow-auto">
              {error}
            </div>
          ) : svgContent ? (
            <div
              className="[&_svg]:max-w-full [&_svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
          No diagram to display. Enter code above and click &quot;Render Diagram&quot;.
        </div>
      )}
    </div>
  );
}
