// Chat Message Component
// Renders individual message bubbles with markdown support and DynamicAiAgentResponseContainer integration

'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getDisplayNameFields, resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { Bot, Hash, AtSign, Clock, Info, Download, ChevronUp, ChevronDown, RefreshCw, Loader2 } from 'lucide-react';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { AISearchResults } from '@/domains/ai-builder/components/AISearchResults';
import type { SearchResult } from '@/domains/ai-builder/utils/ai-search-utils';
import { DynamicAiAgentResponseContainer } from '@/gradian-ui/data-display/components/DynamicAiAgentResponseContainer';
import { ImageViewer } from '@/gradian-ui/form-builder/form-elements/components/ImageViewer';
import { VideoViewer } from '@/gradian-ui/form-builder/form-elements/components/VideoViewer';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { detectMessageRenderType } from '../utils/message-render-utils';
import type { TableColumn, TableConfig } from '@/gradian-ui/data-display/table/types';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserStore } from '@/stores/user.store';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { formatRelativeTime, formatTime } from '@/gradian-ui/shared/utils/date-utils';
import { MessageMetadataDialog } from './MessageMetadataDialog';
import type { ChatMessage as ChatMessageType } from '../types';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';
import type { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { MaximizeButton } from '@/gradian-ui/layout/components/MaximizeButton';
import { Modal } from '@/gradian-ui/data-display/components/Modal';

export interface ChatMessageProps {
  message: ChatMessageType;
  index?: number;
  className?: string;
  onRetryFailedMessage?: (messageId: string) => void | Promise<void>;
}

function convertHashtagsToMarkdownAnchors(content: string): string {
  if (!content) return content;

  const lines = content.split('\n');
  let inCodeFence = false;

  return lines
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('```')) {
        inCodeFence = !inCodeFence;
        return line;
      }
      if (inCodeFence) return line;

      // Convert hashtags to in-doc anchors so markdown renders them consistently.
      return line.replace(/(^|\s)#([a-zA-Z0-9_-]+)/g, (_match, prefix, tag) => {
        return `${prefix}[#${tag}](#hashtag-${tag.toLowerCase()})`;
      });
    })
    .join('\n');
}

// Error boundary component for MarkdownViewer
class MarkdownViewerErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MarkdownViewer error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: { children: React.ReactNode }) {
    // Reset error state when content changes
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-sm text-gray-600 dark:text-gray-400 p-2">
          Error rendering markdown content.
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe wrapper for MarkdownViewer to prevent DOM reconciliation errors
// Uses error boundary and debounced rendering to prevent DOM conflicts
const SafeMarkdownViewer = React.memo(({ content, componentKey }: { content: string; componentKey: string }) => {
  const [displayContent, setDisplayContent] = useState(content);
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debounce content updates to prevent rapid re-renders during reconciliation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsReady(false);
    timeoutRef.current = setTimeout(() => {
      setDisplayContent(content);
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    }, 50); // Small delay to batch rapid updates

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content]);

  if (!isReady) {
    return <div className="min-h-[20px]" />;
  }

  return (
    <MarkdownViewerErrorBoundary>
      <MarkdownViewer 
        key={componentKey}
        content={displayContent}
        showToggle={false}
        isEditable={false}
        showEndLine={false}
      />
    </MarkdownViewerErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Re-render only if content or key changed
  return prevProps.content === nextProps.content && prevProps.componentKey === nextProps.componentKey;
});

SafeMarkdownViewer.displayName = 'SafeMarkdownViewer';

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  index = 0,
  className,
  onRetryFailedMessage,
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const user = useUserStore((state) => state.user);
  const language = useLanguageStore((state) => state.language || 'en');
  const defaultLang = getDefaultLanguage();
  const aiGeneratedContentLabel = getT(TRANSLATION_KEYS.AI_GENERATED_CONTENT, language, defaultLang);
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isRetryingFailedMessage, setIsRetryingFailedMessage] = useState(false);
  const metadataActionClass =
    'h-7 w-7 p-0 rounded-xl hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-gray-800 dark:hover:text-violet-300 transition-all duration-200 relative focus:ring-0 focus-visible:ring-0 text-gray-500 dark:text-gray-400';

  // Get user display name and initials for avatar (support name/lastname and API variants by language)
  const displayName = useMemo(() => {
    if (!user) return 'User';
    const displayNameFields = getDisplayNameFields(user as unknown as Record<string, unknown>);
    const firstName = resolveLocalizedField(displayNameFields.name, language, 'en') || '';
    const lastName = resolveLocalizedField(displayNameFields.lastname, language, 'en') || '';
    const combined = `${firstName} ${lastName}`.trim();
    return combined || firstName || lastName || user.email || 'User';
  }, [user, language]);

  const initials = useMemo(() => {
    const source = displayName || user?.email || 'User';
    return source
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [displayName, user]);

  // Get content for display (preserve newlines - they'll be handled by CSS for user messages)
  const cleanContent = useMemo(() => {
    if (!message.content) return '';
    return message.content.trim();
  }, [message.content]);

  // Create a stable key for MarkdownViewer that doesn't change on updates
  // Use message.id only to prevent re-mounting on updates
  const markdownKey = useMemo(() => `markdown-${message.id}`, [message.id]);

  // Track if component is mounted to prevent rendering during unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Use unified detection function to determine render type and extract data
  const renderData = useMemo(() => detectMessageRenderType(message), [
    message.role,
    message.content,
    message.metadata?.responseFormat,
    message.metadata?.searchResults,
    message.agentType,
    message.agentId,
  ]);

  const responseFormat = message.metadata?.responseFormat;
  const isTodoResponse = !!message.metadata?.todoId;
  const isOrchestrator = message.agentId === 'orchestrator' || message.agentType === 'orchestrator';
  const isSearchResponseFormat =
    responseFormat === 'search-card' || responseFormat === 'search-results';
  
  // Helper function to parse JSON
  const tryParseJson = useCallback((content: string): any => {
    if (!content || typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }, []);
  
  // Determine if we should use DynamicAiAgentResponseContainer
  // Use it for structured formats that need special rendering
  const shouldRenderAgentContainer = isAssistant && 
    responseFormat && 
    ['json', 'table', 'image', 'video', 'graph', 'string'].includes(responseFormat) &&
    (isTodoResponse || responseFormat === 'image' || responseFormat === 'video' || responseFormat === 'graph');

  // For agent container, we need to create a mock action and schema
  // This is a simplified version - in production, you'd want to handle this more elegantly
  const agentAction: QuickAction = {
    id: message.id,
    label: message.metadata?.todoTitle || message.agentId || 'AI Response',
    icon: 'Sparkles',
    action: "runAiAgent",
    agentId: message.agentId,
    runType: 'automatic', // Auto-execute since we already have the response
  };

  const agentSchema: FormSchema = {
    id: 'chat-message',
    singular_name: 'Chat Message',
    plural_name: 'Chat Messages',
    description: 'AI generated response',
    icon: 'BotMessageSquare',
    fields: [],
    sections: [],
  };

  // Parse message content for DynamicAiAgentResponseContainer
  // Use the data from renderData when available, otherwise parse content
  const parsedContent = useMemo(() => {
    // If renderData already has parsed data, use it (highest priority)
    if (renderData.type === 'image' && renderData.imageData) {
      return renderData.imageData;
    }
    if (renderData.type === 'video' && renderData.videoData) {
      return renderData.videoData;
    }
    if (renderData.type === 'graph' && renderData.graphData) {
      return renderData.graphData;
    }
    if (renderData.type === 'table' && renderData.tableData) {
      return renderData.tableData;
    }
    if (renderData.type === 'json' && renderData.jsonData) {
      return renderData.jsonData;
    }
    if (renderData.type === 'string' && renderData.stringData) {
      return renderData.stringData;
    }
    
    // Otherwise, try to parse content if needed
    // Note: detectMessageRenderType already handles markdown-wrapped JSON via extractJson
    if (shouldRenderAgentContainer || 
      (isAssistant && message.content && 
       (message.content.trim().startsWith('{') || message.content.trim().startsWith('[')))) {
      try {
        const trimmed = message.content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          return JSON.parse(trimmed);
        }
        return message.content;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to parse message content as JSON:', error, 'Content:', message.content?.substring(0, 200));
        }
        return message.content;
      }
    }
    
    return null;
  }, [shouldRenderAgentContainer, isAssistant, message.content, renderData]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isStringExpanded, setIsStringExpanded] = useState(false);
  const markdownContentRef = useRef<HTMLDivElement>(null);
  const stringContentRef = useRef<HTMLDivElement>(null);
  const [stringContentHeight, setStringContentHeight] = useState<number | null>(null);
  const isFailedUserMessage = isUser && message.metadata?.deliveryStatus === 'failed';
  const isPendingUserMessage = isUser && message.metadata?.deliveryStatus === 'pending';
  const failedMessageError = message.metadata?.errorMessage || 'Network error. Please check your connection and try again.';

  // Get raw content for copying (without HTML processing)
  const rawContent = message.content || '';

  // Check if this is a thinking message
  const isThinking = message.metadata?.isThinking || false;

  // Check if content is long (more than 500 characters or has multiple paragraphs)
  // For markdown, we'll use height-based truncation instead of character-based
  const isLongContent = cleanContent.length > 500 || cleanContent.split('\n\n').length > 3;
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const maxCollapsedHeight = 300; // Maximum height in pixels when collapsed
  
  // Measure content height after render
  useEffect(() => {
    // Skip height measurement for special render types or agent container
    if (markdownContentRef.current && !shouldRenderAgentContainer && renderData.type === 'markdown') {
      // Use a small delay to ensure markdown is fully rendered
      const timer = setTimeout(() => {
        if (markdownContentRef.current) {
          const height = markdownContentRef.current.scrollHeight;
          setContentHeight(height);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [cleanContent, shouldRenderAgentContainer, renderData.type, isExpanded]);
  
  // Measure string content height for assistant messages with responseFormat === 'string'
  const isStringMessage = isAssistant && responseFormat === 'string' && shouldRenderAgentContainer;
  const stringContent = isStringMessage && parsedContent 
    ? (typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent, null, 2))
    : '';
  const isStringLong = stringContent.length > 500 || stringContent.split('\n\n').length > 3;
  const isOrchestratorStringMessage = isStringMessage && isOrchestrator;
  const disableOrchestratorClamping = isOrchestrator;
  
  useEffect(() => {
    if (stringContentRef.current && isStringMessage) {
      const timer = setTimeout(() => {
        if (stringContentRef.current) {
          const height = stringContentRef.current.scrollHeight;
          setStringContentHeight(height);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [stringContent, isStringMessage, isStringExpanded]);
  
  const shouldTruncateString =
    !isOrchestratorStringMessage &&
    isStringLong &&
    !isStringExpanded &&
    (stringContentHeight === null || stringContentHeight > 300);
  
  const shouldTruncate =
    !disableOrchestratorClamping &&
    isLongContent &&
    !isExpanded &&
    (contentHeight === null || contentHeight > maxCollapsedHeight);
  const displayContent = cleanContent; // Always show full content, truncate with CSS
  const displayContentWithStyledHashtags = useMemo(
    () => convertHashtagsToMarkdownAnchors(displayContent),
    [displayContent]
  );
  
  // Check if message contains image or video
  const hasImageOrVideo = ['image', 'video', 'graph'].includes(renderData.type);
  const showAgentBadge = isAssistant && !!message.agentId;

  // Get complexity for orchestrator messages
  const complexity = message.metadata?.complexity;
  const showComplexity = isOrchestrator && complexity !== undefined && complexity !== null;

  // Determine complexity badge color based on value
  const getComplexityColor = (value: number): 'green' | 'amber' | 'red' => {
    if (value < 0.3) return 'green'; // Low complexity - green
    if (value < 0.7) return 'amber'; // Medium complexity - amber
    return 'red'; // High complexity - red
  };

  // Format complexity as percentage
  const formatComplexity = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  // Save handler for images and videos
  const handleSave = useCallback(async (type: 'image' | 'video', data: any) => {
    try {
        if (type === 'image') {
        let blob: Blob;
        let filename: string;
        
        if (data.b64_json) {
          // Convert base64 to blob
          const base64Data = data.b64_json.replace(/^data:image\/\w+;base64,/, '');
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: 'image/png' });
          
          // Generate filename with Gradian prefix and ULID for base64 images
          const { ulid } = await import('ulid');
          const imageUlid = ulid();
          filename = `Gradian_Image_${imageUlid}.png`;
        } else if (data.url) {
          // Handle both absolute and relative URLs
          let fetchUrl = data.url;
          if (data.url.startsWith('/')) {
            // Relative URL - prepend current origin
            fetchUrl = window.location.origin + data.url;
          }
          
          // Extract filename from URL, or generate one if not available
          try {
            const urlPath = new URL(fetchUrl).pathname;
            const urlFilename = urlPath.split('/').pop() || '';
            
            // If URL contains a filename with extension, use it
            if (urlFilename && urlFilename.includes('.') && urlFilename.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
              filename = urlFilename;
            } else if (urlFilename && urlFilename.startsWith('Gradian_Image_')) {
              // If it's a Gradian_Image_ file without extension, add .png
              filename = `${urlFilename}.png`;
            } else {
              // Generate new filename with Gradian prefix and ULID
              const { ulid } = await import('ulid');
              const imageUlid = ulid();
              filename = `Gradian_Image_${imageUlid}.png`;
            }
          } catch {
            // If URL parsing fails, generate filename
            const { ulid } = await import('ulid');
            const imageUlid = ulid();
            filename = `Gradian_Image_${imageUlid}.png`;
          }
          
          // Fetch from URL
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          blob = await response.blob();
        } else {
          return;
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (type === 'video') {
        let blob: Blob;
        // Generate filename with Gradian prefix and ULID
        const { ulid } = await import('ulid');
        const videoUlid = ulid();
        const filename = `Gradian_Video_${videoUlid}.mp4`;
        
        if (data.url) {
          // Fetch from URL
          const response = await fetch(data.url);
          blob = await response.blob();
          // Keep the Gradian_Video_ prefix format, don't override with URL filename
          // The filename is already set with Gradian_Video_{ulid}.mp4 format
        } else if (data.file_path) {
          // For file paths, we might need to fetch from a server endpoint
          // For now, try to use it as a URL
          const response = await fetch(data.file_path);
          blob = await response.blob();
        } else {
          return;
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  }, []);

  return (
    <motion.div
      id={`message-${message.id}`}
      data-message-id={message.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'flex gap-2 mb-4 overflow-x-hidden',
        isUser && 'flex-row-reverse',
        className
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <Avatar className="h-8 w-8 border rounded-full bg-violet-100 text-violet-800 shrink-0 border-gray-200 dark:border-gray-700 m-0">
          {user?.avatar ? (
            <AvatarImage
              src={user.avatar}
              alt={displayName}
            />
          ) : null}
          <AvatarFallback className="bg-violet-100 text-violet-800 text-xs dark:bg-violet-900 dark:text-violet-200">
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        )}>
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message Content */}
      <div 
        className={cn(
          'flex-1 max-w-[80%] relative',
          isUser && 'flex flex-col items-end'
        )}
      >

        <div 
          dir="auto"
          className={cn(
            'rounded-2xl overflow-x-hidden relative min-w-[120px]',
            disableOrchestratorClamping && 'overflow-y-visible',
            hasImageOrVideo ? 'p-0' : 'px-4 py-3',
            isUser
              ? 'bg-violet-600 dark:bg-violet-700 text-white rounded-tr-none'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
          )}
        >
          {/* Agent ID Badge - floating for media cards only */}
          {showAgentBadge && hasImageOrVideo && (
            <div className={cn(
              'absolute top-2 left-2 z-10',
              hasImageOrVideo && 'top-2 left-2'
            )}>
              <Badge
                color="cyan"
                size="sm"
                className="cursor-default"
              >
                {message.metadata?.todoTitle ? `${message.metadata.todoTitle} • ${message.agentId}` : message.agentId}
              </Badge>
            </div>
          )}
          {/* Agent ID Badge - inline for text/code cards to avoid overlap */}
          {showAgentBadge && !hasImageOrVideo && (
            <div className="mb-2">
              <Badge
                color="cyan"
                size="sm"
                className="cursor-default"
              >
                {message.metadata?.todoTitle ? `${message.metadata.todoTitle} • ${message.agentId}` : message.agentId}
              </Badge>
            </div>
          )}

          {isThinking ? (
            <div className="flex items-center gap-2 py-1">
              <TextShimmerWave
                as="span"
                className="text-xs"
                duration={1.5}
                zDistance={8}
                xDistance={1.5}
                yDistance={-1.5}
                spread={0.8}
              >
                Thinking...
              </TextShimmerWave>
            </div>
          ) : (() => {
            // Check if we should render special components
            const hasSpecialRenderType = ['image', 'video', 'graph', 'table', 'json', 'string'].includes(renderData.type) && renderData.type !== 'search';
            
            // Check if we have data available (either from renderData or parsedContent)
            const hasData = parsedContent !== null || 
              (renderData.type === 'graph' && renderData.graphData !== undefined) ||
              (renderData.type === 'image' && renderData.imageData !== undefined) ||
              (renderData.type === 'video' && renderData.videoData !== undefined) ||
              (renderData.type === 'table' && renderData.tableData !== undefined) ||
              (renderData.type === 'json' && renderData.jsonData !== undefined) ||
              (renderData.type === 'string' && renderData.stringData !== undefined);
            
            return (shouldRenderAgentContainer || hasSpecialRenderType) && hasData;
          })() ? (
            <div className="w-full text-sm leading-relaxed">
              {(() => {
                // Render based on unified renderData type
                if (renderData.type === 'image') {
                  // Use imageData from renderData or parse from content
                  let imageData: any = null;
                  
                  if (renderData.imageData) {
                    imageData = renderData.imageData;
                  } else if (parsedContent) {
                    // Try to extract image data from parsed content
                    if (typeof parsedContent === 'object' && parsedContent?.image) {
                      imageData = parsedContent.image;
                    } else if (typeof parsedContent === 'object' && (parsedContent.url || parsedContent.b64_json)) {
                      imageData = parsedContent;
                    } else if (typeof parsedContent === 'string') {
                      try {
                        const parsed = JSON.parse(parsedContent);
                        imageData = parsed?.image || parsed;
                      } catch {
                        // If not JSON, treat as URL string
                        imageData = { url: parsedContent };
                      }
                    }
                  } else if (message.content) {
                    // Try to parse from message content
                    try {
                      const parsed = tryParseJson(message.content);
                      if (parsed) {
                        imageData = parsed?.image || parsed;
                      } else {
                        // If not JSON, treat as URL string
                        imageData = { url: message.content };
                      }
                    } catch {
                      imageData = { url: message.content };
                    }
                  }
                  
                  // Ensure URL has proper format (add extension if missing for Gradian_Image_ files)
                  // Convert public folder URLs to API routes for dynamic serving
                  if (imageData?.url) {
                    // If URL is a Gradian_Image_ file without extension, add .png
                    if (imageData.url.includes('Gradian_Image_') && !imageData.url.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                      imageData.url = `${imageData.url}.png`;
                    }
                    
                    // Convert public folder URLs to API routes for immediate availability
                    if (imageData.url.startsWith('/images/ai-generated/')) {
                      const filename = imageData.url.replace('/images/ai-generated/', '');
                      imageData.url = `/api/images/${filename}`;
                    }
                  }
                  
                  if (imageData && (imageData.url || imageData.b64_json)) {
                    return (
                      <div className={cn(
                        "flex justify-center items-center w-full relative",
                        isAssistant && message.agentId && "pt-12"
                      )}>
                        <div className="w-full">
                          <ImageViewer
                            sourceUrl={imageData.url || undefined}
                            content={imageData.b64_json || undefined}
                            alt={message.metadata?.todoTitle || 'AI Generated Image'}
                            objectFit="contain"
                            className="w-full h-auto"
                          />
                        </div>
                        {/* Save Button */}
                        <button
                          onClick={() => handleSave('image', imageData)}
                          className={cn(
                            'absolute top-2 right-2 z-10',
                            'p-2 rounded-lg bg-white/90 dark:bg-gray-800/90',
                            'border border-gray-200 dark:border-gray-700',
                            'hover:bg-white dark:hover:bg-gray-800',
                            'transition-colors shadow-sm',
                            'flex items-center justify-center'
                          )}
                          title="Save image"
                        >
                          <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        </button>
                      </div>
                    );
                  }
                }
                
                if (renderData.type === 'video') {
                  // Use videoData from renderData
                  const videoData = renderData.videoData || parsedContent;
                  
                  if (videoData && (videoData.video_id || videoData.url || videoData.file_path)) {
                    return (
                      <div className={cn(
                        "flex justify-center items-center w-full relative",
                        isAssistant && message.agentId && "pt-12"
                      )}>
                        <div className="w-full">
                          <VideoViewer
                            videoId={videoData.video_id || undefined}
                            sourceUrl={videoData.url || undefined}
                            content={videoData.file_path || undefined}
                            value={videoData}
                            alt={message.metadata?.todoTitle || 'AI Generated Video'}
                            className="w-full h-auto"
                            controls={true}
                            autoplay={false}
                          />
                        </div>
                        {/* Save Button */}
                        <button
                          onClick={() => handleSave('video', videoData)}
                          className={cn(
                            'absolute top-2 right-2 z-10',
                            'p-2 rounded-lg bg-white/90 dark:bg-gray-800/90',
                            'border border-gray-200 dark:border-gray-700',
                            'hover:bg-white dark:hover:bg-gray-800',
                            'transition-colors shadow-sm',
                            'flex items-center justify-center'
                          )}
                          title="Save video"
                        >
                          <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        </button>
                      </div>
                    );
                  }
                }
                
                if (renderData.type === 'graph') {
                  // Use graphData from renderData
                  const rawGraphData = renderData.graphData || parsedContent;
                  const normalizedGraphData =
                    rawGraphData &&
                    typeof rawGraphData === 'object' &&
                    'graph' in rawGraphData &&
                    (rawGraphData as any).graph &&
                    typeof (rawGraphData as any).graph === 'object'
                      ? (rawGraphData as any).graph
                      : rawGraphData;

                  if (normalizedGraphData && Array.isArray(normalizedGraphData.nodes) && Array.isArray(normalizedGraphData.edges)) {
                    return (
                      <div className={cn(
                        "flex justify-center items-center w-full relative",
                        isAssistant && message.agentId && "pt-12"
                      )}>
                        <div className="w-full h-[600px] min-h-[400px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <GraphViewer
                            data={{
                              nodes: normalizedGraphData.nodes || [],
                              edges: normalizedGraphData.edges || [],
                              nodeTypes: normalizedGraphData.nodeTypes,
                              relationTypes: normalizedGraphData.relationTypes,
                              schemas: normalizedGraphData.schemas,
                            }}
                            height="100%"
                          />
                        </div>
                      </div>
                    );
                  }
                }
                
                if (renderData.type === 'table') {
                  // Use tableData from renderData or parse from content
                  let tableData: any[] = [];
                  
                  if (renderData.tableData) {
                    tableData = Array.isArray(renderData.tableData) 
                      ? renderData.tableData 
                      : [renderData.tableData];
                  } else if (parsedContent) {
                    try {
                      const data = typeof parsedContent === 'string' ? JSON.parse(parsedContent) : parsedContent;
                      if (Array.isArray(data)) {
                        tableData = data;
                      } else if (data && typeof data === 'object') {
                        const keys = Object.keys(data);
                        if (keys.length === 1 && Array.isArray(data[keys[0]])) {
                          tableData = data[keys[0]];
                        } else {
                          tableData = [data];
                        }
                      }
                    } catch {
                      // If parsing fails, try to extract array from string
                      const match = message.content.match(/\[[\s\S]*\]/);
                      if (match) {
                        try {
                          tableData = JSON.parse(match[0]);
                        } catch {
                          tableData = [];
                        }
                      }
                    }
                  }
                  
                  if (tableData.length > 0) {
                    // Generate columns from data
                    const allKeys = new Set<string>();
                    tableData.forEach((item) => {
                      if (item && typeof item === 'object') {
                        Object.keys(item).forEach((key) => allKeys.add(key));
                      }
                    });
                    
                    const columns: TableColumn[] = Array.from(allKeys).map((key) => {
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
                    
                    const tableConfig: TableConfig = {
                      id: 'todo-response-table',
                      columns,
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
                    
                    return (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                        <TableWrapper
                          tableConfig={tableConfig}
                          columns={columns}
                          data={tableData}
                          showCards={false}
                          disableAnimation={false}
                        />
                      </div>
                    );
                  }
                }
                
                if (renderData.type === 'json') {
                  // Use jsonData from renderData
                  const jsonData = renderData.jsonData || parsedContent;
                  return (
                    <CodeViewer
                      code={typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2)}
                      programmingLanguage="json"
                      title={message.metadata?.todoTitle || aiGeneratedContentLabel}
                      initialLineNumbers={10}
                    />
                  );
                }
                
                if (renderData.type === 'string') {
                  // Use stringData from renderData
                  const stringData = renderData.stringData || message.content || '';
                  return (
                    <div className="relative">
                      <div 
                        ref={stringContentRef}
                        className={cn(
                          "chat-message-content text-sm leading-relaxed relative transition-all duration-300 ease-in-out",
                          shouldTruncateString ? "overflow-hidden" : ""
                        )}
                        style={
                          disableOrchestratorClamping
                            ? { maxHeight: 'none', overflow: 'visible' }
                            : shouldTruncateString
                              ? { maxHeight: '300px' }
                              : { maxHeight: stringContentHeight ? `${stringContentHeight + 10}px` : '10000px' }
                        }
                      >
                        <MarkdownViewer 
                          content={convertHashtagsToMarkdownAnchors(stringData)}
                          showToggle={false}
                          isEditable={false}
                          showEndLine={false}
                        />
                      </div>
                      {!isOrchestratorStringMessage && isStringLong && (stringContentHeight === null || stringContentHeight > 300) && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => setIsStringExpanded(!isStringExpanded)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                              'text-xs font-medium transition-all',
                              'border',
                              'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            )}
                          >
                            <span>{isStringExpanded ? 'Show less' : 'Show more'}</span>
                            {isStringExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Fallback: render as code viewer
                return (
                  <CodeViewer
                    code={typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent, null, 2)}
                    programmingLanguage="text"
                    title={message.metadata?.todoTitle || aiGeneratedContentLabel}
                    initialLineNumbers={10}
                  />
                );
              })()}
            </div>
          ) : (
            <div className={cn(
              'prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed',
              hasImageOrVideo && 'p-4'
            )}>
              <div 
                ref={markdownContentRef}
                className={cn(
                  "chat-message-content text-sm leading-relaxed relative transition-all duration-300 ease-in-out",
                  isUser ? "overflow-visible" : (shouldTruncate ? "overflow-hidden" : "")
                )}
                style={
                  isUser
                    ? { maxHeight: 'none', overflow: 'visible' }
                    : disableOrchestratorClamping
                    ? { maxHeight: 'none', overflow: 'visible' }
                    : shouldTruncate
                      ? { maxHeight: `${maxCollapsedHeight}px` }
                      : { maxHeight: contentHeight ? `${contentHeight + 10}px` : '10000px' }
                }
              >
                {isUser ? (
                  // For user messages, render as plain text with preserved newlines
                  <div className="whitespace-pre-line break-words">
                    {displayContent}
                  </div>
                ) : (renderData.type === 'search' || isSearchResponseFormat) ? (
                  // For search responses, never route through markdown renderer.
                  // This avoids DOM reconciliation issues for large/structured search payloads.
                  renderData.searchResults && renderData.searchResults.length > 0 ? (
                    <AISearchResults results={renderData.searchResults} />
                  ) : (
                    <CodeViewer
                      code={typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
                      programmingLanguage="json"
                      title={message.metadata?.todoTitle || aiGeneratedContentLabel}
                      initialLineNumbers={10}
                    />
                  )
                ) : (
                  // For assistant messages, use SafeMarkdownViewer for markdown support
                  // Use stable key and mounted check to prevent DOM reconciliation issues
                  isMountedRef.current && (
                    <SafeMarkdownViewer 
                      key={markdownKey}
                      componentKey={markdownKey}
                      content={displayContentWithStyledHashtags}
                    />
                  )
                )}
              </div>
              {!isUser &&
                renderData.type === 'markdown' &&
                !disableOrchestratorClamping &&
                isLongContent &&
                (contentHeight === null || contentHeight > maxCollapsedHeight) && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                      'text-xs font-medium transition-all',
                      'border',
                      isUser
                        ? 'bg-violet-500/20 border-violet-400/30 text-white hover:bg-violet-500/30 hover:border-violet-400/50'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Delivery status (outside bubble) */}
        {isPendingUserMessage && (
          <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-violet-600 dark:text-violet-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Sending...</span>
          </div>
        )}

        {isFailedUserMessage && (
          <div className="mt-1 inline-flex items-center gap-2 text-[11px] text-red-600 dark:text-red-300">
            <span className="max-w-[260px] truncate">{failedMessageError}</span>
            {onRetryFailedMessage && (
              <button
                type="button"
                disabled={isRetryingFailedMessage}
                onClick={async () => {
                  try {
                    setIsRetryingFailedMessage(true);
                    await onRetryFailedMessage(message.id);
                  } finally {
                    setIsRetryingFailedMessage(false);
                  }
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-0.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/60"
              >
                <RefreshCw className={cn('h-3 w-3', isRetryingFailedMessage && 'animate-spin')} />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Metadata */}
        {(message.createdAt || showComplexity || rawContent || (isAssistant && (message.metadata?.tokenUsage || message.metadata?.duration !== undefined || message.metadata?.cost !== undefined || message.metadata?.executionType))) && (
          <div className={cn(
            'mt-1.5 text-xs flex items-center gap-2 flex-wrap',
            isUser ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
          )}>
            {showComplexity && complexity !== undefined && (
              <Badge 
                color={getComplexityColor(complexity)}
                size="sm"
                className="cursor-default"
                tooltip={`Complexity: ${formatComplexity(complexity)}`}
              >
                {formatComplexity(complexity)}
              </Badge>
            )}
            {message.createdAt && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-default">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(message.createdAt, { addSuffix: true, localeCode: language || undefined })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatTime(message.createdAt, language || undefined)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Copy button */}
            {rawContent && (
              <CopyContent 
                content={rawContent}
                className={metadataActionClass}
              />
            )}
            {/* Maximize message into modal */}
            {rawContent && (
              <MaximizeButton
                layout="inline"
                isMaximized={false}
                onClick={() => setIsMessageModalOpen(true)}
                transparentBackground={true}
                className={metadataActionClass}
                labelMaximize="Open message in modal"
                labelMinimize="Close message modal"
              />
            )}
            {/* Info icon for assistant messages with metadata */}
            {isAssistant && (message.metadata?.tokenUsage || message.metadata?.duration !== undefined || message.metadata?.cost !== undefined || message.metadata?.executionType) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMetadataDialogOpen(true);
                }}
                className={cn(
                  metadataActionClass
                )}
                title="View message metadata"
                aria-label="View message metadata"
              >
                <Info className="w-4 h-4 mx-auto" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Message Metadata Dialog */}
      {isAssistant && (
        <MessageMetadataDialog
          message={message}
          open={isMetadataDialogOpen}
          onOpenChange={setIsMetadataDialogOpen}
        />
      )}

      {/* Message Preview Modal */}
      <Modal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        title={message.metadata?.todoTitle || message.agentId || (isUser ? 'User Message' : 'Assistant Message')}
        description={message.createdAt ? formatTime(message.createdAt, language || undefined) : undefined}
        size="xl"
        closeOnOutsideClick={true}
        enableMaximize={true}
        enableCopy={Boolean(rawContent)}
        copyContent={rawContent}
        headerBadges={
          message.agentId
            ? [
                {
                  id: `agent-${message.id}`,
                  label: message.agentId,
                  color: 'cyan',
                  icon: 'Bot',
                },
              ]
            : []
        }
      >
        {(renderData.type === 'search' || isSearchResponseFormat) ? (
          renderData.searchResults && renderData.searchResults.length > 0 ? (
            <AISearchResults results={renderData.searchResults} />
          ) : (
            <CodeViewer
              code={typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent, null, 2)}
              programmingLanguage="json"
              title={message.metadata?.todoTitle || aiGeneratedContentLabel}
              initialLineNumbers={10}
            />
          )
        ) : (
          <div className="chat-message-content">
            <MarkdownViewer
              content={convertHashtagsToMarkdownAnchors(rawContent)}
              showToggle={false}
              isEditable={false}
              showEndLine={false}
            />
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

ChatMessage.displayName = 'ChatMessage';

