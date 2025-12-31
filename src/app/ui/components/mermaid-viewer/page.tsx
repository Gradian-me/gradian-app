'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { MermaidDiagramSimple } from '@/gradian-ui/data-display/markdown/components/MermaidDiagramSimple';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';

export default function MermaidViewerPage() {
  const [mermaidCode, setMermaidCode] = useState(`flowchart TD
    A[Christmas] -->|Get money| B[Go shopping]
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`);
  
  const [displayCode, setDisplayCode] = useState(mermaidCode);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRender = () => {
    setDisplayCode(mermaidCode);
    setRefreshKey(prev => prev + 1); // Force re-render
  };

  const handleClear = () => {
    setMermaidCode('');
    setDisplayCode('');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <MainLayout
      title="Mermaid Viewer"
      subtitle="Test and preview Mermaid diagrams"
      icon="Workflow"
    >
      <div className="space-y-6">
        {/* Input Section */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Mermaid Diagram Code
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-gray-600 dark:text-gray-400"
              >
                Clear
              </Button>
              <Button
                onClick={handleRender}
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <RefreshCw className="h-4 w-4 me-2" />
                Render Diagram
              </Button>
            </div>
          </div>
          
          <Textarea
            value={mermaidCode}
            onChange={(e) => setMermaidCode(e.target.value)}
            placeholder="Paste or type your Mermaid diagram code here...

Example (follows MERMAID_RULES):
flowchart TD
    A[Christmas] -->|Get money| B[Go shopping]
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]

Remember:
- Always use node IDs: A[Text], B(Text), C{Text}
- Edge labels: A -->|Label| B (flowcharts only)
- Shapes: [Rectangle], (Rounded), {Diamond}, ([Stadium])"
            className={cn(
              "min-h-[200px] font-mono text-sm",
              "resize-y",
              "border-gray-300 dark:border-gray-600",
              "bg-gray-50 dark:bg-gray-900/50",
              "focus:ring-violet-500 focus:border-violet-500"
            )}
          />
          
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              💡 <strong>Tip:</strong> Paste your Mermaid code above and click "Render Diagram" to preview it.
            </p>
            <p>
              ⚠️ <strong>Common Error:</strong> Keep arrows and target nodes on the same line. 
              Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">A --&gt; B[Text]</code> not <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">A --&gt;&lt;br/&gt;B[Text]</code>
            </p>
            <p>
              ✅ <strong>Always use node IDs:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">A[Text]</code>, <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">B(Text)</code>, <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{"C{Text}"}</code>
            </p>
            <p className="mt-1">
              Supports flowcharts, sequence diagrams, gantt charts, and more. Learn more at{' '}
              <a 
                href="https://mermaid.js.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-violet-600 dark:text-violet-400 hover:underline"
              >
                mermaid.js.org
              </a>
            </p>
          </div>
        </div>

        {/* Diagram Display Section */}
        {displayCode && (
          <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <MermaidDiagramSimple 
              key={refreshKey}
              diagram={displayCode}
              className="w-full"
            />
          </div>
        )}

        {!displayCode && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
            <div className="text-gray-400 dark:text-gray-500">
              <svg
                className="mx-auto h-12 w-12 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-medium mb-2">No diagram to display</p>
              <p className="text-sm">Enter Mermaid code above and click "Render Diagram" to preview</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
