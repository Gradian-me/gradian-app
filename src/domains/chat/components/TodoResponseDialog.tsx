// Todo Response Dialog Component
// Shows todo execution results with MetricCard and content

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card/components/MetricCard';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { DynamicAiAgentResponseContainer } from '@/gradian-ui/data-display/components/DynamicAiAgentResponseContainer';
import { ImageViewer } from '@/gradian-ui/form-builder/form-elements/components/ImageViewer';
import { VideoViewer } from '@/gradian-ui/form-builder/form-elements/components/VideoViewer';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { AISearchResults } from '@/domains/ai-builder/components/AISearchResults';
import { detectMessageRenderType } from '../utils/message-render-utils';
import type { Todo } from '../types';
import type { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import type { ChatMessage } from '../types';
import type { TableColumn, TableConfig } from '@/gradian-ui/data-display/table/types';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';

export interface TodoResponseDialogProps {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TodoResponseDialog: React.FC<TodoResponseDialogProps> = ({
  todo,
  open,
  onOpenChange,
}) => {
  const tokenUsage = todo?.tokenUsage;
  const duration = todo?.duration;
  const cost = todo?.cost;
  const output = todo?.output;
  const responseFormat = todo?.responseFormat || 'string';

  // Prepare metrics for MetricCard
  const metrics = React.useMemo(() => {
    const metricItems: any[] = [];

    if (tokenUsage) {
      metricItems.push({
        id: 'total-tokens',
        label: 'Total Tokens',
        value: tokenUsage.total_tokens,
        unit: 'tokens',
        icon: 'Hash',
        iconColor: 'violet' as const,
        format: 'number' as const,
      });

      if (tokenUsage.pricing) {
        metricItems.push({
          id: 'total-cost',
          label: 'Total Cost',
          value: tokenUsage.pricing.total_cost,
          prefix: '$',
          icon: 'Coins',
          iconColor: 'emerald' as const,
          format: 'currency' as const,
          precision: 4,
        });
      }
    }

    if (duration !== undefined && duration !== null) {
      metricItems.push({
        id: 'duration',
        label: 'Duration',
        value: duration < 1000 ? duration : duration / 1000,
        unit: duration < 1000 ? 'ms' : 's',
        icon: 'Timer',
        iconColor: 'blue' as const,
        format: 'number' as const,
        precision: duration < 1000 ? 0 : 2,
      });
    }

    if (cost !== undefined && cost !== null && !tokenUsage?.pricing) {
      metricItems.push({
        id: 'cost',
        label: 'Cost',
        value: cost,
        prefix: '$',
        icon: 'Coins',
        iconColor: 'emerald' as const,
        format: 'currency' as const,
        precision: 4,
      });
    }

    return metricItems;
  }, [tokenUsage, duration, cost]);

  // Create a mock ChatMessage-like object for unified detection
  // Always call this hook, but return a default if todo is null
  const mockMessage: ChatMessage = React.useMemo(() => {
    if (!todo) {
      return {
        id: '',
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };
    }

    // Convert output to string if needed
    let content = '';
    if (typeof output === 'string') {
      content = output;
    } else if (output && typeof output === 'object') {
      content = JSON.stringify(output, null, 2);
    } else {
      content = String(output || '');
    }

    return {
      id: todo?.id || '',
      role: 'assistant',
      content,
      agentId: todo?.agentId,
      agentType: (todo?.agentType as 'chat' | 'orchestrator' | 'image-generation' | 'voice-transcription' | 'video-generation' | 'graph-generation' | 'search' | undefined) || 'chat',
      metadata: {
        responseFormat: responseFormat as any,
        searchResults: (todo as any)?.searchResults || undefined,
      },
      createdAt: new Date().toISOString(),
    };
  }, [todo, output, responseFormat]);

  // Use unified detection function - always call this hook
  const renderData = React.useMemo(() => {
    if (!todo) {
      return {
        type: 'markdown' as const,
        markdownData: '',
      };
    }
    return detectMessageRenderType(mockMessage);
  }, [todo, mockMessage]);

  // For agent container, create mock action and schema (for backward compatibility)
  // Always create these, but with safe defaults when todo is null
  const agentAction: QuickAction = React.useMemo(() => ({
    id: todo?.id || '',
    label: todo?.agentId || 'AI Response',
    icon: 'Sparkles',
    componentType: 'ai-agent-response',
    action: 'runAiAgent',
    agentId: todo?.agentId,
  }), [todo?.id, todo?.agentId]);

  const agentSchema: FormSchema = React.useMemo(() => ({
    id: 'todo-response',
    singular_name: 'Todo Response',
    plural_name: 'Todo Responses',
    description: 'AI generated response for todo',
    icon: 'BotMessageSquare',
    fields: [],
    sections: [],
  }), []);

  // Generate table columns if needed - always call this hook
  const tableColumns = React.useMemo<TableColumn[]>(() => {
    if (!todo || renderData.type !== 'table' || !renderData.tableData || !Array.isArray(renderData.tableData)) {
      return [];
    }

    const tableData = renderData.tableData;
    const allKeys = new Set<string>();
    tableData.forEach((item) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((key) => allKeys.add(key));
      }
    });

    return Array.from(allKeys).map((key) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      const firstValue = tableData.find((item) => item?.[key] != null)?.[key];
      const isNumeric = typeof firstValue === 'number';

      return {
        id: key,
        label,
        accessor: key,
        sortable: true,
        align: isNumeric ? 'right' : 'left',
        render: (value: any) => {
          if (value === null || value === undefined) return '—';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        },
      } as TableColumn;
    });
  }, [todo, renderData]);

  // Always call this hook
  const tableConfig: TableConfig = React.useMemo(() => {
    if (!todo || renderData.type !== 'table' || !renderData.tableData || !Array.isArray(renderData.tableData)) {
      return {
        id: 'todo-response-table',
        columns: [],
        data: [],
        pagination: { enabled: false },
        sorting: { enabled: false },
        filtering: { enabled: false },
      };
    }

    const tableData = renderData.tableData;
    return {
      id: 'todo-response-table',
      columns: tableColumns,
      data: tableData,
      pagination: {
        enabled: tableData.length > 10,
        pageSize: DEFAULT_LIMIT,
        showPageSizeSelector: true,
        pageSizeOptions: [10, 25, 50, 100, 500],
      },
      sorting: { enabled: true },
      filtering: { enabled: true, globalSearch: true },
      emptyState: { message: 'No data available' },
      striped: true,
      hoverable: true,
      bordered: false,
    };
  }, [todo, renderData, tableColumns]);

  // Early return AFTER all hooks
  if (!todo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <DialogTitle>{todo?.title || 'Todo Response'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* MetricCard */}
          {metrics.length > 0 && (
            <MetricCard
              metrics={metrics}
              footer={{
                icon: 'Sparkles',
                text: 'Powered by Gradian AI • Efficient & Cost-Effective',
              }}
              gradient="indigo"
            />
          )}

          {/* Response Content */}
          {output && (
            <div className="mt-4">
              {(() => {
                // Use unified renderData to determine what to render
                if (renderData.type === 'search' && renderData.searchResults && renderData.searchResults.length > 0) {
                  return (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                      <AISearchResults results={renderData.searchResults} />
                    </div>
                  );
                }

                if (renderData.type === 'image' && renderData.imageData) {
                  const imageData = renderData.imageData;
                  return (
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                      <ImageViewer
                        value={typeof imageData === 'object' ? imageData : undefined}
                        sourceUrl={imageData?.url || (typeof imageData === 'string' && !imageData.startsWith('data:') && (imageData.startsWith('/') || imageData.startsWith('http://') || imageData.startsWith('https://')) ? imageData : undefined)}
                        content={imageData?.b64_json || (typeof imageData === 'string' && imageData.startsWith('data:') ? imageData : undefined)}
                        alt="Generated image"
                        width={1024}
                        height={1024}
                        objectFit="contain"
                        className="w-full"
                      />
                    </div>
                  );
                }

                if (renderData.type === 'video' && renderData.videoData) {
                  const videoData = renderData.videoData;
                  return (
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <VideoViewer
                        videoId={videoData?.video_id || undefined}
                        sourceUrl={videoData?.url || (typeof videoData === 'string' ? videoData : undefined)}
                        content={videoData?.file_path || undefined}
                        value={videoData}
                        alt="Generated video"
                        className="w-full h-auto"
                        controls={true}
                        autoplay={false}
                      />
                    </div>
                  );
                }

                if (renderData.type === 'graph' && renderData.graphData) {
                  const graphData = renderData.graphData;
                  return (
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <div className="w-full h-[600px] min-h-[400px]">
                        <GraphViewer
                          data={
                            typeof graphData === 'object' && graphData && 'graph' in graphData
                              ? (graphData as any).graph
                              : typeof graphData === 'object' && graphData && Array.isArray((graphData as any).nodes)
                              ? graphData
                              : { nodes: [], edges: [] }
                          }
                          height="100%"
                        />
                      </div>
                    </div>
                  );
                }

                if (renderData.type === 'table' && renderData.tableData && Array.isArray(renderData.tableData) && renderData.tableData.length > 0) {
                  return (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                      <TableWrapper
                        tableConfig={tableConfig}
                        columns={tableColumns}
                        data={renderData.tableData}
                        showCards={false}
                        disableAnimation={false}
                      />
                    </div>
                  );
                }

                if (renderData.type === 'json' && renderData.jsonData) {
                  return (
                    <CodeViewer
                      code={typeof renderData.jsonData === 'string' ? renderData.jsonData : JSON.stringify(renderData.jsonData, null, 2)}
                      programmingLanguage="json"
                      title="Response Data"
                      initialLineNumbers={10}
                    />
                  );
                }

                if (renderData.type === 'string' && renderData.stringData) {
                  return (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownViewer
                        content={renderData.stringData}
                      />
                    </div>
                  );
                }

                // Fallback to markdown or DynamicAiAgentResponseContainer for backward compatibility
                if (['json', 'table'].includes(responseFormat)) {
                  return (
                    <DynamicAiAgentResponseContainer
                      action={agentAction}
                      schema={agentSchema}
                      data={{ response: typeof output === 'string' ? output : JSON.stringify(output, null, 2) }}
                    />
                  );
                }

                // Default: render as markdown
                return (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownViewer
                      content={typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

TodoResponseDialog.displayName = 'TodoResponseDialog';

