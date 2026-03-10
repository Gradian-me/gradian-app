'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextInput, Textarea, IconInput, Select, Switch, useOptionsFromUrl } from '@/gradian-ui/form-builder/form-elements';
import { PickerInput } from '@/gradian-ui/form-builder/form-elements/components/PickerInput';
import { buildReferenceFilterUrl } from '@/gradian-ui/form-builder/utils/reference-filter-builder';
import { AiAgent } from '../../../types';

interface GeneralInfoTabProps {
  agent: AiAgent;
  onUpdate: (updates: Partial<AiAgent>) => void;
  readonly?: boolean;
}

export function GeneralInfoTab({ agent, onUpdate, readonly = false }: GeneralInfoTabProps) {
  const entityTypeSourceUrl = useMemo(
    () =>
      buildReferenceFilterUrl({
        referenceSchema: 'entity-type-groups',
        referenceRelationTypeId: 'HAS_ENTITY_TYPE_ITEM',
        referenceEntityId: '01KAIGROUPAITYPES0000000001',
        targetSchema: 'entity-type-items',
      }),
    [],
  );

  const { options: entityTypeOptions } = useOptionsFromUrl({
    sourceUrl: entityTypeSourceUrl,
    transform: (groups: any[]) => {
      if (!Array.isArray(groups)) return [];
      const items: any[] = [];
      for (const group of groups) {
        if (Array.isArray(group?.data)) {
          items.push(...group.data);
        }
      }
      return items;
    },
  });

  const entityTypeSelectOptions = useMemo(
    () =>
      entityTypeOptions
        .map((opt: any) => ({
          value: opt.id,
          label: opt.label ?? opt.id,
          icon: opt.icon,
          color: opt.color,
        }))
        .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)),
    [entityTypeOptions],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Agent Name + Agent ID (both colspan 1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TextInput
              config={{ name: 'agent-label', label: 'Agent Name', placeholder: 'e.g., App Builder' }}
              value={agent.label || ''}
              onChange={(value) => onUpdate({ label: value })}
              disabled={readonly}
              required
            />
          </div>
          <div>
            <TextInput
              config={{ name: 'agent-id', label: 'Agent ID' }}
              value={agent.id}
              onChange={() => {}}
              disabled
              className="[&_input]:bg-gray-50"
            />
          </div>
        </div>

        {/* Row 2: Icon + Agent Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <IconInput
              config={{ name: 'agent-icon', label: 'Icon' }}
              value={agent.icon || ''}
              onChange={(value) => onUpdate({ icon: value })}
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

        {/* Row 3: Entity Type + Related Tenants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              config={{
                name: 'agent-entity-type',
                label: 'Entity Type',
                placeholder: 'Select entity type',
                helperText: 'Entity type used for grouping and filtering AI agents.',
              }}
              options={entityTypeSelectOptions}
              value={agent.entityType?.id || ''}
              onValueChange={(value) => {
                const selected = entityTypeSelectOptions.find((opt) => opt.value === value);
                onUpdate(
                  value
                    ? {
                        entityType: {
                          id: value,
                          label: selected?.label || value,
                        },
                      }
                    : {
                        entityType: undefined,
                      },
                );
              }}
              disabled={readonly || entityTypeSelectOptions.length === 0}
            />
          </div>
          <div>
            <PickerInput
              config={{
                name: 'related-tenants',
                label: 'Related Tenants',
                sectionId: 'system-section',
                component: 'picker',
                targetSchema: 'tenants',
                metadata: {
                  allowMultiselect: true,
                },
                helperText: 'When set, this agent will typically be shown only for these tenants.',
              }}
              value={Array.isArray(agent.relatedTenants) ? agent.relatedTenants : []}
              onChange={(value) => {
                const relatedTenants = Array.isArray(value)
                  ? value.map((v: any) => ({
                      id: String(v.id),
                      label: v.label ?? v.metadata?.label ?? v.id,
                    }))
                  : [];
                onUpdate({ relatedTenants });
              }}
              disabled={readonly}
            />
          </div>
        </div>

        {/* Row 4: Model + Output Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              config={{
                name: 'agent-model',
                label: 'Model',
                placeholder: 'Select a model',
                helperText: 'Models are loaded from /api/ai-models',
              }}
              sourceUrl="/api/ai-models"
              transform={(data: any) => {
                if (!Array.isArray(data)) return [];
                return data.map((m: any) => ({
                  id: m.id,
                  label: m.label ?? m.id,
                  value: m.id,
                }));
              }}
              value={agent.model || ''}
              onValueChange={(value) => onUpdate({ model: value || undefined })}
              disabled={readonly}
            />
          </div>
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
              onValueChange={(value) =>
                onUpdate({
                  requiredOutputFormat: value as
                    | 'json'
                    | 'string'
                    | 'table'
                    | 'search-results'
                    | 'search-card',
                })
              }
              disabled={readonly}
            />
          </div>
        </div>

        {/* Row 5: Stream + Show in menu */}
        <div className="flex flex-wrap gap-6 items-start">
          <div className="flex flex-col gap-1">
            <Switch
              config={{
                name: 'agent-stream',
                label: 'Stream responses',
                placeholder: 'When on, chat agent responses are streamed to the client.',
              }}
              checked={agent.stream === true}
              onChange={(checked) => onUpdate({ stream: checked ? true : undefined })}
              disabled={readonly}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Switch
              config={{
                name: 'agent-show-in-menu',
                label: 'Show in agent menu',
                placeholder:
                  'When on, this agent appears in the agent selector (default: true).',
              }}
              checked={agent.showInAgentMenu !== false}
              onChange={(checked) => onUpdate({ showInAgentMenu: checked })}
              disabled={readonly}
            />
          </div>
        </div>

        {/* Row 6: Description at the end */}
        <div>
          <Textarea
            config={{
              name: 'agent-description',
              label: 'Description',
              placeholder: 'Describe what this AI agent does',
            }}
            value={agent.description || ''}
            onChange={(value) => onUpdate({ description: value })}
            rows={3}
            disabled={readonly}
          />
        </div>
      </CardContent>
    </Card>
  );
}

