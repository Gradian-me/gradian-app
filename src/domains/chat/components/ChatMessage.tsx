// Chat Message Component
// Renders individual message bubbles with markdown support and DynamicAiAgentResponseContainer integration

'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { Bot, Hash, AtSign, Clock, Info, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { DynamicAiAgentResponseContainer } from '@/gradian-ui/data-display/components/DynamicAiAgentResponseContainer';
import { ImageViewer } from '@/gradian-ui/form-builder/form-elements/components/ImageViewer';
import { VideoViewer } from '@/gradian-ui/form-builder/form-elements/components/VideoViewer';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import type { TableColumn, TableConfig } from '@/gradian-ui/data-display/table/types';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { useUserStore } from '@/stores/user.store';
import { useLanguageStore } from '@/stores/language.store';
import { formatRelativeTime, formatTime } from '@/gradian-ui/shared/utils/date-utils';
import { processTextWithStyledHashtagsAndMentions } from '../utils/text-utils';
import { MessageMetadataDialog } from './MessageMetadataDialog';
import type { ChatMessage as ChatMessageType } from '../types';
import type { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

export interface ChatMessageProps {
  message: ChatMessageType;
  index?: number;
  className?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  index = 0,
  className,
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const user = useUserStore((state) => state.user);
  const language = useLanguageStore((state) => state.language || 'en');
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);

  // Get user display name and initials for avatar
  const displayName = useMemo(() => {
    if (!user) return 'User';
    const firstName = resolveLocalizedField(user.name, language, 'en') || '';
    const lastName = resolveLocalizedField(user.lastname, language, 'en') || '';
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

  // Get content for display (keep newlines for markdown)
  const cleanContent = useMemo(() => {
    if (!message.content) return '';
    return message.content.trim();
  }, [message.content]);

  // Check if message should render as DynamicAiAgentResponseContainer
  // Render for todo execution responses when responseFormat is specified
  const isTodoResponse = !!message.metadata?.todoId;
  const responseFormat = message.metadata?.responseFormat;
  const shouldRenderAgentContainer = isAssistant && 
    isTodoResponse &&
    responseFormat && 
    ['json', 'table', 'image', 'video', 'string'].includes(responseFormat);

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
    icon: 'MessageSquare',
    fields: [],
    sections: [],
  };

  // Parse message content for DynamicAiAgentResponseContainer
  // If content is JSON string, parse it; otherwise use as-is
  const parsedContent = useMemo(() => {
    if (!shouldRenderAgentContainer) return null;
    
    try {
      // Try to parse as JSON if it looks like JSON
      let trimmed = message.content.trim();
      
      // Handle escaped newlines in JSON strings (from chat.json storage)
      // Replace literal \n with actual newlines for proper JSON parsing
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // If the string contains escaped newlines, they're already escaped in the JSON
        // JSON.parse should handle them correctly, but we need to ensure proper parsing
        const parsed = JSON.parse(trimmed);
        return parsed;
      }
      return message.content;
    } catch (error) {
      // Log parsing errors for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to parse message content as JSON:', error, 'Content:', message.content?.substring(0, 200));
      }
      return message.content;
    }
  }, [shouldRenderAgentContainer, message.content]);

  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const markdownContentRef = useRef<HTMLDivElement>(null);

  // Get raw content for copying (without HTML processing)
  const rawContent = message.content || '';

  // Check if this is a thinking message
  const isThinking = message.metadata?.isThinking || false;

  // Check if content is long (more than 500 characters)
  const isLongContent = cleanContent.length > 500;
  const shouldTruncate = isLongContent && !isExpanded;
  const displayContent = shouldTruncate 
    ? cleanContent.substring(0, 500) + '...' 
    : cleanContent;
  
  // Post-process markdown to add hashtag/mention styling
  useEffect(() => {
    if (!markdownContentRef.current || shouldRenderAgentContainer) return;
    
    const processHashtagsAndMentions = (container: HTMLElement) => {
      // Find all text nodes that contain # or @
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      const textNodes: Text[] = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.nodeValue && (node.nodeValue.includes('#') || node.nodeValue.includes('@'))) {
          textNodes.push(node as Text);
        }
      }
      
      // Process each text node
      textNodes.forEach((textNode) => {
        const parent = textNode.parentElement;
        if (!parent || parent.classList.contains('hashtag-inline') || parent.classList.contains('mention-inline')) {
          return; // Already processed
        }
        
        const text = textNode.nodeValue || '';
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        // Collect all matches (hashtags and mentions)
        const matches: Array<{ type: 'hashtag' | 'mention'; start: number; end: number; text: string }> = [];
        
        // Process hashtags
        const hashtagRegex = /(?:^|\s)(#([a-zA-Z0-9_-]+))/g;
        let match: RegExpExecArray | null;
        while ((match = hashtagRegex.exec(text)) !== null) {
          matches.push({
            type: 'hashtag',
            start: match.index,
            end: match.index + match[0].length,
            text: match[0]
          });
        }
        
        // Process mentions
        const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
        let mentionMatch: RegExpExecArray | null;
        while ((mentionMatch = mentionRegex.exec(text)) !== null) {
          // Check if this mention is already inside a hashtag match
          const isInsideHashtag = matches.some(m => 
            m.type === 'hashtag' && mentionMatch!.index >= m.start && mentionMatch!.index < m.end
          );
          if (!isInsideHashtag) {
            matches.push({
              type: 'mention',
              start: mentionMatch.index,
              end: mentionMatch.index + mentionMatch[0].length,
              text: mentionMatch[0]
            });
          }
        }
        
        // Sort matches by start position
        matches.sort((a, b) => a.start - b.start);
        
        // Build fragment with styled elements
        matches.forEach((m) => {
          // Add text before match
          if (m.start > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, m.start)));
          }
          
          // Add styled element
          const span = document.createElement('span');
          span.className = m.type === 'hashtag' ? 'hashtag-inline' : 'mention-inline';
          span.textContent = m.text;
          fragment.appendChild(span);
          
          lastIndex = m.end;
        });
        
        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        
        // Replace text node with fragment
        if (fragment.childNodes.length > 0) {
          parent.replaceChild(fragment, textNode);
        }
      });
    };
    
    // Process after markdown renders
    const timer = setTimeout(() => {
      if (markdownContentRef.current) {
        processHashtagsAndMentions(markdownContentRef.current);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [displayContent, shouldRenderAgentContainer]);
  
  // Process content to add HTML spans for hashtags and mentions that will work with markdown
  const processedMarkdownContent = useMemo(() => {
    if (!displayContent) return displayContent;
    
    // Process hashtags and mentions to HTML spans that will be preserved in markdown
    let processed = displayContent.replace(
      /(?:^|\s)(#([a-zA-Z0-9_-]+))/g,
      (match, fullMatch, hashtag) => {
        const prefix = match.startsWith(' ') ? ' ' : '';
        // Use HTML entity for # to avoid markdown header parsing
        return `${prefix}<span class="hashtag-inline">#${hashtag}</span>`;
      }
    );
    
    // Replace mentions with styled spans
    processed = processed.replace(
      /@([a-zA-Z0-9_-]+)/g,
      (match, mention) => {
        return `<span class="mention-inline">@${mention}</span>`;
      }
    );
    
    return processed;
  }, [displayContent]);

  // Check if message contains image or video
  const hasImageOrVideo = shouldRenderAgentContainer && 
    (responseFormat === 'image' || responseFormat === 'video');

  // Get complexity for orchestrator messages
  const complexity = message.metadata?.complexity;
  const isOrchestrator = message.agentId === 'orchestrator' || message.agentType === 'orchestrator';
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
        let filename = `Gradian_Video_${videoUlid}.mp4`;
        
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
        <Avatar className="h-8 w-8 border rounded-full bg-violet-100 text-violet-800 shrink-0 border-gray-200 dark:border-gray-700">
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Action Buttons - Copy and Info (appear on hover, outside bubble) */}
        <AnimatePresence>
          {isHovered && (
            <div className={cn(
              'absolute top-2 z-10 flex flex-col items-center gap-1',
              isUser ? 'right-full mr-1' : 'left-full ml-1'
            )}>
              {rawContent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <CopyContent 
                    content={rawContent}
                    className="hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  />
                </motion.div>
              )}
              {/* Info icon for assistant messages with metadata */}
              {isAssistant && (message.metadata?.tokenUsage || message.metadata?.duration !== undefined || message.metadata?.cost !== undefined || message.metadata?.executionType) && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMetadataDialogOpen(true);
                  }}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    'hover:bg-gray-200 dark:hover:bg-gray-700',
                    'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500'
                  )}
                  title="View message metadata"
                  aria-label="View message metadata"
                >
                  <Info className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}
        </AnimatePresence>

        <div 
          dir="auto"
          className={cn(
            'rounded-2xl overflow-x-hidden relative',
            hasImageOrVideo ? 'p-0' : 'px-4 py-3',
            // Add extra padding-top for assistant messages with agent badge
            isAssistant && message.agentId && !hasImageOrVideo && 'pt-12',
            isUser
              ? 'bg-violet-600 dark:bg-violet-700 text-white rounded-tr-none'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
          )}
        >
          {/* Agent ID Badge - Top Start */}
          {isAssistant && message.agentId && (
            <div className={cn(
              'absolute top-2 left-2 z-10',
              hasImageOrVideo && 'top-2 left-2'
            )}>
              <Badge
                color="cyan"
                size="sm"
                className="cursor-default"
              >
                {message.agentId}
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
          ) : shouldRenderAgentContainer && parsedContent !== null ? (
            <div className="w-full text-sm leading-relaxed">
              {(() => {
                // Render based on response format, similar to DynamicAiAgentResponseContainer
                if (responseFormat === 'image') {
                  let imageData: any = null;
                  
                  // Try to extract image data from parsed content
                  if (typeof parsedContent === 'object' && parsedContent?.image) {
                    imageData = parsedContent.image;
                  } else if (typeof parsedContent === 'string' && (parsedContent.startsWith('{') || parsedContent.startsWith('['))) {
                    try {
                      const parsed = JSON.parse(parsedContent);
                      imageData = parsed?.image || null;
                    } catch (parseError) {
                      if (process.env.NODE_ENV === 'development') {
                        console.warn('Failed to parse image content:', parseError);
                      }
                    }
                  }
                  
                  // Ensure URL has proper format (add extension if missing for Gradian_Image_ files)
                  if (imageData?.url) {
                    // If URL is a Gradian_Image_ file without extension, add .png
                    if (imageData.url.includes('Gradian_Image_') && !imageData.url.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                      imageData.url = `${imageData.url}.png`;
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
                
                if (responseFormat === 'video') {
                  const videoData = typeof parsedContent === 'object' && parsedContent?.video
                    ? parsedContent.video
                    : typeof parsedContent === 'string' && (parsedContent.startsWith('{') || parsedContent.startsWith('['))
                    ? JSON.parse(parsedContent)?.video
                    : null;
                  
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
                
                if (responseFormat === 'table') {
                  // Parse table data
                  let tableData: any[] = [];
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
                        pageSize: 10,
                        showPageSizeSelector: true,
                        pageSizeOptions: [10, 25, 50, 100],
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
                
                if (responseFormat === 'string') {
                  return (
                    <MarkdownViewer 
                      content={typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent, null, 2)}
                      showToggle={false}
                      isEditable={false}
                      showEndLine={false}
                    />
                  );
                }
                
                // Default: render as code viewer for JSON or other formats
                return (
                  <CodeViewer
                    code={typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent, null, 2)}
                    programmingLanguage={responseFormat === 'json' ? 'json' : 'text'}
                    title={message.metadata?.todoTitle || 'AI Generated Content'}
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
                className="chat-message-content text-sm leading-relaxed"
              >
                <MarkdownViewer 
                  content={displayContent}
                  showToggle={false}
                  isEditable={false}
                  showEndLine={false}
                />
              </div>
              {isLongContent && (
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

        {/* Metadata */}
        {(message.createdAt || showComplexity) && (
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
              <span className="flex items-center gap-1" title={formatTime(message.createdAt)}>
                <Clock className="w-3 h-3" />
                {formatRelativeTime(message.createdAt)}
              </span>
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
    </motion.div>
  );
};

ChatMessage.displayName = 'ChatMessage';

