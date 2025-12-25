'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextInput, Textarea, Select } from '@/gradian-ui/form-builder/form-elements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBox } from '@/gradian-ui/layout/message-box';
import { AiAgent } from '../../types';

interface CreateAiAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (agent: Omit<AiAgent, 'id'> & { id: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const INITIAL_FORM_STATE = {
  id: '',
  label: '',
  icon: 'Sparkles',
  description: '',
  requiredOutputFormat: 'json' as 'json' | 'string' | 'table' | 'search-results' | 'search-card',
  model: 'gpt-4o-mini',
  systemPrompt: '',
  loadingTextSwitches: [] as string[],
  renderComponents: [] as any[],
  preloadRoutes: [] as any[],
  nextAction: {
    label: 'Continue',
    icon: 'ArrowRight',
    route: '/',
  },
};

export function CreateAiAgentDialog({ open, onOpenChange, onSubmit }: CreateAiAgentDialogProps) {
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorResult, setErrorResult] = useState<{ success: boolean; error?: string; message?: string } | null>(null);

  const resetForm = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setIsSubmitting(false);
    setErrorResult(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleIdChange = (value: string) => {
    // Convert to lowercase and replace spaces with hyphens
    const normalizedId = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormState(prev => ({ ...prev, id: normalizedId }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!formState.id || !formState.label) {
      setErrorResult({ success: false, error: 'ID and Label are required' });
      return;
    }

    setIsSubmitting(true);
    setErrorResult(null);
    
    const result = await onSubmit(formState as Omit<AiAgent, 'id'> & { id: string });

    if (result.success) {
      onOpenChange(false);
    } else {
      setErrorResult(result);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Create New AI Agent</DialogTitle>
          <DialogDescription>
            Add a new AI agent to configure AI-powered features
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 py-4 pe-4">
            {errorResult && errorResult.error && (
              <MessageBox
                message={errorResult.error}
                variant="error"
                dismissible
                onDismiss={() => setErrorResult(null)}
              />
            )}
            <div>
              <TextInput
                config={{ 
                  name: 'agent-id', 
                  label: 'Agent ID',
                  placeholder: 'e.g., app-builder'
                }}
                value={formState.id}
                onChange={handleIdChange}
                required={true}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lowercase, hyphens only. Cannot be changed later.
              </p>
            </div>
            <div>
              <TextInput
                config={{ 
                  name: 'agent-label', 
                  label: 'Label',
                  placeholder: 'e.g., App Builder'
                }}
                value={formState.label}
                onChange={(value) => setFormState(prev => ({ ...prev, label: value }))}
                required={true}
              />
            </div>
            <div>
              <TextInput
                config={{ 
                  name: 'agent-icon', 
                  label: 'Icon',
                  placeholder: 'e.g., Sparkles'
                }}
                value={formState.icon}
                onChange={(value) => setFormState(prev => ({ ...prev, icon: value }))}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lucide icon name
              </p>
            </div>
            <div>
              <Textarea
                config={{ 
                  name: 'agent-description', 
                  label: 'Description',
                  placeholder: 'Describe what this AI agent does'
                }}
                value={formState.description}
                onChange={(value) => setFormState(prev => ({ ...prev, description: value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  config={{ 
                    name: 'output-format', 
                    label: 'Output Format',
                  }}
                  options={[
                    { value: 'json', label: 'JSON' },
                    { value: 'string', label: 'String' },
                    { value: 'table', label: 'Table' },
                    { value: 'search-results', label: 'Search Results' },
                    { value: 'search-card', label: 'Search Card' },
                  ]}
                  value={formState.requiredOutputFormat}
                  onValueChange={(value) => setFormState(prev => ({ ...prev, requiredOutputFormat: value as 'json' | 'string' | 'table' | 'search-results' | 'search-card' }))}
                />
              </div>
              <div>
                <TextInput
                  config={{ 
                    name: 'agent-model', 
                    label: 'Model',
                    placeholder: 'e.g., gpt-4o-mini'
                  }}
                  value={formState.model}
                  onChange={(value) => setFormState(prev => ({ ...prev, model: value }))}
                />
              </div>
            </div>
            <div>
              <Textarea
                config={{ 
                  name: 'system-prompt', 
                  label: 'System Prompt',
                  placeholder: 'System prompt for the AI agent'
                }}
                value={formState.systemPrompt}
                onChange={(value) => setFormState(prev => ({ ...prev, systemPrompt: value }))}
                rows={4}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Plus className="h-4 w-4 me-2" />
            {isSubmitting ? 'Creating...' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

