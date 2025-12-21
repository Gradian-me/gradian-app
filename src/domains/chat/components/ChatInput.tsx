// Chat Input Component
// Enhanced input with agent selection, @mention support, and Gradian UI integration

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ArrowUp, Paperclip, X, Sparkles, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Switch } from '@/components/ui/switch';
import { useAiAgents } from '@/domains/ai-builder';
import { MentionCommand } from './MentionCommand';
import { processTextWithStyledHashtagsAndMentions, processTextWithMarkdownHashtagsAndMentions } from '../utils/text-utils';
import type { AiAgent } from '@/domains/ai-builder/types';

export interface ChatInputProps {
  onSend: (content: string, agentId?: string) => void;
  onStop?: () => void;
  selectedAgentId?: string | null;
  isLoading?: boolean;
  isActive?: boolean; // True when thinking or executing
  className?: string;
}

interface UseAutoResizeContentEditableProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeContentEditable({
  minHeight,
  maxHeight,
}: UseAutoResizeContentEditableProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const element = contentEditableRef.current;
      if (!element) return;

      if (reset) {
        element.style.height = `${minHeight}px`;
        return;
      }

      element.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(
          element.scrollHeight,
          maxHeight ?? Number.POSITIVE_INFINITY
        )
      );
      element.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const element = contentEditableRef.current;
    if (element) {
      element.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return { contentEditableRef, adjustHeight };
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  selectedAgentId,
  isLoading = false,
  isActive = false,
  className,
}) => {
  const [value, setValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<number | null>(null);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const { contentEditableRef, adjustHeight } = useAutoResizeContentEditable({
    minHeight: 72,
    maxHeight: 300,
  });

  // Helper to get current content from element
  const getCurrentContent = useCallback(() => {
    const element = contentEditableRef.current;
    if (!element) return '';
    return (element.innerText || element.textContent || '').trim();
  }, [contentEditableRef]);

  const { agents: aiAgents, loading: isLoadingAgents } = useAiAgents({ summary: true });

  // Ensure aiAgents is an array
  const agentsList = Array.isArray(aiAgents) ? aiAgents : [];

  // Prepare options for Select component
  const agentOptions = useMemo(() => {
    const options = [
      {
        id: '',
        label: 'Auto (Orchestrator)',
        icon: 'Sparkles',
      },
      ...agentsList.map((agent) => ({
        id: agent.id,
        label: agent.label,
        icon: agent.icon || 'Bot',
      })),
    ];
    return options;
  }, [agentsList]);

  // Note: Agent filtering is now handled by MentionCommand component

  // Find selected agent
  useEffect(() => {
    if (selectedAgentId && Array.isArray(aiAgents)) {
      const agent = aiAgents.find((a) => a.id === selectedAgentId);
      setSelectedAgent(agent || null);
    } else {
      setSelectedAgent(null);
    }
  }, [selectedAgentId, aiAgents]);

  // Debounce timer for styled content updates
  const styleUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle input change for contentEditable
  const handleInputChange = useCallback(() => {
    const element = contentEditableRef.current;
    if (!element) return;

    // Get plain text BEFORE any styling - innerText strips HTML tags
    // This ensures we always have the actual text content
    const plainText = element.innerText || element.textContent || '';
    setValue(plainText);
    adjustHeight();

    // Get cursor position before updating - use textContent for accurate position
    const selection = window.getSelection();
    let cursorPos = 0;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      cursorPos = preCaretRange.toString().length;
    }

    // Detect @mention for menu IMMEDIATELY (before styling delay)
    const textBeforeCursor = plainText.substring(0, cursorPos);
    // Match @ followed by word characters (alphanumeric and underscore)
    // This will match @agent, @agent123, etc.
    const mentionMatch = textBeforeCursor.match(/@([\w-]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1] || '';
      setShowMentionMenu(true);
      setMentionQuery(query);
      setMentionPosition(cursorPos);
    } else {
      // Only close if we're not in the middle of typing a mention
      // Check if there's a space or newline after the last @
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      if (lastAtIndex === -1 || textBeforeCursor.substring(lastAtIndex).match(/@[\s\n]/)) {
        setShowMentionMenu(false);
        setMentionQuery('');
        setMentionPosition(null);
      }
    }

    // Clear previous timer
    if (styleUpdateTimerRef.current) {
      clearTimeout(styleUpdateTimerRef.current);
    }

    // Update styled content after a short delay to avoid cursor jumping
    // Use requestAnimationFrame to ensure we don't interfere with undo/redo
    styleUpdateTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        // SECURITY: processTextWithMarkdownHashtagsAndMentions escapes HTML to prevent XSS
        // The function escapes &, <, > before processing markdown, making innerHTML safe
        const styledContent = processTextWithMarkdownHashtagsAndMentions(plainText);
        if (element.innerHTML !== styledContent) {
          // Save current selection
          const currentSelection = window.getSelection();
          const currentRange = currentSelection?.rangeCount ? currentSelection.getRangeAt(0) : null;
          
          // SECURITY: innerHTML is safe here because:
          // 1. Content is sanitized by processTextWithMarkdownHashtagsAndMentions (escapes HTML)
          // 2. Only creates safe HTML tags: span, code, pre, strong, em, del, br
          // 3. User input is escaped before processing
          element.innerHTML = styledContent;
          
          // Restore cursor position
          if (currentSelection && currentRange) {
            try {
              const textNodes = getTextNodes(element);
              let offset = 0;
              let found = false;
              
              for (const node of textNodes) {
                const nodeLength = node.textContent?.length || 0;
                if (offset + nodeLength >= cursorPos) {
                  const newRange = document.createRange();
                  const pos = Math.min(cursorPos - offset, nodeLength);
                  newRange.setStart(node, pos);
                  newRange.setEnd(node, pos);
                  currentSelection.removeAllRanges();
                  currentSelection.addRange(newRange);
                  found = true;
                  break;
                }
                offset += nodeLength;
              }
              
              if (!found && textNodes.length > 0) {
                // Place at end
                const lastNode = textNodes[textNodes.length - 1];
                const newRange = document.createRange();
                newRange.setStart(lastNode, lastNode.textContent?.length || 0);
                newRange.setEnd(lastNode, lastNode.textContent?.length || 0);
                currentSelection.removeAllRanges();
                currentSelection.addRange(newRange);
              }
            } catch (e) {
              // Fallback: place cursor at end
              const range = document.createRange();
              range.selectNodeContents(element);
              range.collapse(false);
              currentSelection?.removeAllRanges();
              currentSelection?.addRange(range);
            }
          }
        }
      });
    }, 100); // Small delay to avoid cursor jumping
  }, [adjustHeight]);

  // Helper to get text nodes
  const getTextNodes = (node: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      null
    );
    let textNode;
    while ((textNode = walker.nextNode())) {
      textNodes.push(textNode as Text);
    }
    return textNodes;
  };

  // Helper to get cursor offset in text content
  const getCursorOffset = (element: HTMLElement): number => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  // Helper to restore cursor position
  const restoreCursorPosition = (element: HTMLElement, offset: number) => {
    const textNodes = getTextNodes(element);
    let currentOffset = 0;
    
    for (const node of textNodes) {
      const nodeLength = node.textContent?.length || 0;
      if (currentOffset + nodeLength >= offset) {
        const newRange = document.createRange();
        const pos = Math.min(offset - currentOffset, nodeLength);
        newRange.setStart(node, pos);
        newRange.setEnd(node, pos);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(newRange);
        return;
      }
      currentOffset += nodeLength;
    }
    
    // If not found, place at end
    if (textNodes.length > 0) {
      const lastNode = textNodes[textNodes.length - 1];
      const newRange = document.createRange();
      newRange.setStart(lastNode, lastNode.textContent?.length || 0);
      newRange.setEnd(lastNode, lastNode.textContent?.length || 0);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(newRange);
    }
  };

  // Insert @mention
  const insertMention = (agentId: string) => {
    if (mentionPosition === null || !contentEditableRef.current) return;

    const textBefore = value.substring(0, mentionPosition - mentionQuery.length - 1);
    const textAfter = value.substring(mentionPosition);
    const newValue = `${textBefore}@${agentId} ${textAfter}`;

    setValue(newValue);
    setShowMentionMenu(false);
    setMentionQuery('');
    setMentionPosition(null);
    
    // SECURITY: processTextWithMarkdownHashtagsAndMentions escapes HTML to prevent XSS
    // Update styled content
    const styledContent = processTextWithMarkdownHashtagsAndMentions(newValue);
    if (contentEditableRef.current) {
      // SECURITY: innerHTML is safe - content is sanitized (HTML escaped) before processing
      contentEditableRef.current.innerHTML = styledContent;
      adjustHeight();

      // Focus and set cursor position
      setTimeout(() => {
        contentEditableRef.current?.focus();
        const newPos = textBefore.length + agentId.length + 2; // +2 for @ and space
        const range = document.createRange();
        const selection = window.getSelection();
        const textNodes = getTextNodes(contentEditableRef.current!);
        let offset = 0;
        for (const node of textNodes) {
          const nodeLength = node.textContent?.length || 0;
          if (offset + nodeLength >= newPos) {
            range.setStart(node, newPos - offset);
            range.setEnd(node, newPos - offset);
            selection?.removeAllRanges();
            selection?.addRange(range);
            break;
          }
          offset += nodeLength;
        }
      }, 0);
    }
  };

  // Extract agent ID from @mention in message
  const extractAgentFromMessage = (message: string): string | undefined => {
    const mentionMatch = message.match(/@(\w+)/);
    return mentionMatch ? mentionMatch[1] : undefined;
  };

  const handleSend = async () => {
    // Clear any pending styling updates to prevent interference
    if (styleUpdateTimerRef.current) {
      clearTimeout(styleUpdateTimerRef.current);
      styleUpdateTimerRef.current = null;
    }
    
    // Get content - try element first, then fallback to state value
    const element = contentEditableRef.current;
    let content = '';
    
    if (element) {
      // Get plain text content - innerText strips HTML tags including styled hashtags/mentions
      content = (element.innerText || element.textContent || '').trim();
    }
    
    // Fallback to state value if element content is empty (shouldn't happen, but safety check)
    if (!content && value.trim()) {
      content = value.trim();
    }
    
    if (!content || isLoading) return;

    // Use orchestrator if auto switch is enabled, otherwise use selected agent or mentioned agent
    const extractedAgent = extractAgentFromMessage(content);
    const agentId = extractedAgent || (autoSwitch ? undefined : selectedAgent?.id);
    const mentionedAgentId: string | undefined = agentId ?? undefined;
    
    // Clear input first for better UX
    setValue('');
    setShowMentionMenu(false);
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = '';
      contentEditableRef.current.innerText = '';
    }
    adjustHeight(true);
    
    // Then send the message
    try {
      await onSend(content, mentionedAgentId);
    } catch (error) {
      // If send fails, restore the content
      console.error('Failed to send message:', error);
      setValue(content);
      if (contentEditableRef.current) {
        contentEditableRef.current.innerText = content;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Allow undo/redo (Ctrl+Z / Ctrl+Y or Cmd+Z / Cmd+Y on Mac)
    const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey;
    const isRedo = (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));
    
    if (isUndo || isRedo) {
      // Allow browser's native undo/redo to work
      return; // Don't prevent default
    }

    // Handle @ key to trigger mention menu immediately
    if (e.key === '@' || (e.key === '2' && e.shiftKey)) {
      // Trigger input change after @ is inserted
      setTimeout(() => {
        handleInputChange();
      }, 0);
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Get content directly from element to check if there's content
      const element = contentEditableRef.current;
      const content = element ? (element.innerText || element.textContent || '').trim() : '';
      
      if (content && !isLoading && !isActive) {
        handleSend();
        return;
      }
    }

    // Handle Shift+Enter for new lines
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const element = contentEditableRef.current;
      if (!element) return;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      // Insert a line break
      const br = document.createElement('br');
      range.deleteContents();
      range.insertNode(br);
      
      // Move cursor after the <br>
      range.setStartAfter(br);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Update the value from the element's text content (which includes newlines)
      const newText = element.innerText || element.textContent || '';
      setValue(newText);
      
      // SECURITY: processTextWithMarkdownHashtagsAndMentions escapes HTML to prevent XSS
      // Update styled content with the new text
      const styledContent = processTextWithMarkdownHashtagsAndMentions(newText);
      // Save cursor position before updating HTML
      const cursorOffset = getCursorOffset(element);
      // SECURITY: innerHTML is safe - content is sanitized (HTML escaped) before processing
      element.innerHTML = styledContent;
      
      // Restore cursor position
      setTimeout(() => {
        restoreCursorPosition(element, cursorOffset);
        adjustHeight();
      }, 0);
      
      return;
    }

    // Handle mention menu navigation and closing
    if (showMentionMenu) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        setMentionQuery('');
        setMentionPosition(null);
        return;
      }
      // Let Command component handle ArrowDown/ArrowUp/Enter for navigation
      // Don't prevent default here - Command will handle it
    }
  };

  const handleAgentChange = (agentId: string) => {
    if (agentId === '') {
      setSelectedAgent(null);
    } else {
      const agent = agentsList.find((a) => a.id === agentId);
      setSelectedAgent(agent || null);
    }
  };

  const handleClearAgent = () => {
    setSelectedAgent(null);
  };

  // When auto switch is enabled, clear selected agent
  useEffect(() => {
    if (autoSwitch) {
      setSelectedAgent(null);
    }
  }, [autoSwitch]);

  // When auto switch is enabled, clear selected agent
  useEffect(() => {
    if (autoSwitch) {
      setSelectedAgent(null);
    }
  }, [autoSwitch]);

  return (
    <div className={cn('w-full relative', className)}>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <div className="relative flex flex-col">
            {/* Textarea Container - with mention menu positioned above */}
            <div className="relative overflow-y-auto" style={{ maxHeight: '400px' }}>
              {/* @Mention Command - Using Command component */}
              <MentionCommand
                open={showMentionMenu}
                onOpenChange={setShowMentionMenu}
                onSelect={insertMention}
                query={mentionQuery}
              />
              <div
                ref={contentEditableRef}
                suppressContentEditableWarning
                onInput={handleInputChange}
                onKeyDown={handleKeyDown}
                data-placeholder="Type your message... Use @ to mention an agent or # for hashtags"
                dir="auto"
                className={cn(
                  'w-full rounded-xl rounded-b-none px-4 py-3',
                  'bg-white dark:bg-gray-800/50 border-none',
                  'text-gray-900 dark:text-gray-100 text-sm',
                  'resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none',
                  'min-h-[72px]',
                  'overflow-y-auto',
                  'chat-input-editable',
                  'cursor-text',
                  '[&:empty:before]:content-[attr(data-placeholder)]',
                  '[&:empty:before]:text-gray-500',
                  '[&:empty:before]:dark:text-gray-400',
                  (isLoading || isActive) && 'opacity-50 cursor-not-allowed'
                )}
                style={{ pointerEvents: (isLoading || isActive) ? 'none' : 'auto' }}
                contentEditable={!(isLoading || isActive)}
              />
            </div>

            {/* Bottom Bar */}
            <div className="h-14 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex items-center border-t border-gray-200 dark:border-gray-700">
              <div className="absolute left-3 right-3 flex items-center justify-between w-[calc(100%-24px)]">
                {/* Left Side - Agent Selector & Attachments */}
                <div className="flex items-center gap-2">
                  {/* Auto Switch */}
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={autoSwitch}
                      onCheckedChange={(checked) => setAutoSwitch(checked)}
                      disabled={isLoading || isActive}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Auto
                    </span>
                  </div>

                  {/* Agent Selector - Using Gradian UI Select */}
                  {!autoSwitch && (
                    <>
                      <div className="w-48 relative">
                        <Select
                          options={agentOptions}
                          value={selectedAgent?.id || ''}
                          onValueChange={handleAgentChange}
                          placeholder="Select Agent"
                          disabled={isLoading || isActive || isLoadingAgents}
                          size="sm"
                        />
                        {selectedAgent && (
                          <button
                            onClick={handleClearAgent}
                            disabled={isLoading || isActive}
                            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            title="Clear agent"
                            aria-label="Clear agent"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-0.5" />
                    </>
                  )}

                  {/* Attachment Button */}
                  <label
                    className={cn(
                      'rounded-lg p-2 bg-white dark:bg-gray-800/50 cursor-pointer',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'border border-gray-200 dark:border-gray-700',
                      'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
                      'transition-colors'
                    )}
                    aria-label="Attach file"
                  >
                    <input type="file" className="hidden" />
                    <Paperclip className="w-4 h-4 transition-colors" />
                  </label>
                </div>

                {/* Right Side - Send/Stop Button */}
                {isActive && onStop ? (
                  <button
                    type="button"
                    className={cn(
                      'rounded-full w-10 h-10 flex items-center justify-center shadow-sm relative',
                      'bg-white dark:bg-gray-800',
                      'border-2 border-gray-200 dark:border-gray-700',
                      'hover:bg-gray-50 dark:hover:bg-gray-700',
                      'focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-gray-500',
                      'text-gray-700 dark:text-gray-300',
                      'transition-all duration-200',
                      'overflow-visible'
                    )}
                    aria-label="Stop"
                    onClick={onStop}
                  >
                    {/* Spinning border animation */}
                    <div 
                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 dark:border-t-violet-400 animate-spin pointer-events-none" 
                      style={{ animationDuration: '2s' }}
                    />
                    <Square className="w-4 h-4 relative z-10 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      'rounded-full w-10 h-10 flex items-center justify-center shadow-sm',
                      'bg-gradient-to-r from-violet-600 to-purple-600',
                      'hover:from-violet-700 hover:to-purple-700',
                      'focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-violet-500',
                      'disabled:opacity-30 disabled:cursor-not-allowed',
                      'text-white',
                      'transition-all duration-200'
                    )}
                    aria-label="Send message"
                    disabled={isLoading || isActive || !getCurrentContent()}
                    onClick={handleSend}
                  >
                    <ArrowUp
                      className={cn(
                        'w-4 h-4 transition-opacity duration-200',
                        getCurrentContent() ? 'opacity-100' : 'opacity-50'
                      )}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ChatInput.displayName = 'ChatInput';

