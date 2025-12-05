'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput, Textarea, IconInput, Select } from '@/gradian-ui/form-builder/form-elements';
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
            <Select
              config={{ name: 'output-format', label: 'Output Format' }}
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'string', label: 'String' },
                { value: 'table', label: 'Table' },
              ]}
              value={agent.requiredOutputFormat || 'json'}
              onValueChange={(value) => onUpdate({ requiredOutputFormat: value as 'json' | 'string' | 'table' })}
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
      </CardContent>
    </Card>
  );
}

