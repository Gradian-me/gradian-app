'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';
import { MermaidViewerPure } from './MermaidViewerPure';

const DEFAULT_DIAGRAM = `flowchart TD
    A[Christmas] -->|Get money| B[Go shopping]
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]`;

export default function MermaidViewerNewPage() {
  const [mermaidCode, setMermaidCode] = useState(DEFAULT_DIAGRAM);
  const [displayCode, setDisplayCode] = useState(DEFAULT_DIAGRAM);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useSetLayoutProps({
    title: 'Mermaid Viewer (New)',
    subtitle: 'MermaidViewerPure + mermaid.run()',
    icon: 'Workflow',
  });

  const handleRender = () => {
    setError(null);
    setDisplayCode(mermaidCode);
  };

  const handleClear = () => {
    setMermaidCode('');
    setDisplayCode('');
    setError(null);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !displayCode.trim()) return;

    let cancelled = false;
    setError(null);
    setIsRendering(true);

    const run = async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        if (cancelled) return;

        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const container = containerRef.current;
        if (!container) return;
        if (cancelled) return;

        const nodeList = container.querySelectorAll<HTMLElement>('.mermaid');
        if (nodeList.length === 0) return;

        await mermaid.run({
          nodes: Array.from(nodeList),
          suppressErrors: false,
        });
      } catch (err) {
        if (!cancelled) {
          let message: string;
          if (err instanceof Error) {
            message = err.message;
          } else if (typeof err === 'object' && err !== null && 'message' in err) {
            const m = (err as { message?: unknown }).message;
            message = typeof m === 'string' ? m : String(m ?? '');
          } else {
            message = String(err);
          }
          if (message === '[object Object]' || !message.trim()) {
            message = 'Failed to render diagram';
          }
          setError(message);
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
          Renders with <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">MermaidViewerPure</code> and <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">mermaid.run()</code>.
        </p>
      </div>

      {displayCode ? (
        <div
          ref={containerRef}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col justify-center items-center min-h-[200px] relative"
        >
          {!mounted && (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
          )}
          {mounted && isRendering && (
            <div className="text-gray-400 dark:text-gray-500 text-sm absolute top-4 left-4">Rendering…</div>
          )}
          {mounted && error && (
            <div className="text-red-600 dark:text-red-400 text-sm max-w-full overflow-auto w-full">
              {error}
            </div>
          )}
          {mounted && (
            <div className="w-full [&_svg]:max-w-full [&_svg]:h-auto [&_.mermaid]:min-h-[120px]">
              <MermaidViewerPure definition={displayCode} />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
          No diagram to display. Enter code above and click &quot;Render Diagram&quot;.
        </div>
      )}
    </div>
  );
}
