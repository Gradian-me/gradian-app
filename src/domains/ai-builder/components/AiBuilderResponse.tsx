/**
 * AI Builder Response Component
 * Displays the AI response with actions
 */

'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Loader2, Sparkles, Timer, Download, ExternalLink, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/gradian-ui/analytics';
import { ResponseCardViewer } from './ResponseCardViewer';
import { ResponseAnnotationViewer } from './ResponseAnnotationViewer';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { ImageViewer } from '@/gradian-ui/form-builder/form-elements/components/ImageViewer';
import { VideoViewer } from '@/gradian-ui/form-builder/form-elements/components/VideoViewer';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import { AISearchResults } from './AISearchResults';
import { cn } from '@/gradian-ui/shared/utils';
import { useAiResponseStore } from '@/stores/ai-response.store';
import type { TableColumn, TableConfig } from '@/gradian-ui/data-display/table/types';
import type { AiAgent, TokenUsage, VideoUsage, SchemaAnnotation, AnnotationItem } from '../types';
import { cleanMarkdownResponse } from '../utils/ai-security-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LOG_CONFIG, LogType } from '@/gradian-ui/shared/configs/log-config';
import { truncateText } from '@/gradian-ui/shared/utils/text-utils';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';
import { detectMessageRenderType } from '@/domains/chat/utils/message-render-utils';
import type { ChatMessage } from '@/domains/chat/types';
import { extractJson } from '@/gradian-ui/shared/utils/json-extractor';

interface AiBuilderResponseProps {
  response: string;
  agent: AiAgent | null;
  tokenUsage: TokenUsage | null;
  videoUsage?: VideoUsage | null;
  duration: number | null;
  isApproving: boolean;
  isLoading?: boolean; // This is isMainLoading from wrapper
  isImageLoading?: boolean; // Tracks image loading state
  isSearchLoading?: boolean; // Tracks search loading state
  isMainLoading?: boolean; // Explicit main loading state
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
  graphWarnings?: string[]; // Warnings for graph validation issues
  searchResults?: any[] | null; // Search results for display
  searchError?: string | null; // Search error
  searchDuration?: number | null; // Search duration in milliseconds
  searchUsage?: { cost: number; tool: string } | null; // Search usage (cost and tool)
  summarizedPrompt?: string | null; // Summarized version of the prompt (for search/image)
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

// Skeleton Components for Progressive Loading
function SearchSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MainResponseSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

function ImageSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      
      {/* Image placeholder with gradient and shimmer effect */}
      <div className="relative w-full aspect-square max-w-2xl mx-auto rounded-lg overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 animate-pulse" />
        
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10 animate-shimmer" />
        
        {/* Loading spinner centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="h-10 w-10 text-violet-600 dark:text-violet-400 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-violet-400/30 dark:bg-violet-500/30 rounded-full" />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Generating image...
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 left-4 w-16 h-16 bg-white/20 dark:bg-white/5 rounded-lg blur-sm" />
        <div className="absolute bottom-4 right-4 w-20 h-20 bg-white/20 dark:bg-white/5 rounded-lg blur-sm" />
      </div>
    </div>
  );
}

export function AiBuilderResponse({
  response,
  agent,
  tokenUsage,
  videoUsage,
  duration,
  isApproving,
  isLoading = false, // This is isMainLoading from wrapper
  isImageLoading = false,
  isSearchLoading = false,
  isMainLoading, // Explicit main loading state (optional, falls back to isLoading)
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
  graphWarnings = [],
  searchResults,
  searchError,
  searchDuration,
  searchUsage,
  summarizedPrompt,
}: AiBuilderResponseProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevIsLoadingRef = useRef<boolean>(isLoading);
  const lastResponseRef = useRef<string>('');
  const showModelBadge = LOG_CONFIG[LogType.AI_MODEL_LOG] === true;
  
  // Get agent format
  const agentFormat = useMemo(() => {
    if (!agent?.requiredOutputFormat) return 'string';
    return agent.requiredOutputFormat as 'string' | 'json' | 'table' | 'image' | 'video' | 'graph' | 'search-results' | 'search-card';
  }, [agent?.requiredOutputFormat]);
  
  // Use 'json' format for storage if agent format is 'image', 'graph', 'video', 'search-results', or 'search-card' (store may not support these yet)
  const storageFormat = useMemo(() => {
    if (agentFormat === 'image' || agentFormat === 'graph' || agentFormat === 'video' || agentFormat === 'search-results' || agentFormat === 'search-card') {
      return 'json' as const;
    }
    return agentFormat as 'string' | 'json' | 'table';
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
  
  // Check if response contains an error
  const isErrorResponse = useMemo(() => {
    if (!response || !response.trim()) return false;
    try {
      const parsed = JSON.parse(response);
      return parsed.error || parsed.success === false || parsed._isError === true;
    } catch {
      // Not JSON, check for error keywords
      return response.toLowerCase().includes('"error"') || 
             response.toLowerCase().includes('error:') ||
             response.toLowerCase().includes('failed');
    }
  }, [response]);

  // Use current response if available, otherwise fall back to stored content
  // For image-generator, graph-generator, and video-generator agents, always use the current response (don't use stored content)
  const displayContent = useMemo(() => {
      // Skip using stored content for image/graph/video generators to avoid showing stale cached responses
      if (agent?.id === 'image-generator' || agent?.id === 'graph-generator' || agent?.id === 'video-generator' || 
          agentFormat === 'image' || agentFormat === 'graph' || agentFormat === 'video') {
        return (response && response.trim()) || '';
      }
    
    // Don't use cached content when loading (new generation in progress)
    if (isLoading || isMainLoading) {
      return (response && response.trim()) || '';
    }
    
    // Don't use cached content if there's an error response
    if (isErrorResponse) {
      return response;
    }
    
    // Always prioritize current response over cached content to avoid showing stale responses
    // Only use cached content if there's no current response (e.g., on initial load)
    if (response && response.trim()) {
      return response;
    }
    
    // Fallback to cached content only if no current response, not loading, and no error
    if (latestResponse?.content && latestResponse.content.trim()) {
      return latestResponse.content;
    }
    
    return '';
  }, [latestResponse, response, agent?.id, agentFormat, isLoading, isMainLoading, isErrorResponse]);

  // Create a mock ChatMessage-like object for unified detection
  const mockMessage: ChatMessage = useMemo(() => ({
    id: 'ai-builder-response',
    role: 'assistant',
    content: displayContent || '',
    agentId: agent?.id,
    agentType: agent?.agentType || 'chat',
    metadata: {
      responseFormat: agentFormat === 'search-results' || agentFormat === 'search-card' 
        ? 'search-card' 
        : agentFormat,
      searchResults: searchResults || undefined,
    },
    createdAt: new Date().toISOString(),
  }), [displayContent, agent?.id, agent?.agentType, agentFormat, searchResults]);

  // Use unified detection function
  const renderData = useMemo(() => detectMessageRenderType(mockMessage), [mockMessage]);
  
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
      'blueprint': 'Blueprint',
      'vector-illustration': 'Vector Illustration',
      'architectural': 'Architectural',
      'isometric': 'Isometric',
      'portrait': 'Portrait',
      'fashion': 'Fashion',
      'product-photography': 'Product Photography',
      'landscape': 'Landscape',
      'tilt-shift': 'Tilt-Shift',
      'cinematic': 'Cinematic',
      'polaroid': 'Polaroid',
      'lego-style': 'Lego Style',
      'disney': 'Disney',
      'xray': 'X-Ray',
      'mindmap': 'Mindmap',
      'timeline': 'Timeline',
      'dashboard': 'Dashboard',
      'negative-space': 'Negative Space',
      'abstract': 'Abstract',
      'retro': 'Retro',
      'poster': 'Poster',
      'photocopy': 'Photocopy',
      'newspaper': 'Newspaper',
      'collage': 'Collage',
      'paper-craft': 'Paper Craft',
      'mockup': 'Mockup',
      'persian': 'Persian',
      'hollywood-movie': 'Hollywood Movie',
      'new-york': 'New York',
      'cyberpunk': 'Cyberpunk',
      'retro-miami': 'Retro Miami',
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Helper function to format imageType for use in filenames
  const formatImageTypeForFilename = (type?: string): string => {
    if (!type || type === 'none' || type === 'standard') return '';
    // Convert kebab-case to PascalCase for filename (e.g., "hollywood-movie" -> "HollywoodMovie")
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  // Parse image data from imageResponse prop (parallel image generation)
  const parallelImageData = useMemo(() => {
    if (!imageResponse) {
      return null;
    }
    
    try {
      // imageResponse is a JSON string that needs to be parsed
      const parsed = JSON.parse(imageResponse);
      
      // The response structure from ai-image-utils is: { image: { url, b64_json, revised_prompt }, format, ... }
      // But it might also be the raw API response: { created, data: [{ b64_json, url }] }
      let img: any = null;
      
      // Structure 1: Processed response from ai-image-utils (has image property)
      if (parsed && typeof parsed === 'object' && parsed.image) {
        img = parsed.image;
      }
      // Structure 2: Raw API response (has data array)
      else if (parsed && typeof parsed === 'object' && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
        img = parsed.data[0];
      }
      // Structure 3: Direct image object
      else if (parsed && typeof parsed === 'object' && (parsed.url || parsed.b64_json)) {
        img = parsed;
      }
      
      if (img && (img.url || img.b64_json)) {
        return img;
      }
      
      // Log for debugging
      loggingCustom(LogType.CLIENT_LOG, 'warn', `Parallel image data structure not recognized. Keys: ${Object.keys(parsed || {}).join(', ')}`);
      return null;
    } catch (e) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to parse parallel image data: ${e instanceof Error ? e.message : String(e)}, Content: ${truncateText(imageResponse || '', 200)}`);
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
        console.warn('Failed to parse image data:', e, 'Content:', truncateText(displayContent || '', 200));
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
        console.warn('Failed to parse video data:', e, 'Content:', truncateText(displayContent || '', 200));
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

  // Parse graph data if format is graph
  // Also check for graph errors in the response
  const graphData = useMemo(() => {
    if (!displayContent) return null;
    const agentFormatValue = agent?.requiredOutputFormat as string | undefined;
    const isGraphFormat = agentFormatValue === 'graph' || agent?.id === 'graph-generator';
    
    if (!isGraphFormat) return null;
    
    try {
      // First, try to extract JSON from markdown code blocks if present
      const extractedJson = extractJson(displayContent);
      const jsonString = extractedJson || displayContent;
      
      const parsed = JSON.parse(jsonString);
      
      // Check if this is an error response
      if (parsed && typeof parsed === 'object' && parsed.error && !parsed.success) {
        // Return null to trigger error display, but mark it as a graph error
        return { _isError: true, error: parsed.error };
      }
      
      // Check if response has graph structure
      if (parsed && typeof parsed === 'object') {
        // Handle both direct graph structure and wrapped structure
        const graph = parsed.graph || parsed;
        if (graph && typeof graph === 'object' && 
            Array.isArray(graph.nodes) && Array.isArray(graph.edges)) {
          return graph;
        }
      }
    } catch (e) {
      // Silently fail if not JSON or invalid structure
      if (isGraphFormat) {
        console.warn('Failed to parse graph data:', e);
      }
    }
    return null;
  }, [agent?.requiredOutputFormat, agent?.id, displayContent]);
  
  // Check if graphData is actually an error
  const isGraphError = graphData && typeof graphData === 'object' && (graphData as any)._isError === true;
  const actualGraphData = isGraphError ? null : graphData;
  
  // Parse graph data from renderData if needed
  const parsedGraphData = useMemo(() => {
    if (actualGraphData) return actualGraphData;
    if (!renderData.graphData) return null;
    
    if (typeof renderData.graphData === 'string') {
      try {
        const extractedJson = extractJson(renderData.graphData);
        const jsonString = extractedJson || renderData.graphData;
        const parsed = JSON.parse(jsonString);
        if (parsed && typeof parsed === 'object' && 
            Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          return parsed.graph || parsed;
        }
      } catch (e) {
        console.warn('Failed to parse renderData.graphData:', e);
      }
    } else if (typeof renderData.graphData === 'object' && 
              Array.isArray(renderData.graphData.nodes) && 
              Array.isArray(renderData.graphData.edges)) {
      return renderData.graphData;
    }
    return null;
  }, [actualGraphData, renderData.graphData]);

  // Determine if we should render as graph
  // Show graph section if: agent is graph format OR we have graph data OR we have an error response for graph agent
  const shouldRenderGraph = useMemo(() => {
    const agentFormatValue = agent?.requiredOutputFormat as string | undefined;
    const isGraphAgent = agentFormatValue === 'graph' || agent?.id === 'graph-generator';
    
    // Check if displayContent contains a graph error
    let hasGraphError = false;
    if (displayContent && displayContent.trim()) {
      try {
        const parsed = JSON.parse(displayContent);
        if (parsed && typeof parsed === 'object' && parsed.error && !parsed.success) {
          // If it's a graph agent or the error doesn't specify an agentId, show graph error
          if (isGraphAgent || !parsed.agentId || parsed.agentId === 'graph-generator') {
            hasGraphError = true;
          }
        }
      } catch {
        // Not JSON, ignore
      }
    }
    
    return isGraphAgent || !!graphData || hasGraphError;
  }, [agent?.requiredOutputFormat, agent?.id, graphData, displayContent]);

  // Check if we should render as table (search-results and search-card should render as cards, not table)
  const shouldRenderTable = agent?.requiredOutputFormat === 'table';
  const isSearchResultsFormat = agent?.requiredOutputFormat === 'search-results' || agent?.requiredOutputFormat === 'search-card';
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
        pageSize: DEFAULT_LIMIT,
        showPageSizeSelector: true,
        pageSizeOptions: [10, 25, 50, 100, 500],
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
    // Still render parallel image, image errors, and metrics if available
    if (parallelImageData || imageError || (tokenUsage || videoUsage || duration !== null)) {
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

          {/* Image Error Display - Show even if there's a successful graph response */}
          {imageError && !parallelImageData && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                    Image Generation Error
                  </h3>
                </div>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {imageError}
              </p>
            </div>
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
                        const imageTypeSuffix = formatImageTypeForFilename(imageType);
                        const filename = imageTypeSuffix 
                          ? `Gradian_Image_${imageTypeSuffix}_${timestamp}.png`
                          : `Gradian_Image_${timestamp}.png`;
                        
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
              {imageError && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                    Image Generation Warning
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {imageError}
                  </p>
                </div>
              )}
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

      {/* Summarized Prompt - shown before search/image results when summarization is enabled */}
      {summarizedPrompt && summarizedPrompt.trim() && (
        <div className="relative overflow-hidden rounded-xl border border-violet-200/50 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/50 via-purple-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-indigo-950/20 backdrop-blur-sm shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-100/20 to-transparent dark:from-violet-900/10" />
          <div className="relative p-5 md:p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="rounded-lg bg-violet-100 dark:bg-violet-900/30 p-2">
                  <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200 uppercase tracking-wide mb-1">
                      Summarized Prompt
                    </h3>
                    <p className="text-xs text-violet-700/70 dark:text-violet-300/70">
                      Optimized version used for search and image generation
                    </p>
                  </div>
                  <CopyContent content={summarizedPrompt.trim()} />
                </div>
              </div>
            </div>
            <div className="mt-4 pl-11">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words" dir="auto">
                  {summarizedPrompt.trim()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Container - shown before everything else (only for "respond after search" flow, not for direct search agent) */}
      {(isSearchLoading || searchResults || searchError) && !isSearchResultsFormat && (
        <div className="space-y-4">
          {isSearchLoading && !searchResults && !searchError && (
            <SearchSkeleton />
          )}
          {searchResults && searchResults.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <AISearchResults results={searchResults} />
            </div>
          )}
          {searchError && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Search Error: {searchError}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Token Usage & Pricing - MetricCard */}
      {(tokenUsage || videoUsage || duration !== null || searchDuration !== null || searchUsage) && (
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
            ...(searchUsage ? [
              {
                id: 'search-cost',
                label: 'Search Cost',
                value: searchUsage.cost,
                prefix: '$',
                icon: 'Search',
                iconColor: 'violet' as const,
                format: 'currency' as const,
                precision: 4,
              },
            ] : []),
            ...(videoUsage ? [
              {
                id: 'video-duration',
                label: 'Video Duration',
                value: videoUsage.duration_seconds ?? 0,
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
                  value: videoUsage.estimated_cost.irt ?? 0,
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
            ...(searchDuration !== null && searchDuration !== undefined ? [{
              id: 'search-duration',
              label: 'Search Duration',
              value: searchDuration < 1000 ? searchDuration : searchDuration / 1000,
              unit: searchDuration < 1000 ? 'ms' : 's',
              icon: 'Timer',
              iconColor: 'violet' as const,
              format: 'number' as const,
              precision: searchDuration < 1000 ? 0 : 2,
            }] : []),
          ]}
          footer={{
            icon: 'Sparkles',
            text: 'Powered by Gradian AI • Efficient & Cost-Effective',
          }}
        />
      )}

      {/* Parallel Image Container - shown after MetricCard, before main response */}
      {(isImageLoading || parallelImageData || imageError) && imageType && (
        <div className="space-y-4">
          {isImageLoading && !parallelImageData && !imageError && (
            <ImageSkeleton />
          )}
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
                    const imageTypeSuffix = formatImageTypeForFilename(imageType);
                    const filename = imageTypeSuffix 
                      ? `Gradian_Image_${imageTypeSuffix}_${timestamp}.png`
                      : `Gradian_Image_${timestamp}.png`;
                    
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
          {imageError && !parallelImageData && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4">
              <p className="text-sm text-orange-800 dark:text-orange-200">{imageError}</p>
            </div>
          )}
          {parallelImageData && imageError && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">{imageError}</p>
            </div>
          )}
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

      {/* Main Response Container */}
      {/* Show skeleton only when main loading and no content */}
      {(isMainLoading ?? isLoading) && !displayContent && (
        <MainResponseSkeleton />
      )}
      {/* Show content when main loading is complete (don't wait for image) */}
      {!(isMainLoading ?? isLoading) && displayContent && shouldRenderImage ? (
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
                        // Generate filename with timestamp and image type: Gradian_Image_{type}_{time}.png
                        const timestamp = Date.now();
                        const imageTypeSuffix = formatImageTypeForFilename(imageType);
                        const filename = imageTypeSuffix 
                          ? `Gradian_Image_${imageTypeSuffix}_${timestamp}.png`
                          : `Gradian_Image_${timestamp}.png`;
                        
                        const currentImageData = renderData.imageData || imageData || parallelImageData;
                        
                        if (!currentImageData) {
                          return;
                        }
                        
                        if (currentImageData.b64_json) {
                          // Handle base64 image
                          // Extract base64 string (remove data URL prefix if present)
                          const base64String = currentImageData.b64_json.startsWith('data:image/')
                            ? currentImageData.b64_json.split(',')[1] || currentImageData.b64_json
                            : currentImageData.b64_json;
                          
                          // Convert base64 to blob
                          const byteCharacters = atob(base64String);
                          const byteNumbers = new Array(byteCharacters.length);
                          for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                          }
                          const byteArray = new Uint8Array(byteNumbers);
                          blob = new Blob([byteArray], { type: 'image/png' });
                        } else if (currentImageData?.url) {
                          // Handle URL image - fetch and convert to blob
                          const response = await fetch(currentImageData.url);
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
                        const currentImageData = renderData.imageData || imageData || parallelImageData;
                        
                        if (currentImageData?.url) {
                          imageUrl = currentImageData.url;
                        } else if (currentImageData?.b64_json) {
                          // Convert base64 to data URL format: data:image/jpeg;base64,...
                          if (currentImageData.b64_json.startsWith('data:image/')) {
                            // Already has data URL prefix
                            imageUrl = currentImageData.b64_json;
                          } else {
                            // Add data URL prefix - use jpeg format as it works reliably
                            imageUrl = `data:image/jpeg;base64,${currentImageData.b64_json}`;
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
                  
                  {(renderData.imageData || imageData || parallelImageData)?.url && <CopyContent content={(renderData.imageData || imageData || parallelImageData)?.url || ''} />}
                </div>
              </div>
              <div className="flex justify-center items-center w-full">
                <div className="w-full max-w-4xl">
                  <ImageViewer
                    sourceUrl={(renderData.imageData || imageData || parallelImageData)?.url || undefined}
                    content={(renderData.imageData || imageData || parallelImageData)?.b64_json || undefined}
                    alt="AI Generated Image"
                    objectFit="contain"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
              {(renderData.imageData || imageData || parallelImageData)?.revised_prompt && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Revised Prompt:
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {(renderData.imageData || imageData || parallelImageData)?.revised_prompt}
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
      ) : renderData.type === 'video' || shouldRenderVideo ? (
        (renderData.videoData || videoData) ? (
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
                      {(renderData.videoData || videoData)?.model || agent?.model}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-center items-center w-full">
                <div className="w-full max-w-4xl">
                  <VideoViewer
                    videoId={(renderData.videoData || videoData)?.video_id || undefined}
                    sourceUrl={(renderData.videoData || videoData)?.url || undefined}
                    content={(renderData.videoData || videoData)?.file_path || undefined}
                    value={renderData.videoData || videoData}
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
      ) : isSearchResultsFormat ? (
        // For search-only agents, show only search results
        (renderData.searchResults || searchResults) && (renderData.searchResults || searchResults)!.length > 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <AISearchResults results={renderData.searchResults || searchResults || []} />
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No search results available.
            </p>
          </div>
        )
      ) : renderData.type === 'table' || (shouldRenderTable && isValidTable && tableData.length > 0) ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <TableWrapper
              tableConfig={tableConfig}
              columns={tableColumns}
              data={renderData.tableData && Array.isArray(renderData.tableData) ? renderData.tableData : tableData}
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
      ) : renderData.type === 'graph' || shouldRenderGraph ? (
        parsedGraphData ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Generated Graph
                  </h3>
                  {agent?.model && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                    >
                      {agent.model}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="w-full h-[600px] min-h-[400px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <GraphViewer
                  data={{
                    nodes: parsedGraphData.nodes || [],
                    edges: parsedGraphData.edges || [],
                    nodeTypes: parsedGraphData.nodeTypes,
                    relationTypes: parsedGraphData.relationTypes,
                    schemas: parsedGraphData.schemas,
                  }}
                  height="100%"
                />
              </div>
            </div>
            
            {/* Graph Validation Warnings */}
            {graphWarnings && graphWarnings.length > 0 && (
              <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                    Graph Validation Warnings
                  </h3>
                </div>
                <div className="space-y-2">
                  {graphWarnings.map((warning, index) => (
                    <p key={index} className="text-sm text-orange-700 dark:text-orange-300">
                      • {warning}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-3">
                  Note: The graph is displayed despite these warnings. Please review and ensure all nodes are properly connected.
                </p>
              </div>
            )}
            
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                View Raw Graph Data
              </summary>
              <div className="mt-2">
                <CodeViewer
                  code={JSON.stringify(parsedGraphData, null, 2)}
                  programmingLanguage="json"
                  title="Raw Graph Data"
                  initialLineNumbers={10}
                />
              </div>
            </details>
          </div>
        ) : isGraphError ? (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Graph Generation Error
                </h3>
              </div>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4 font-medium">
              {(graphData as any)?.error || 'Graph generation failed'}
            </p>
            {displayContent && displayContent.trim() && (
              <details className="text-sm">
                <summary className="cursor-pointer text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-100 mb-2">
                  View Full Error Details
                </summary>
                <div className="mt-2">
                  <CodeViewer
                    code={displayContent}
                    programmingLanguage="json"
                    title="Error Response"
                    initialLineNumbers={10}
                  />
                </div>
              </details>
            )}
          </div>
        ) : null
      ) : !(isMainLoading ?? isLoading) && agent?.requiredOutputFormat === 'string' ? (
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
                enablePrint={true}
                printConfig={{
                  includeHeader: true,
                  documentTitle: agent?.label || 'AI Generated Content',
                  documentNumber: agent?.id ? `AI-${agent.id}` : undefined,
                }}
              />
            </div>
          </div>
        </div>
      ) : !(isMainLoading ?? isLoading) && (renderData.type === 'markdown' || (displayContent && displayContent.trim() && agentFormat !== 'json' && agentFormat !== 'string' && !shouldRenderTable && !shouldRenderGraph)) ? (
        // Show markdown content (for agents that use search as a tool, this shows after search results)
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 me-1" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {agent?.label || 'AI Response'}
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
                enablePrint={true}
                printConfig={{
                  includeHeader: true,
                  documentTitle: agent?.label || 'AI Generated Content',
                  documentNumber: agent?.id ? `AI-${agent.id}` : undefined,
                }}
              />
            </div>
          </div>
        </div>
      ) : !(isMainLoading ?? isLoading) ? (
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
      ) : null}
    </div>
  );
}

