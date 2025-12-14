// Dynamic AI Agent Response Container Component
// Renders AI agent responses inline as card sections with gradient header

'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { CardContent, CardHeader, CardTitle, CardWrapper } from '../card/components/CardWrapper';
import { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '../../shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { replaceDynamicContextInObject } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { AiAgent } from '@/domains/ai-builder/types';
import { useAiBuilder } from '@/domains/ai-builder/hooks/useAiBuilder';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { ImageViewer } from '@/gradian-ui/form-builder/form-elements/components/ImageViewer';
import type { TableColumn, TableConfig } from '@/gradian-ui/data-display/table/types';

export interface DynamicAiAgentResponseContainerProps {
  action: QuickAction;
  schema: FormSchema;
  data: any;
  className?: string;
  disableAnimation?: boolean;
  index?: number;
}

export const DynamicAiAgentResponseContainer: React.FC<DynamicAiAgentResponseContainerProps> = ({
  action,
  schema,
  data,
  className,
  disableAnimation = false,
  index = 0,
}) => {
  const [agent, setAgent] = useState<AiAgent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [preloadRoutes, setPreloadRoutes] = useState<Array<{
    route: string;
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>;
    outputFormat?: 'json' | 'string' | 'toon';
    includedFields?: string[];
  }>>([]);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [processedBody, setProcessedBody] = useState<Record<string, any> | undefined>(undefined);
  const [processedExtraBody, setProcessedExtraBody] = useState<Record<string, any> | undefined>(undefined);
  const [hasExecuted, setHasExecuted] = useState(false);
  const autoExecuteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    aiResponse,
    isLoading,
    error,
    generateResponse,
    loadPreloadRoutes,
  } = useAiBuilder();

  // Utility function to parse JSON and extract array data for tables
  const parseTableData = useCallback((response: string): { data: any[]; isValid: boolean } => {
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
  }, []);

  // Utility function to generate table columns from JSON data
  const generateColumnsFromData = useCallback((data: any[]): TableColumn[] => {
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
  }, []);

  // Parse image data if format is image
  const imageData = useMemo(() => {
    if (!aiResponse || !agent) return null;
    
    const agentFormatValue = agent.requiredOutputFormat as string | undefined;
    const isImageFormat = agentFormatValue === 'image';
    
    // Only try to parse as JSON if agent format is image or content looks like JSON
    const trimmedContent = aiResponse.trim();
    const looksLikeJson = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');
    
    if (!isImageFormat && !looksLikeJson) {
      return null;
    }
    
    try {
      const parsed = JSON.parse(aiResponse);
      
      // Check if response has image structure
      const hasImageStructure = parsed && typeof parsed === 'object' && parsed.image && 
        (parsed.image.url || parsed.image.b64_json);
      
      if (!isImageFormat && !hasImageStructure) {
        return null;
      }
      
      if (parsed && typeof parsed === 'object' && parsed.image) {
        const img = parsed.image;
        if (img && (img.url || img.b64_json)) {
          return img;
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [aiResponse, agent]);

  // Determine render format
  const shouldRenderImage = useMemo(() => {
    const agentFormatValue = agent?.requiredOutputFormat as string | undefined;
    return agentFormatValue === 'image' || !!imageData;
  }, [agent?.requiredOutputFormat, imageData]);

  const shouldRenderTable = agent?.requiredOutputFormat === 'table';
  const { data: tableData, isValid: isValidTable } = useMemo(() => {
    if (!aiResponse || !shouldRenderTable) {
      return { data: [], isValid: false };
    }
    return parseTableData(aiResponse);
  }, [aiResponse, shouldRenderTable, parseTableData]);

  const tableColumns = useMemo(() => {
    if (!shouldRenderTable || !isValidTable || tableData.length === 0) {
      return [];
    }
    return generateColumnsFromData(tableData);
  }, [shouldRenderTable, isValidTable, tableData, generateColumnsFromData]);

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

  // Load agent on mount
  useEffect(() => {
    if (!action.agentId) {
      setIsLoadingAgent(false);
      return;
    }

    setIsLoadingAgent(true);
    fetch(`/api/ai-agents/${action.agentId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setAgent(result.data);
        } else {
          console.error('Failed to load agent:', result.error);
        }
      })
      .catch(err => {
        console.error('Error loading agent:', err);
      })
      .finally(() => {
        setIsLoadingAgent(false);
      });
  }, [action.agentId]);

  // Process preset body and extra_body with dynamic context replacement
  useEffect(() => {
    if (!data || !schema) {
      setProcessedBody(undefined);
      setProcessedExtraBody(undefined);
      return;
    }

    // Process body if provided
    if (action.body) {
      const processed = replaceDynamicContextInObject(action.body, {
        formSchema: schema,
        formData: data,
      });
      setProcessedBody(processed);
    } else {
      setProcessedBody(undefined);
    }

    // Process extra_body if provided
    if (action.extra_body) {
      const processed = replaceDynamicContextInObject(action.extra_body, {
        formSchema: schema,
        formData: data,
      });
      setProcessedExtraBody(processed);
    } else {
      setProcessedExtraBody(undefined);
    }
  }, [data, schema, action.body, action.extra_body]);

  // Build preload routes from current item, selected sections, and action-defined routes
  useEffect(() => {
    if (!data || !schema) return;

    const routes: typeof preloadRoutes = [];

    // Collect all field names from selectedFields and selectedSections
    const allSelectedFieldNames = new Set<string>();

    // Add fields from selectedFields
    if (action.selectedFields && action.selectedFields.length > 0) {
      action.selectedFields.forEach((fieldId) => {
        const field = schema.fields?.find(f => f.id === fieldId);
        if (field && field.name) {
          allSelectedFieldNames.add(field.name);
        } else {
          allSelectedFieldNames.add(fieldId);
        }
      });
    }

    // Add fields from selectedSections
    if (action.selectedSections && action.selectedSections.length > 0) {
      action.selectedSections.forEach((sectionId) => {
        const section = schema.sections?.find(s => s.id === sectionId);
        if (section) {
          const sectionFields = schema.fields?.filter(f => f.sectionId === sectionId) || [];
          sectionFields.forEach(field => {
            if (field.name) {
              allSelectedFieldNames.add(field.name);
            }
          });
        }
      });
    }

    // Single route: current item API endpoint with all selected fields
    if (data.id && allSelectedFieldNames.size > 0) {
      routes.push({
        route: `/api/data/${schema.id}/${data.id}`,
        title: `${schema.singular_name || schema.name} Data`,
        description: `Current ${schema.singular_name || schema.name} item data with selected fields and sections`,
        method: 'GET',
        jsonPath: 'data',
        outputFormat: 'json',
        includedFields: Array.from(allSelectedFieldNames),
      });
    }

    // Add preload routes from action configuration (with dynamic context replacement)
    if (action.preloadRoutes && action.preloadRoutes.length > 0) {
      const processedRoutes = action.preloadRoutes.map(route => {
        const processed = replaceDynamicContextInObject(route, {
          formSchema: schema,
          formData: data,
        });
        return processed;
      });
      routes.push(...processedRoutes);
    }

    setPreloadRoutes(routes);
  }, [data, schema, action.selectedFields, action.selectedSections, action.preloadRoutes]);

  // Build user prompt from selected fields/sections
  useEffect(() => {
    if (!data || !schema) {
      setUserPrompt('');
      return;
    }

    const promptParts: string[] = [];

    // Add context about what we're working on
    promptParts.push(`Working on ${schema.singular_name || schema.name} data:`);

    // Extract data based on selected fields
    if (action.selectedFields && action.selectedFields.length > 0) {
      const selectedData: Record<string, any> = {};
      action.selectedFields.forEach((fieldId) => {
        const field = schema.fields?.find(f => f.id === fieldId);
        if (field && field.name) {
          if (data[field.name] !== undefined) {
            selectedData[field.name] = data[field.name];
          }
        } else {
          if (data[fieldId] !== undefined) {
            selectedData[fieldId] = data[fieldId];
          }
        }
      });

      if (Object.keys(selectedData).length > 0) {
        promptParts.push(`\nSelected fields data:\n\`\`\`json\n${JSON.stringify(selectedData, null, 2)}\n\`\`\``);
      }
    }

    // Extract data based on selected sections
    if (action.selectedSections && action.selectedSections.length > 0) {
      action.selectedSections.forEach((sectionId) => {
        const section = schema.sections?.find(s => s.id === sectionId);
        if (section) {
          const sectionFields = schema.fields?.filter(f => f.sectionId === sectionId) || [];
          const sectionData: Record<string, any> = {};

          sectionFields.forEach((field) => {
            if (field.name && data[field.name] !== undefined) {
              sectionData[field.name] = data[field.name];
            }
          });

          if (Object.keys(sectionData).length > 0) {
            promptParts.push(`\n${section.title || sectionId} section data:\n\`\`\`json\n${JSON.stringify(sectionData, null, 2)}\n\`\`\``);
          }
        }
      });
    }

    // If no specific fields/sections selected, include all data
    if ((!action.selectedFields || action.selectedFields.length === 0) &&
        (!action.selectedSections || action.selectedSections.length === 0)) {
      promptParts.push(`\nFull item data:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
    }

    // Concatenate additionalSystemPrompt if provided
    if (action.additionalSystemPrompt) {
      promptParts.push(`\n\n${action.additionalSystemPrompt}`);
    }

    setUserPrompt(promptParts.join('\n'));
  }, [data, schema, action.selectedFields, action.selectedSections, action.additionalSystemPrompt]);

  // Load preload routes when agent is ready
  useEffect(() => {
    if (agent) {
      if (preloadRoutes.length > 0) {
        // Merge custom preload routes with agent's preload routes
        const mergedAgent = {
          ...agent,
          preloadRoutes: [
            ...(agent.preloadRoutes || []),
            ...preloadRoutes,
          ],
        };
        loadPreloadRoutes(mergedAgent);
      } else {
        // Load agent's default preload routes if no custom routes
        loadPreloadRoutes(agent);
      }
    }
  }, [agent, preloadRoutes, loadPreloadRoutes]);

  // Execute agent function
  const executeAgent = useCallback(() => {
    if (!agent || !action.agentId || !userPrompt.trim()) return;

    generateResponse({
      userPrompt,
      agentId: action.agentId,
      body: processedBody,
      extra_body: processedExtraBody,
    });
    setHasExecuted(true);
  }, [agent, action.agentId, userPrompt, processedBody, processedExtraBody, generateResponse]);

  // Auto-execute when runType is 'automatic' after delay
  useEffect(() => {
    if (!agent || isLoadingAgent) return;
    
    const runType = action.runType || 'manual';
    
    // If there's already a response, mark as executed and don't re-execute
    if (aiResponse && aiResponse.trim().length > 0) {
      setHasExecuted(true);
      return;
    }
    
    // Don't execute if already executed or if manual mode
    if (hasExecuted || runType !== 'automatic' || !userPrompt.trim()) return;
    
    // Clear any existing timeout
    if (autoExecuteTimeoutRef.current) {
      clearTimeout(autoExecuteTimeoutRef.current);
    }
    
    // Set timeout for ~500ms delay
    autoExecuteTimeoutRef.current = setTimeout(() => {
      executeAgent();
    }, 500);

    return () => {
      if (autoExecuteTimeoutRef.current) {
        clearTimeout(autoExecuteTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, isLoadingAgent, hasExecuted, action.runType, aiResponse, executeAgent]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setHasExecuted(false);
    executeAgent();
  }, [executeAgent]);

  // Show loading state while agent is loading
  if (isLoadingAgent) {
    return (
      <motion.div
        initial={disableAnimation ? false : { opacity: 0, y: 20 }}
        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
        transition={disableAnimation ? {} : {
          duration: 0.3,
          delay: index * 0.1
        }}
        className={cn(className)}
      >
        <CardWrapper
          config={{
            id: action.id,
            name: action.label,
            styling: {
              variant: 'default',
              size: 'md'
            }
          }}
          className="h-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <CardHeader className="relative bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-xl py-3 px-4">
            {/* Dotted background pattern */}
            <div className="absolute inset-0 opacity-10 dark:opacity-15 rounded-t-xl">
              <div
                className="absolute inset-0 rounded-t-xl"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                  backgroundSize: '24px 24px',
                }}
              />
            </div>
            <div className="relative flex flex-col gap-1">
              <CardTitle className="text-sm font-semibold text-white">{action.label}</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Sparkles className="h-3 w-3" />
                <span>Powered by Gradian AI</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </CardWrapper>
      </motion.div>
    );
  }

  if (!agent) {
    return null;
  }

  const runType = action.runType || 'manual';
  const hasResponse = aiResponse && aiResponse.trim().length > 0;
  const showManualButton = runType === 'manual' && !hasResponse && !isLoading;
  const showSkeleton = isLoading || (runType === 'automatic' && !hasExecuted && !hasResponse);

  return (
    <motion.div
      initial={disableAnimation ? false : { opacity: 0, y: 20 }}
      animate={disableAnimation ? false : { opacity: 1, y: 0 }}
      transition={disableAnimation ? {} : {
        duration: 0.3,
        delay: index * 0.1
      }}
      className={cn(className)}
    >
      <CardWrapper
        config={{
          id: action.id,
          name: action.label,
          styling: {
            variant: 'default',
            size: 'md'
          }
        }}
        className="h-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <CardHeader className="relative bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-xl py-3 px-4">
          {/* Dotted background pattern */}
          <div className="absolute inset-0 opacity-10 dark:opacity-15 rounded-t-xl">
            <div
              className="absolute inset-0 rounded-t-xl"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />
          </div>
          <div className="relative flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                {action.icon && (
                  <IconRenderer iconName={action.icon} className="h-4 w-4 text-white" />
                )}
                <CardTitle className="text-sm font-semibold text-white">{action.label}</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Sparkles className="h-3 w-3" />
                <span>Powered by Gradian AI</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
              title="Refresh"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent 
          className="p-6"
          style={
            action.maxHeight && action.maxHeight > 0
              ? { maxHeight: `${action.maxHeight}px`, overflowY: 'auto' }
              : undefined
          }
        >
          {showSkeleton ? (
            <div className="w-full">
              {(agent?.requiredOutputFormat as string | undefined) === 'image' ? (
                // Image skeleton
                <div className="flex justify-center items-center w-full">
                  <div className="w-full max-w-4xl">
                    <Skeleton className="w-full h-64 md:h-96 rounded-lg" />
                  </div>
                </div>
              ) : agent?.requiredOutputFormat === 'table' ? (
                // Table skeleton
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                  <div className="space-y-2">
                    {/* Table header */}
                    <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={`header-${i}`} className="h-4 w-24 flex-1" />
                      ))}
                    </div>
                    {/* Table rows */}
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`table-row-${index}`}
                        className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800"
                      >
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={`cell-${index}-${i}`} className="h-4 w-full flex-1" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : agent?.requiredOutputFormat === 'string' ? (
                // Markdown/Text skeleton
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="space-y-3 pt-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="space-y-3 pt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                </div>
              ) : (
                // Code/JSON skeleton
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton 
                        key={`code-line-${i}`} 
                        className={`h-4 ${i % 2 === 0 ? 'w-full' : i % 3 === 0 ? 'w-5/6' : 'w-4/6'}`} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : showManualButton ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Button
                onClick={executeAgent}
                size="default"
                variant="default"
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
              >
                <Sparkles className="h-4 w-4 me-2" />
                Do the Magic
              </Button>
            </div>
          ) : hasResponse ? (
            <div className="w-full">
              {shouldRenderImage ? (
                imageData ? (
                  <div className="flex justify-center items-center w-full">
                    <div className="w-full max-w-4xl">
                      <ImageViewer
                        sourceUrl={imageData.url || undefined}
                        content={imageData.b64_json || undefined}
                        alt="AI Generated Image"
                        objectFit="contain"
                        className="w-full h-auto rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <CodeViewer
                    code={aiResponse}
                    programmingLanguage="json"
                    title="AI Generated Content"
                    initialLineNumbers={10}
                  />
                )
              ) : shouldRenderTable && isValidTable && tableData.length > 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                  <TableWrapper
                    tableConfig={tableConfig}
                    columns={tableColumns}
                    data={tableData}
                    showCards={false}
                    disableAnimation={false}
                  />
                </div>
              ) : agent?.requiredOutputFormat === 'string' ? (
                <MarkdownViewer 
                  content={aiResponse}
                  showToggle={false}
                  isEditable={false}
                />
              ) : (
                <CodeViewer
                  code={aiResponse}
                  programmingLanguage={agent?.requiredOutputFormat === 'json' ? 'json' : 'text'}
                  title="AI Generated Content"
                  initialLineNumbers={10}
                />
              )}
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 dark:text-red-400">
              Error: {error}
            </div>
          ) : null}
        </CardContent>
      </CardWrapper>
    </motion.div>
  );
};

DynamicAiAgentResponseContainer.displayName = 'DynamicAiAgentResponseContainer';

