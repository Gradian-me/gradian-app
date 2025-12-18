/**
 * AI Builder Response Component
 * Displays the AI response with actions
 */

'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Loader2, Sparkles, Timer, Download, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/gradian-ui/analytics';
import { ResponseCardViewer } from './ResponseCardViewer';
import { ResponseAnnotationViewer } from './ResponseAnnotationViewer';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { ImageViewer } from '@/gradian-ui/form-builder/form-elements/components/ImageViewer';
import { VideoViewer } from '@/gradian-ui/form-builder/form-elements/components/VideoViewer';
import { cn } from '@/gradian-ui/shared/utils';
import { useAiResponseStore } from '@/stores/ai-response.store';
import type { TableColumn, TableConfig } from '@/gradian-ui/data-display/table/types';
import type { AiAgent, TokenUsage, VideoUsage, SchemaAnnotation, AnnotationItem } from '../types';
import { cleanMarkdownResponse } from '../utils/ai-security-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LOG_CONFIG, LogType } from '@/gradian-ui/shared/configs/log-config';

interface AiBuilderResponseProps {
  response: string;
  agent: AiAgent | null;
  tokenUsage: TokenUsage | null;
  videoUsage?: VideoUsage | null;
  duration: number | null;
  isApproving: boolean;
  isLoading?: boolean;
  onApprove: (content?: string) => void;
  onCardClick?: (cardData: { id: string; label: string; icon?: string }, schemaData: any) => void;
  annotations?: SchemaAnnotation[];
  onAnnotationsChange?: (schemaId: string, annotations: AnnotationItem[]) => void;
  onRemoveSchema?: (schemaId: string) => void;
  onApplyAnnotations?: (annotations: SchemaAnnotation[]) => void;
  selectedLanguage?: string;
  imageResponse?: string | null;
  imageError?: string | null;
  imageType?: string; // The type of image that was generated (e.g., "infographic", "sketch", "creative")
  imageModel?: string; // The model used for image generation (e.g., "gemini-2.5-flash-image")
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
  videoUsage,
  duration,
  isApproving,
  isLoading = false,
  onApprove,
  onCardClick,
  annotations = [],
  onAnnotationsChange,
  onRemoveSchema,
  onApplyAnnotations,
  selectedLanguage = 'text',
  imageResponse,
  imageError,
  imageType,
  imageModel,
}: AiBuilderResponseProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevIsLoadingRef = useRef<boolean>(isLoading);
  const lastResponseRef = useRef<string>('');
  const showModelBadge = LOG_CONFIG[LogType.AI_MODEL_LOG] === true;
  
  // Get agent format
  const agentFormat = useMemo(() => {
    if (!agent?.requiredOutputFormat) return 'string';
    return agent.requiredOutputFormat as 'string' | 'json' | 'table' | 'image';
  }, [agent?.requiredOutputFormat]);
  
  // Use 'json' format for storage if agent format is 'image' (store may not support 'image' yet)
  const storageFormat = useMemo(() => {
    return agentFormat === 'image' ? 'json' : agentFormat;
  }, [agentFormat]);
  
  // Reactively get latest response from store using selector
  const latestResponse = useAiResponseStore((state) => {
    if (!agent?.id) return null;
    const latestKey = `ai-response-${agent.id}-${storageFormat}-latest`;
    const latestDatetime = state.latestResponses[latestKey];
    if (!latestDatetime) return null;
    const storageKey = `ai-response-${agent.id}-${storageFormat}-${latestDatetime}`;
    return state.responses[storageKey] || null;
  });
  
  // Use stored content if available, otherwise use response
  // For image-generator agent, always use the current response (don't use stored content)
  const displayContent = useMemo(() => {
    // Skip using stored content for image-generator agent to avoid showing stale cached responses
    if (agent?.id === 'image-generator' || agentFormat === 'image') {
      return (response && response.trim()) || '';
    }
    
    if (latestResponse?.content && latestResponse.content.trim()) {
      return latestResponse.content;
    }
    return (response && response.trim()) || '';
  }, [latestResponse, response, agent?.id, agentFormat]);
  
  // Get store actions
  const saveResponse = useAiResponseStore((state) => state.saveResponse);
  const updateResponse = useAiResponseStore((state) => state.updateResponse);
  
  // Handle content changes from MarkdownEditor - update store directly with debouncing
  const handleContentChangeRef = useRef<NodeJS.Timeout | null>(null);
  const handleContentChange = useCallback(async (newContent: string) => {
    if (!agent?.id || !latestResponse) return;
    
    // Clear previous timeout
    if (handleContentChangeRef.current) {
      clearTimeout(handleContentChangeRef.current);
    }
    
    // Debounce store updates to avoid too many writes
    handleContentChangeRef.current = setTimeout(async () => {
      const storageKey = `ai-response-${agent.id}-${storageFormat}-${latestResponse.id}`;
      await updateResponse(storageKey, newContent);
    }, 500);
  }, [agent, storageFormat, latestResponse, updateResponse]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (handleContentChangeRef.current) {
        clearTimeout(handleContentChangeRef.current);
      }
    };
  }, []);
  
  // Save response to store when AI generates a response
  // Skip saving for image-generator agent responses as they're too large (base64 images)
  useEffect(() => {
    if (!agent?.id || !response || !response.trim() || isLoading) {
      return;
    }

    // Skip storing image responses (they're too large and cause quota issues)
    if (agent.id === 'image-generator' || agentFormat === 'image') {
      return;
    }

    // Don't save if it's the same as the last response we saved
    if (lastResponseRef.current === response) {
      return;
    }

    const saveAsync = async () => {
      const timestamp = await saveResponse(agent.id, storageFormat, response, tokenUsage || undefined, duration || undefined);
      if (timestamp) {
        lastResponseRef.current = response;
      }
    };

    saveAsync();
  }, [response, agent?.id, agentFormat, tokenUsage, duration, isLoading, saveResponse]);

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

  // Helper function to format image type label
  const getImageTypeLabel = (type?: string): string => {
    if (!type || type === 'none' || type === 'standard') return '';
    const labels: Record<string, string> = {
      'infographic': 'Infographic',
      '3d-model': '3D Model',
      'creative': 'Creative',
      'sketch': 'Sketch',
      'comic-book': 'Comic Book',
      'iconic': 'Iconic',
      'editorial': 'Editorial',
      'random': 'Random',
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Parse image data from imageResponse prop (parallel image generation)
  const parallelImageData = useMemo(() => {
    if (!imageResponse) {
      return null;
    }
    
    try {
      const parsed = JSON.parse(imageResponse);
      
      // The response structure is: { image: { url, b64_json, revised_prompt }, format, ... }
      if (parsed && typeof parsed === 'object' && parsed.image) {
        const img = parsed.image;
        if (img && (img.url || img.b64_json)) {
          return img;
        }
      }
      return null;
    } catch (e) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to parse parallel image data: ${e instanceof Error ? e.message : String(e)}, Content: ${imageResponse?.substring(0, 200)}`);
      return null;
    }
  }, [imageResponse]);

  // Parse image data if format is image
  // Also detect image format from response content as fallback
  const imageData = useMemo(() => {
    if (!displayContent) {
      return null;
    }
    
    // Check if agent requires image format
    const agentFormatValue = agent?.requiredOutputFormat as string | undefined;
    const isImageFormat = agentFormatValue === 'image';
    
    // Only try to parse as JSON if:
    // 1. Agent format is image, OR
    // 2. Content looks like JSON (starts with '{' or '[')
    const trimmedContent = displayContent.trim();
    const looksLikeJson = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');
    
    if (!isImageFormat && !looksLikeJson) {
      // Content is clearly not JSON (likely markdown or text), skip parsing
      return null;
    }
    
    try {
      const parsed = JSON.parse(displayContent);
      
      // Check if response has image structure (fallback detection)
      const hasImageStructure = parsed && typeof parsed === 'object' && parsed.image && 
        (parsed.image.url || parsed.image.b64_json);
      
      // Only proceed if agent format is image OR if we detect image structure
      if (!isImageFormat && !hasImageStructure) {
        return null;
      }
      
      // The response structure is: { image: { url, b64_json, revised_prompt }, format, ... }
      // Check if we have an image object with either url or b64_json
      if (parsed && typeof parsed === 'object' && parsed.image) {
        const img = parsed.image;
        // Return image data even if url is null, as long as b64_json exists
        if (img && (img.url || img.b64_json)) {
          return img;
        }
      }
      return null;
    } catch (e) {
      // If parsing fails and it's not an image format agent, silently return null
      // Only log warning if it's an image format agent (unexpected error)
      if (isImageFormat) {
        console.warn('Failed to parse image data:', e, 'Content:', displayContent?.substring(0, 200));
      }
      return null;
    }
  }, [agent?.requiredOutputFormat, displayContent]);
  
  // Parse video data if format is video
  // Also detect video format from response content as fallback
  const videoData = useMemo(() => {
    if (!displayContent) {
      return null;
    }
    
    // Check if agent requires video format
    const agentFormatValue = agent?.requiredOutputFormat as string | undefined;
    const isVideoFormat = agentFormatValue === 'video';
    
    // Only try to parse as JSON if:
    // 1. Agent format is video, OR
    // 2. Content looks like JSON (starts with '{' or '[')
    const trimmedContent = displayContent.trim();
    const looksLikeJson = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');
    
    if (!isVideoFormat && !looksLikeJson) {
      // Content is clearly not JSON (likely markdown or text), skip parsing
      return null;
    }
    
    try {
      const parsed = JSON.parse(displayContent);
      
      // Check if response has video structure (fallback detection)
      const hasVideoStructure = parsed && typeof parsed === 'object' && parsed.video && 
        (parsed.video.video_id || parsed.video.url || parsed.video.file_path);
      
      // Only proceed if agent format is video OR if we detect video structure
      if (!isVideoFormat && !hasVideoStructure) {
        return null;
      }
      
      // The response structure is: { video: { video_id, url, file_path, ... }, ... }
      // Check if we have a video object with video_id, url, or file_path
      if (parsed && typeof parsed === 'object' && parsed.video) {
        const vid = parsed.video;
        // Return video data if we have video_id, url, or file_path
        if (vid && (vid.video_id || vid.url || vid.file_path)) {
          return vid;
        }
      }
      return null;
    } catch (e) {
      // If parsing fails and it's not a video format agent, silently return null
      // Only log warning if it's a video format agent (unexpected error)
      if (isVideoFormat) {
        console.warn('Failed to parse video data:', e, 'Content:', displayContent?.substring(0, 200));
      }
      return null;
    }
  }, [agent?.requiredOutputFormat, displayContent]);
  
  // Determine if we should render as image (agent format OR detected from content)
  const shouldRenderImage = useMemo(() => {
    const agentFormatValue = agent?.requiredOutputFormat as string | undefined;
    return agentFormatValue === 'image' || !!imageData;
  }, [agent?.requiredOutputFormat, imageData]);

  // Determine if we should render as video (agent format OR detected from content)
  const shouldRenderVideo = useMemo(() => {
    const agentFormatValue = agent?.requiredOutputFormat as string | undefined;
    return agentFormatValue === 'video' || !!videoData;
  }, [agent?.requiredOutputFormat, videoData]);

  // Check if we should render as table
  const shouldRenderTable = agent?.requiredOutputFormat === 'table';
  const { data: tableData, isValid: isValidTable } = useMemo(() => {
    if (!displayContent || !shouldRenderTable) {
      return { data: [], isValid: false };
    }
    return parseTableData(displayContent);
  }, [displayContent, shouldRenderTable]);

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
        pageSize: 25,
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

  // Don't render if we have no content to display
  if (!displayContent || !displayContent.trim()) {
    // Still render parallel image and metrics if available
    if (parallelImageData || (tokenUsage || videoUsage || duration !== null)) {
      return (
        <div className="space-y-4">
          {/* Token Usage & Pricing - MetricCard */}
          {(tokenUsage || videoUsage || duration !== null) && (
            <MetricCard
              gradient="indigo"
              metrics={[
                ...(tokenUsage ? [
                  {
                    id: 'total-tokens',
                    label: 'Total Tokens',
                    value: tokenUsage.total_tokens,
                    unit: 'tokens',
                    icon: 'Hash',
                    iconColor: 'cyan' as const,
                    format: 'number' as const,
                  },
                  {
                    id: 'total-cost',
                    label: 'Total Cost',
                    value: tokenUsage.pricing?.total_cost || 0,
                    prefix: '$',
                    icon: 'Coins',
                    iconColor: 'pink' as const,
                    format: 'currency' as const,
                    precision: 4,
                  },
                ] : []),
                ...(videoUsage ? [
                  {
                    id: 'video-duration',
                    label: 'Video Duration',
                    value: videoUsage.duration_seconds,
                    unit: 's',
                    icon: 'Video',
                    iconColor: 'violet' as const,
                    format: 'number' as const,
                    precision: 2,
                  },
                  ...(videoUsage.estimated_cost ? [
                    {
                      id: 'video-cost',
                      label: 'Video Cost',
                      value: parseFloat(videoUsage.estimated_cost.unit || '0'),
                      prefix: '$',
                      icon: 'Coins',
                      iconColor: 'pink' as const,
                      format: 'currency' as const,
                      precision: 4,
                    },
                    {
                      id: 'video-cost-irt',
                      label: 'Cost (IRT)',
                      value: videoUsage.estimated_cost.irt,
                      unit: 'IRT',
                      icon: 'Banknote',
                      iconColor: 'amber' as const,
                      format: 'currency' as const,
                      precision: 0,
                    },
                  ] : []),
                ] : []),
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

          {/* Parallel Image */}
          {parallelImageData && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Generated Image
                  </h3>
                  {imageType && getImageTypeLabel(imageType) && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                    >
                      {getImageTypeLabel(imageType)}
                    </Badge>
                  )}
                  {(imageModel || agent?.model) && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                    >
                      {imageModel || agent?.model}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Save Image Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        let blob: Blob;
                        const timestamp = Date.now();
                        const filename = `Gradian_Image_${timestamp}.png`;
                        
                        if (parallelImageData.b64_json) {
                          const base64String = parallelImageData.b64_json.startsWith('data:image/')
                            ? parallelImageData.b64_json.split(',')[1] || parallelImageData.b64_json
                            : parallelImageData.b64_json;
                          
                          const byteCharacters = atob(base64String);
                          const byteNumbers = new Array(byteCharacters.length);
                          for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                          }
                          const byteArray = new Uint8Array(byteNumbers);
                          blob = new Blob([byteArray], { type: 'image/png' });
                        } else if (parallelImageData.url) {
                          const response = await fetch(parallelImageData.url);
                          blob = await response.blob();
                        } else {
                          return;
                        }
                        
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        loggingCustom(LogType.CLIENT_LOG, 'error', `Error saving image: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    }}
                    className="h-8"
                  >
                    <Download className="h-4 w-4 me-1.5" />
                    Save
                  </Button>
                  
                  {/* Open in New Tab Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        let imageUrl: string;
                        
                        if (parallelImageData.url) {
                          imageUrl = parallelImageData.url;
                        } else if (parallelImageData.b64_json) {
                          if (parallelImageData.b64_json.startsWith('data:image/')) {
                            imageUrl = parallelImageData.b64_json;
                          } else {
                            imageUrl = `data:image/jpeg;base64,${parallelImageData.b64_json}`;
                          }
                        } else {
                          return;
                        }
                        
                        window.open(imageUrl, '_blank', 'noopener,noreferrer');
                      } catch (error) {
                        loggingCustom(LogType.CLIENT_LOG, 'error', `Error opening image: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    }}
                    className="h-8"
                  >
                    <ExternalLink className="h-4 w-4 me-1.5" />
                    Open
                  </Button>
                  
                  {parallelImageData.url && <CopyContent content={parallelImageData.url} />}
                </div>
              </div>
              <div className="flex justify-center items-center w-full">
                <div className="w-full max-w-4xl">
                  <ImageViewer
                    sourceUrl={parallelImageData.url || undefined}
                    content={parallelImageData.b64_json || undefined}
                    alt="AI Generated Image"
                    objectFit="contain"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
              {parallelImageData.revised_prompt && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Revised Prompt:
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {parallelImageData.revised_prompt}
                  </p>
                </div>
              )}
              {imageError && (
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">{imageError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
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
            onClick={() => {
              // Use displayContent from store (which includes any edits)
              const contentToApprove = displayContent !== response ? displayContent : undefined;
              onApprove(contentToApprove);
            }}
            disabled={isApproving}
            variant="default"
            size="default"
            className="h-10 shadow-sm bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
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
      {(tokenUsage || videoUsage || duration !== null) && (
        <MetricCard
          gradient="indigo"
          metrics={[
            ...(tokenUsage ? [
              {
                id: 'total-tokens',
                label: 'Total Tokens',
                value: tokenUsage.total_tokens,
                unit: 'tokens',
                icon: 'Hash',
                iconColor: 'cyan' as const,
                format: 'number' as const,
              },
              {
                id: 'total-cost',
                label: 'Total Cost',
                value: tokenUsage.pricing?.total_cost || 0,
                prefix: '$',
                icon: 'Coins',
                iconColor: 'pink' as const,
                format: 'currency' as const,
                precision: 4,
              },
            ] : []),
            ...(videoUsage ? [
              {
                id: 'video-duration',
                label: 'Video Duration',
                value: videoUsage.duration_seconds,
                unit: 's',
                icon: 'Video',
                iconColor: 'violet' as const,
                format: 'number' as const,
                precision: 2,
              },
              ...(videoUsage.estimated_cost ? [
                {
                  id: 'video-cost',
                  label: 'Video Cost',
                  value: parseFloat(videoUsage.estimated_cost.unit || '0'),
                  prefix: '$',
                  icon: 'Coins',
                  iconColor: 'pink' as const,
                  format: 'currency' as const,
                  precision: 4,
                },
                {
                  id: 'video-cost-irt',
                  label: 'Cost (IRT)',
                  value: videoUsage.estimated_cost.irt,
                  unit: 'IRT',
                  icon: 'Banknote',
                  iconColor: 'amber' as const,
                  format: 'currency' as const,
                  precision: 0,
                },
              ] : []),
            ] : []),
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

      {/* Parallel Image - shown after MetricCard, before main response */}
      {parallelImageData && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Generated Image
              </h3>
              {imageType && getImageTypeLabel(imageType) && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                >
                  {getImageTypeLabel(imageType)}
                </Badge>
              )}
              {(imageModel || agent?.model) && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                >
                  {imageModel || agent?.model}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Save Image Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    let blob: Blob;
                    const timestamp = Date.now();
                    const filename = `Gradian_Image_${timestamp}.png`;
                    
                    if (parallelImageData.b64_json) {
                      const base64String = parallelImageData.b64_json.startsWith('data:image/')
                        ? parallelImageData.b64_json.split(',')[1] || parallelImageData.b64_json
                        : parallelImageData.b64_json;
                      
                      const byteCharacters = atob(base64String);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                      }
                      const byteArray = new Uint8Array(byteNumbers);
                      blob = new Blob([byteArray], { type: 'image/png' });
                    } else if (parallelImageData.url) {
                      const response = await fetch(parallelImageData.url);
                      blob = await response.blob();
                    } else {
                      return;
                    }
                    
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    loggingCustom(LogType.CLIENT_LOG, 'error', `Error saving image: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
                className="h-8"
              >
                <Download className="h-4 w-4 me-1.5" />
                Save
              </Button>
              
              {/* Open in New Tab Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    let imageUrl: string;
                    
                    if (parallelImageData.url) {
                      imageUrl = parallelImageData.url;
                    } else if (parallelImageData.b64_json) {
                      if (parallelImageData.b64_json.startsWith('data:image/')) {
                        imageUrl = parallelImageData.b64_json;
                      } else {
                        imageUrl = `data:image/jpeg;base64,${parallelImageData.b64_json}`;
                      }
                    } else {
                      return;
                    }
                    
                    window.open(imageUrl, '_blank', 'noopener,noreferrer');
                  } catch (error) {
                    loggingCustom(LogType.CLIENT_LOG, 'error', `Error opening image: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
                className="h-8"
              >
                <ExternalLink className="h-4 w-4 me-1.5" />
                Open
              </Button>
              
              {parallelImageData.url && <CopyContent content={parallelImageData.url} />}
            </div>
          </div>
          <div className="flex justify-center items-center w-full">
            <div className="w-full max-w-4xl">
              <ImageViewer
                sourceUrl={parallelImageData.url || undefined}
                content={parallelImageData.b64_json || undefined}
                alt="AI Generated Image"
                objectFit="contain"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </div>
          {parallelImageData.revised_prompt && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Revised Prompt:
              </p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {parallelImageData.revised_prompt}
              </p>
            </div>
          )}
          {imageError && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">{imageError}</p>
            </div>
          )}
        </div>
      )}

      {agent?.responseCards && agent.responseCards.length > 0 && onCardClick && (
        <ResponseCardViewer
          response={displayContent}
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

      {shouldRenderImage ? (
        imageData ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Generated Image
                  </h3>
                  {imageType && getImageTypeLabel(imageType) && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                    >
                      {getImageTypeLabel(imageType)}
                    </Badge>
                  )}
                  {(imageModel || agent?.model) && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                    >
                      {imageModel || agent?.model}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Save Image Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        let blob: Blob;
                        // Generate filename with timestamp: Gradian_Image_{time}.png
                        const timestamp = Date.now();
                        const filename = `Gradian_Image_${timestamp}.png`;
                        
                        if (imageData.b64_json) {
                          // Handle base64 image
                          // Extract base64 string (remove data URL prefix if present)
                          const base64String = imageData.b64_json.startsWith('data:image/')
                            ? imageData.b64_json.split(',')[1] || imageData.b64_json
                            : imageData.b64_json;
                          
                          // Convert base64 to blob
                          const byteCharacters = atob(base64String);
                          const byteNumbers = new Array(byteCharacters.length);
                          for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                          }
                          const byteArray = new Uint8Array(byteNumbers);
                          blob = new Blob([byteArray], { type: 'image/png' });
                        } else if (imageData.url) {
                          // Handle URL image - fetch and convert to blob
                          const response = await fetch(imageData.url);
                          blob = await response.blob();
                        } else {
                          return;
                        }
                        
                        // Download the image
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        loggingCustom(LogType.CLIENT_LOG, 'error', `Error saving image: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    }}
                    className="h-8"
                  >
                    <Download className="h-4 w-4 me-1.5" />
                    Save
                  </Button>
                  
                  {/* Open in New Tab Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        let imageUrl: string;
                        
                        if (imageData.url) {
                          imageUrl = imageData.url;
                        } else if (imageData.b64_json) {
                          // Convert base64 to data URL format: data:image/jpeg;base64,...
                          if (imageData.b64_json.startsWith('data:image/')) {
                            // Already has data URL prefix
                            imageUrl = imageData.b64_json;
                          } else {
                            // Add data URL prefix - use jpeg format as it works reliably
                            imageUrl = `data:image/jpeg;base64,${imageData.b64_json}`;
                          }
                        } else {
                          return;
                        }
                        
                        // Open in new tab with data URL
                        window.open(imageUrl, '_blank', 'noopener,noreferrer');
                      } catch (error) {
                        loggingCustom(LogType.CLIENT_LOG, 'error', `Error opening image: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    }}
                    className="h-8"
                  >
                    <ExternalLink className="h-4 w-4 me-1.5" />
                    Open
                  </Button>
                  
                  {imageData.url && <CopyContent content={imageData.url} />}
                </div>
              </div>
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
              {imageData.revised_prompt && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Revised Prompt:
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {imageData.revised_prompt}
                  </p>
                </div>
              )}
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                View Raw Response Data
              </summary>
              <div className="mt-2">
                <CodeViewer
                  code={displayContent}
                  programmingLanguage="json"
                  title="Raw Response Data"
                  initialLineNumbers={10}
                />
              </div>
            </details>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Generated Image (Parsing Error)
                </h3>
                {imageType && getImageTypeLabel(imageType) && (
                  <Badge
                    variant="outline"
                    className="text-xs font-medium bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                  >
                    {getImageTypeLabel(imageType)}
                  </Badge>
                )}
                {agent?.model && (
                  <Badge
                    variant="outline"
                    className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                  >
                    {imageModel || agent?.model}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Unable to parse image data from response. Showing raw response:
            </p>
            <CodeViewer
              code={displayContent}
              programmingLanguage="json"
              title="Raw Response Data"
              initialLineNumbers={10}
            />
          </div>
        )
      ) : shouldRenderVideo ? (
        videoData ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Generated Video
                  </h3>
                  {agent?.model && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                    >
                      {videoData.model || agent?.model}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-center items-center w-full">
                <div className="w-full max-w-4xl">
                  <VideoViewer
                    videoId={videoData.video_id || undefined}
                    sourceUrl={videoData.url || undefined}
                    content={videoData.file_path || undefined}
                    value={videoData}
                    alt="AI Generated Video"
                    className="w-full h-auto rounded-lg"
                    controls={true}
                    autoplay={false}
                  />
                </div>
              </div>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                View Raw Response Data
              </summary>
              <div className="mt-2">
                <CodeViewer
                  code={displayContent}
                  programmingLanguage="json"
                  title="Raw Response Data"
                  initialLineNumbers={10}
                />
              </div>
            </details>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Generated Video (Parsing Error)
                </h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Unable to parse video data from response. Showing raw response:
            </p>
            <CodeViewer
              code={displayContent}
              programmingLanguage="json"
              title="Raw Response Data"
              initialLineNumbers={10}
            />
          </div>
        )
      ) : shouldRenderTable && isValidTable && tableData.length > 0 ? (
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
                code={displayContent}
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
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 me-1" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                AI Generated Content
              </h3>
              {showModelBadge && agent?.model && (
                <Badge
                  variant="outline"
                  className="ml-1 text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                >
                  {agent.model}
                </Badge>
              )}
            </div>
            <CopyContent content={displayContent} />
          </div>
          <div className="w-full">
            <div className="p-4">
              <MarkdownViewer 
                content={cleanMarkdownResponse(displayContent)}
                showToggle={true}
                isEditable={true}
                onChange={handleContentChange}
              />
            </div>
          </div>
        </div>
      ) : (
        <CodeViewer
          code={displayContent}
          programmingLanguage={agent?.requiredOutputFormat === 'json' ? 'json' : 'text'}
          title={
            showModelBadge && agent?.model
              ? `AI Generated Content · ${agent.model}`
              : 'AI Generated Content'
          }
          initialLineNumbers={10}
        />
      )}
    </div>
  );
}

