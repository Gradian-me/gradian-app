'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput, Textarea, IconInput, Switch, Select, PickerInput } from '@/gradian-ui/form-builder/form-elements';
import { FormSchema } from '../types/form-schema';

interface GeneralInfoTabProps {
  schema: FormSchema;
  onUpdate: (updates: Partial<FormSchema>) => void;
  readonly?: boolean;
}

export function GeneralInfoTab({ schema, onUpdate, readonly = false }: GeneralInfoTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schema Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <TextInput
            config={{ name: 'schema-id', label: 'Schema ID' }}
            value={schema.id}
            onChange={() => {}}
            disabled
            className="[&_input]:bg-gray-50"
          />
        </div>
        <div>
          <Textarea
            config={{ name: 'schema-description', label: 'Description' }}
            value={schema.description || ''}
            onChange={(value) => onUpdate({ description: value })}
            rows={3}
            disabled={readonly}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TextInput
              config={{ name: 'singular-name', label: 'Singular Name' }}
              value={schema.singular_name || ''}
              onChange={(value) => onUpdate({ singular_name: value })}
              disabled={readonly}
            />
          </div>
          <div>
            <TextInput
              config={{ name: 'plural-name', label: 'Plural Name' }}
              value={schema.plural_name || ''}
              onChange={(value) => onUpdate({ plural_name: value })}
              disabled={readonly}
            />
          </div>
        </div>
        <IconInput
          config={{ name: 'schema-icon', label: 'Icon' }}
          value={schema.icon || ''}
          onChange={(value) => onUpdate({ icon: value })}
          disabled={readonly}
        />
        <div className="grid grid-cols-2 gap-4">
          <Switch
            config={{ name: 'show-in-navigation', label: 'Show in Navigation' }}
            value={schema.showInNavigation || false}
            onChange={(checked: boolean) => onUpdate({ showInNavigation: checked })}
            disabled={readonly}
          />
          <Switch
            config={{ name: 'is-system-schema', label: 'Is System Schema' }}
            value={schema.isSystemSchema || false}
            onChange={(checked: boolean) => onUpdate({ isSystemSchema: checked })}
            disabled={readonly}
          />
          <Switch
            config={{ name: 'is-not-company-based', label: 'Is Not Company Based' }}
            value={schema.isNotCompanyBased || false}
            onChange={(checked: boolean) => onUpdate({ isNotCompanyBased: checked })}
            disabled={readonly}
          />
          <Switch
            config={{
              name: 'can-select-multi-companies',
              label: 'Can Select Multi Companies',
              description: 'Allow linking records of this schema to multiple companies in System Section',
            }}
            value={schema.canSelectMultiCompanies || false}
            onChange={(checked: boolean) => onUpdate({ canSelectMultiCompanies: checked })}
            disabled={readonly}
          />
          <Switch
            config={{ name: 'inactive-schema', label: 'Inactive' }}
            value={schema.inactive || false}
            onChange={(checked: boolean) => onUpdate({ inactive: checked })}
            disabled={readonly}
          />
        </div>
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Data Management Options</h3>
          <div className="grid grid-cols-2 gap-4">
            <Switch
              config={{ name: 'allow-data-inactive', label: 'Allow Data Inactive' }}
              value={schema.allowDataInactive || false}
              onChange={(checked: boolean) => onUpdate({ allowDataInactive: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-force', label: 'Allow Data Force' }}
              value={schema.allowDataForce || false}
              onChange={(checked: boolean) => onUpdate({ allowDataForce: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-hard-delete', label: 'Allow Data Hard Delete' }}
              value={schema.allowDataHardDelete || false}
              onChange={(checked: boolean) => onUpdate({ allowDataHardDelete: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-hierarchical-parent', label: 'Allow Hierarchical Parent' }}
              value={schema.allowHierarchicalParent || false}
              onChange={(checked: boolean) => onUpdate({ allowHierarchicalParent: checked })}
              disabled={readonly}
            />
          </div>
        </div>
        <div>
          <PickerInput
            config={{
              name: 'status-group',
              label: 'Status Group',
              description: 'Select a status group to enable status selection for this schema.',
              targetSchema: 'status-groups',
              metadata: {
                allowMultiselect: false,
              },
            }}
            value={schema.statusGroup || []}
            onChange={(selections) => {
              onUpdate({ statusGroup: selections && selections.length > 0 ? selections : undefined });
            }}
            disabled={readonly}
          />
        </div>
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Server Sync Options</h3>
          <div className="space-y-4">
            <div>
              <PickerInput
                config={{
                  name: 'sync-to-databases',
                  label: 'Sync To Servers',
                  description: 'Select servers to sync this schema to',
                  targetSchema: 'servers',
                  metadata: {
                    allowMultiselect: true,
                  },
                }}
                value={schema.syncToDatabases || []}
                onChange={(value) => {
                  // Normalize value to array of IDs
                  const normalizedValue = Array.isArray(value) 
                    ? value.map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item?.id) return item.id;
                        return item;
                      })
                    : [];
                  onUpdate({ syncToDatabases: normalizedValue.length > 0 ? normalizedValue : undefined });
                }}
                disabled={readonly}
              />
            </div>
            <div>
              <Select
                config={{
                  name: 'sync-strategy',
                  label: 'Sync Strategy',
                  description: 'Choose how to sync the schema to databases',
                }}
                value={schema.syncStrategy || 'schema-only'}
                onValueChange={(value) => onUpdate({ syncStrategy: value as 'schema-only' | 'schema-and-data' })}
                options={[
                  { value: 'schema-only', label: 'Sync Schema Only' },
                  { value: 'schema-and-data', label: 'Sync Schema and Data' },
                ]}
                disabled={readonly}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

