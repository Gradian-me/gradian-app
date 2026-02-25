'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput, Textarea, IconInput, Select, Switch } from '@/gradian-ui/form-builder/form-elements';
import { AiAgent } from '../../../types';

interface GeneralInfoTabProps {
  agent: AiAgent;
  onUpdate: (updates: Partial<AiAgent>) => void;
  readonly?: boolean;
}

export function GeneralInfoTab({ agent, onUpdate, readonly = false }: GeneralInfoTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <TextInput
            config={{ name: 'agent-id', label: 'Agent ID' }}
            value={agent.id}
            onChange={() => {}}
            disabled
            className="[&_input]:bg-gray-50"
          />
        </div>
        <div>
          <TextInput
            config={{ name: 'agent-label', label: 'Label', placeholder: 'e.g., App Builder' }}
            value={agent.label || ''}
            onChange={(value) => onUpdate({ label: value })}
            disabled={readonly}
            required
          />
        </div>
        <div>
          <IconInput
            config={{ name: 'agent-icon', label: 'Icon' }}
            value={agent.icon || ''}
            onChange={(value) => onUpdate({ icon: value })}
            disabled={readonly}
          />
        </div>
        <div>
          <Textarea
            config={{ name: 'agent-description', label: 'Description', placeholder: 'Describe what this AI agent does' }}
            value={agent.description || ''}
            onChange={(value) => onUpdate({ description: value })}
            rows={3}
            disabled={readonly}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TextInput
              config={{ name: 'agent-category', label: 'Category', placeholder: 'e.g., Pharmaceutical & Life Sciences' }}
              value={agent.category || ''}
              onChange={(value) => onUpdate({ category: value || undefined })}
              disabled={readonly}
            />
          </div>
          <div>
            <Select
              config={{ name: 'agent-type', label: 'Agent Type' }}
              options={[
                { value: 'chat', label: 'Chat' },
                { value: 'image-generation', label: 'Image Generation' },
                { value: 'voice-transcription', label: 'Voice Transcription' },
                { value: 'video-generation', label: 'Video Generation' },
                { value: 'graph-generation', label: 'Graph Generation' },
                { value: 'orchestrator', label: 'Orchestrator' },
                { value: 'search', label: 'Search' },
              ]}
              value={agent.agentType || 'chat'}
              onValueChange={(value) => onUpdate({ agentType: (value || 'chat') as AiAgent['agentType'] })}
              disabled={readonly}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              config={{ name: 'output-format', label: 'Output Format' }}
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'string', label: 'String' },
                { value: 'table', label: 'Table' },
                { value: 'search-results', label: 'Search Results' },
                { value: 'search-card', label: 'Search Card' },
              ]}
              value={agent.requiredOutputFormat || 'json'}
              onValueChange={(value) => onUpdate({ requiredOutputFormat: value as 'json' | 'string' | 'table' | 'search-results' | 'search-card' })}
              disabled={readonly}
            />
          </div>
          <div>
            <TextInput
              config={{ name: 'agent-model', label: 'Model', placeholder: 'e.g., gpt-4o-mini' }}
              value={agent.model || ''}
              onChange={(value) => onUpdate({ model: value })}
              disabled={readonly}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2">
            <Switch
              config={{ name: 'agent-stream', label: 'Stream responses' }}
              checked={agent.stream === true}
              onChange={(checked) => onUpdate({ stream: checked ? true : undefined })}
              disabled={readonly}
            />
            <span className="text-sm text-muted-foreground">When on, chat agent responses are streamed to the client.</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              config={{ name: 'agent-show-in-menu', label: 'Show in agent menu' }}
              checked={agent.showInAgentMenu !== false}
              onChange={(checked) => onUpdate({ showInAgentMenu: checked })}
              disabled={readonly}
            />
            <span className="text-sm text-muted-foreground">When on, this agent appears in the agent selector (default: true).</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

