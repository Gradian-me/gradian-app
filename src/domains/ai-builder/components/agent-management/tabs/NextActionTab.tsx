'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput, IconInput } from '@/gradian-ui/form-builder/form-elements';
import { AiAgent } from '../../../types';

interface NextActionTabProps {
  agent: AiAgent;
  onUpdate: (updates: Partial<AiAgent>) => void;
  readonly?: boolean;
}

export function NextActionTab({ agent, onUpdate, readonly = false }: NextActionTabProps) {
  const nextAction = agent.nextAction || { label: '', route: '' };

  const updateNextAction = (updates: Partial<typeof nextAction>) => {
    onUpdate({
      nextAction: {
        ...nextAction,
        ...updates,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Action</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <TextInput
            config={{ name: 'next-action-label', label: 'Label', placeholder: 'e.g., Approve Response' }}
            value={nextAction.label || ''}
            onChange={(value) => updateNextAction({ label: value })}
            disabled={readonly}
          />
        </div>
        <div>
          <IconInput
            config={{ name: 'next-action-icon', label: 'Icon' }}
            value={nextAction.icon || ''}
            onChange={(value) => updateNextAction({ icon: value })}
            disabled={readonly}
          />
        </div>
        <div>
          <TextInput
            config={{ name: 'next-action-route', label: 'Route', placeholder: 'e.g., /api/schemas' }}
            value={nextAction.route || ''}
            onChange={(value) => updateNextAction({ route: value })}
            disabled={readonly}
          />
        </div>
      </CardContent>
    </Card>
  );
}

