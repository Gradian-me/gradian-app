'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea, ListInput } from '@/gradian-ui/form-builder/form-elements';
import { AiAgent } from '../../../types';

interface SystemPromptTabProps {
  agent: AiAgent;
  onUpdate: (updates: Partial<AiAgent>) => void;
  readonly?: boolean;
}

export function SystemPromptTab({ agent, onUpdate, readonly = false }: SystemPromptTabProps) {
  const loadingTextSwitches = agent.loadingTextSwitches 
    ? (Array.isArray(agent.loadingTextSwitches) ? agent.loadingTextSwitches : [agent.loadingTextSwitches])
    : [];

  const handleLoadingTextSwitchesChange = (items: Array<{ id: string; label: string }>) => {
    const switches = items.map(item => item.label || item.id);
    onUpdate({ loadingTextSwitches: switches.length > 0 ? switches : undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Prompt & Loading Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            config={{ 
              name: 'system-prompt', 
              label: 'System Prompt',
              placeholder: 'Enter the system prompt for the AI agent...'
            }}
            value={agent.systemPrompt || ''}
            onChange={(value) => onUpdate({ systemPrompt: value || undefined })}
            rows={12}
            disabled={readonly}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            The system prompt defines the AI agent's behavior, capabilities, and instructions.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loading Text Switches
          </label>
          <ListInput
            placeholder="Add loading message..."
            addButtonText="Add Loading Message"
            value={loadingTextSwitches.map((text, index) => ({
              id: `loading-${index}`,
              label: text,
            }))}
            onChange={handleLoadingTextSwitchesChange}
            disabled={readonly}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Messages displayed during AI processing. These will cycle through during the generation process.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

