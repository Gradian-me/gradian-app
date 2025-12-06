/**
 * AI Builder Response Component
 * Displays the AI response with actions
 */

'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Loader2, Sparkles, Timer } from 'lucide-react';
import { MetricCard } from '@/gradian-ui/analytics';
import { ResponseCardViewer } from './ResponseCardViewer';
import { ResponseAnnotationViewer } from './ResponseAnnotationViewer';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { cn } from '@/gradian-ui/shared/utils';
import type { TableColumn, TableConfig } from '@/gradian-ui/data-display/table/types';
import type { AiAgent, TokenUsage, SchemaAnnotation, AnnotationItem } from '../types';

interface AiBuilderResponseProps {
  response: string;
  agent: AiAgent | null;
  tokenUsage: TokenUsage | null;
  duration: number | null;
  isApproving: boolean;
  isLoading?: boolean;
  onApprove: () => void;
  onCardClick?: (cardData: { id: string; label: string; icon?: string }, schemaData: any) => void;
  annotations?: SchemaAnnotation[];
  onAnnotationsChange?: (schemaId: string, annotations: AnnotationItem[]) => void;
  onRemoveSchema?: (schemaId: string) => void;
  onApplyAnnotations?: (annotations: SchemaAnnotation[]) => void;
}

// Utility function to generate table columns from JSON data
function generateColumnsFromData(data: any[]): TableColumn[] {
  if (!data || data.length === 0) return [];

  // Get all unique keys from all objects in the array
  const allKeys = new Set<string>();
  data.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((key) => allKeys.add(key));
    }
  });

  // Generate columns from keys
  return Array.from(allKeys).map((key) => {
    // Format key to label (e.g., "firstName" -> "First Name")
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    // Determine alignment based on value type
    const firstValue = data.find((item) => item?.[key] != null)?.[key];
    const isNumeric = typeof firstValue === 'number';
    const align = isNumeric ? 'right' : 'left';

    return {
      id: key,
      label,
      accessor: key,
      sortable: true,
      align,
      render: (value: any) => {
        if (value === null || value === undefined) {
          return '—';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      },
    } as TableColumn;
  });
}

// Utility function to parse JSON and extract array data
function parseTableData(response: string): { data: any[]; isValid: boolean } {
  try {
    const parsed = JSON.parse(response);

    // If it's already an array, return it
    if (Array.isArray(parsed)) {
      return { data: parsed, isValid: true };
    }

    // If it's an object with a single array property, extract that
    if (typeof parsed === 'object' && parsed !== null) {
      const keys = Object.keys(parsed);
      if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
        return { data: parsed[keys[0]], isValid: true };
      }
      // If it's an object, wrap it in an array
      return { data: [parsed], isValid: true };
    }

    return { data: [], isValid: false };
  } catch {
    return { data: [], isValid: false };
  }
}

export function AiBuilderResponse({
  response,
  agent,
  tokenUsage,
  duration,
  isApproving,
  isLoading = false,
  onApprove,
  onCardClick,
  annotations = [],
  onAnnotationsChange,
  onRemoveSchema,
  onApplyAnnotations,
}: AiBuilderResponseProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevIsLoadingRef = useRef<boolean>(isLoading);

  // Scroll to "Your Creation" heading when generation finishes
  useEffect(() => {
    // Check if generation just finished (isLoading changed from true to false)
    if (prevIsLoadingRef.current === true && isLoading === false && response && headingRef.current) {
      // Longer delay to ensure DOM is fully updated and rendered
      setTimeout(() => {
        if (headingRef.current) {
          // Calculate offset to account for any fixed headers
          const element = headingRef.current;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - 20; // 20px offset from top

          // Use smooth scroll with requestAnimationFrame for better performance
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 300);
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, response]);

  // Check if we should render as table
  const shouldRenderTable = agent?.requiredOutputFormat === 'table';
  const { data: tableData, isValid: isValidTable } = useMemo(() => {
    if (!response || !shouldRenderTable) {
      return { data: [], isValid: false };
    }
    return parseTableData(response);
  }, [response, shouldRenderTable]);

  const tableColumns = useMemo(() => {
    if (!shouldRenderTable || !isValidTable || tableData.length === 0) {
      return [];
    }
    return generateColumnsFromData(tableData);
  }, [shouldRenderTable, isValidTable, tableData]);

  const tableConfig: TableConfig = useMemo(() => {
    return {
      id: 'ai-response-table',
      columns: tableColumns,
      data: tableData,
      pagination: {
        enabled: tableData.length > 10,
        pageSize: 10,
        showPageSizeSelector: true,
        pageSizeOptions: [10, 25, 50, 100],
      },
      sorting: {
        enabled: true,
      },
      filtering: {
        enabled: true,
        globalSearch: true,
      },
      emptyState: {
        message: 'No data available',
      },
      striped: true,
      hoverable: true,
      bordered: false,
    };
  }, [tableColumns, tableData]);

  if (!response) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          ref={headingRef}
          className="text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          Your Creation
        </h2>
        {agent?.nextAction && (
          <Button
            onClick={onApprove}
            disabled={isApproving}
            variant="default"
            size="default"
          >
            {isApproving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {agent.nextAction.icon && (
                  <IconRenderer
                    iconName={agent.nextAction.icon}
                    className="me-2 h-4 w-4"
                  />
                )}
                {agent.nextAction.label}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Token Usage & Pricing - MetricCard */}
      {tokenUsage && (
        <MetricCard
          gradient="indigo"
          metrics={[
            {
              id: 'total-tokens',
              label: 'Total Tokens',
              value: tokenUsage.total_tokens,
              unit: 'tokens',
              icon: 'Hash',
              iconColor: 'cyan',
              format: 'number',
            },
            {
              id: 'total-cost',
              label: 'Total Cost',
              value: tokenUsage.pricing?.total_cost || 0,
              prefix: '$',
              icon: 'Coins',
              iconColor: 'pink',
              format: 'currency',
              precision: 4,
            },
            ...(duration !== null ? [{
              id: 'duration',
              label: 'Duration',
              value: duration < 1000 ? duration : duration / 1000,
              unit: duration < 1000 ? 'ms' : 's',
              icon: 'Timer',
              iconColor: 'emerald' as const,
              format: 'number' as const,
              precision: duration < 1000 ? 0 : 2,
            }] : []),
          ]}
          footer={{
            icon: 'Sparkles',
            text: 'Powered by Gradian AI • Efficient & Cost-Effective',
          }}
        />
      )}

      {agent?.responseCards && agent.responseCards.length > 0 && onCardClick && (
        <ResponseCardViewer
          response={response}
          responseCards={agent.responseCards}
          onCardClick={onCardClick}
        />
      )}

      {/* Schema Annotations - shown on top of AI generated content */}
      {annotations.length > 0 && onAnnotationsChange && onRemoveSchema && (
        <ResponseAnnotationViewer
          annotations={annotations}
          onAnnotationsChange={onAnnotationsChange}
          onRemoveSchema={onRemoveSchema}
          onApply={onApplyAnnotations}
        />
      )}

      {shouldRenderTable && isValidTable && tableData.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <TableWrapper
              tableConfig={tableConfig}
              columns={tableColumns}
              data={tableData}
              showCards={false}
              disableAnimation={false}
            />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              View Raw JSON
            </summary>
            <div className="mt-2">
              <CodeViewer
                code={response}
                programmingLanguage="json"
                title="Raw JSON Response"
                initialLineNumbers={10}
              />
            </div>
          </details>
        </div>
      ) : agent?.requiredOutputFormat === 'string' ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 me-2" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                AI Generated Content
              </h3>
            </div>
            <CopyContent content={response} />
          </div>
          <div className="w-full">
            <div className="p-4">
              <MarkdownViewer 
                content={response}
                showToggle={true}
          />
            </div>
          </div>
        </div>
      ) : (
        <CodeViewer
          code={response}
          programmingLanguage={agent?.requiredOutputFormat === 'json' ? 'json' : 'text'}
          title="AI Generated Content"
          initialLineNumbers={10}
        />
      )}
    </div>
  );
}

