// Chat Input Component
// Secure textarea-based input with voice and professional writing support

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ArrowUp, Paperclip, X, Sparkles, Square, Mic, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAiAgents } from '@/domains/ai-builder';
import { VoiceInputDialog } from '@/gradian-ui/communication/voice/components/VoiceInputDialog';
import { ProfessionalWritingModal } from '@/gradian-ui/communication/professional-writing/components/ProfessionalWritingModal';
import type { AiAgent } from '@/domains/ai-builder/types';

export interface ChatInputProps {
  onSend: (content: string, agentId?: string) => void;
  onStop?: () => void;
  selectedAgentId?: string | null;
  isLoading?: boolean;
  isActive?: boolean; // True when thinking or executing
  focusTrigger?: number; // Increment to programmatically focus input
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  selectedAgentId,
  isLoading = false,
  isActive = false,
  focusTrigger,
  className,
}) => {
  const [value, setValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Find selected agent
  useEffect(() => {
    if (selectedAgentId && Array.isArray(aiAgents)) {
      const agent = aiAgents.find((a) => a.id === selectedAgentId);
      setSelectedAgent(agent || null);
    } else {
      setSelectedAgent(null);
    }
  }, [selectedAgentId, aiAgents]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 72), 300);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Programmatic focus trigger (used after creating a new chat).
  useEffect(() => {
    if (focusTrigger === undefined) return;
    const id = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [focusTrigger]);

  // Handle voice input transcript
  const handleVoiceTranscript = useCallback((text: string) => {
    setValue((prev) => {
      const newValue = prev ? `${prev} ${text}` : text;
      return newValue;
      });
  }, []);

  // Handle voice input apply
  const handleVoiceApply = useCallback((text: string) => {
    setValue((prev) => {
      const newValue = prev ? `${prev} ${text}` : text;
      return newValue;
    });
    setIsVoiceDialogOpen(false);
  }, []);

  // Handle professional writing apply
  const handleWritingApply = useCallback((enhancedText: string) => {
    setValue(enhancedText);
    setIsWritingModalOpen(false);
    // Focus textarea after applying
      setTimeout(() => {
      textareaRef.current?.focus();
      }, 0);
  }, []);

  // Extract agent ID from @mention in message (for backward compatibility)
  const extractAgentFromMessage = (message: string): string | undefined => {
    const mentionMatch = message.match(/@(\w+)/);
    return mentionMatch ? mentionMatch[1] : undefined;
  };

  const handleSend = async () => {
    const content = value.trim();
    if (!content || isLoading) return;

    // Use orchestrator if auto switch is enabled, otherwise use selected agent or mentioned agent
    const extractedAgent = extractAgentFromMessage(content);
    const agentId = extractedAgent || (autoSwitch ? undefined : selectedAgent?.id);
    const mentionedAgentId: string | undefined = agentId ?? undefined;
    
    // Clear input first for better UX
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '72px';
    }
    
    // Then send the message
    try {
      await onSend(content, mentionedAgentId);
    } catch (error) {
      // If send fails, restore the content
      console.error('Failed to send message:', error);
      setValue(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends message, Shift+Enter creates a new line.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !isActive) {
        handleSend();
      }
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

  return (
    <div className={cn('w-full relative', className)}>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <div className="relative flex flex-col">
            {/* Textarea Container */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading || isActive}
                className={cn(
                  'w-full rounded-xl rounded-b-none px-4 py-3',
                  'bg-white dark:bg-gray-800/50 border-none',
                  'text-gray-900 dark:text-gray-100 text-sm',
                  'resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none',
                  'min-h-[72px] max-h-[300px]',
                  'overflow-y-auto',
                  (isLoading || isActive) && 'opacity-50 cursor-not-allowed'
                )}
                dir="auto"
                rows={3}
              />
            </div>

            {/* Bottom Bar */}
            <div className="h-14 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex items-center border-t border-gray-200 dark:border-gray-700">
              <div className="absolute left-3 right-3 flex items-center justify-between w-[calc(100%-24px)]">
                {/* Left Side - Agent Selector & Tools */}
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

                  {/* Agent Selector */}
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

                  {/* Voice Input Button */}
                  <Button
                    onClick={() => setIsVoiceDialogOpen(true)}
                    variant="square"
                    size="sm"
                    disabled={isLoading || isActive}
                    className={cn(
                      'h-10 w-10',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    aria-label="Voice input"
                    title="Voice input"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>

                  {/* Attachment Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    disabled={isLoading || isActive}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="square"
                    size="sm"
                    disabled={isLoading || isActive}
                    className={cn(
                      'h-10 w-10',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    aria-label="Attach file"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4 block transition-colors" />
                  </Button>

                  {/* Professional Writing Button */}
                  <Button
                    onClick={() => setIsWritingModalOpen(true)}
                    variant="square"
                    size="sm"
                    disabled={isLoading || isActive || !value.trim()}
                    className={cn(
                      'h-10 w-10',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    aria-label="Professional writing"
                    title="Enhance text with AI"
                  >
                    <PenTool className="w-4 h-4" />
                  </Button>
                </div>

                {/* Right Side - Send/Stop Button */}
                {isActive && onStop ? (
                  <Button
                    dir="auto"
                    variant="square"
                    size="sm"
                    className={cn(
                      'relative h-10 w-10',
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
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="squareGradient"
                    size="sm"
                    className={cn(
                      'h-10 w-10',
                      'disabled:opacity-30 disabled:cursor-not-allowed',
                      'text-white'
                    )}
                    aria-label="Send message"
                    disabled={isLoading || isActive || !value.trim()}
                    onClick={handleSend}
                  >
                    <ArrowUp
                      className={cn(
                        'w-4 h-4 transition-opacity duration-200',
                        value.trim() ? 'opacity-100' : 'opacity-50'
                      )}
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Input Dialog */}
      <VoiceInputDialog
        isOpen={isVoiceDialogOpen}
        onOpenChange={setIsVoiceDialogOpen}
        onTranscript={handleVoiceTranscript}
        onApply={handleVoiceApply}
      />

      {/* Professional Writing Modal */}
      <ProfessionalWritingModal
        isOpen={isWritingModalOpen}
        onOpenChange={setIsWritingModalOpen}
        initialText={value}
        onApply={handleWritingApply}
      />
    </div>
  );
};

ChatInput.displayName = 'ChatInput';
