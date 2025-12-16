'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput, Textarea, IconInput, Switch, PickerInput } from '@/gradian-ui/form-builder/form-elements';
import { Select as FormSelect } from '@/gradian-ui/form-builder/form-elements';
import { FormSchema } from '../types/form-schema';

interface GeneralInfoTabProps {
  schema: FormSchema;
  onUpdate: (updates: Partial<FormSchema>) => void;
  readonly?: boolean;
}

export function GeneralInfoTab({ schema, onUpdate, readonly = false }: GeneralInfoTabProps) {
  const schemaType = schema.schemaType ?? (schema.isSystemSchema ? 'system' : 'business');
  const relatedTenantsDisplay = Array.isArray(schema.relatedTenants)
    ? schema.relatedTenants.map((item: any) => {
        if (!item) return item;
        if (typeof item === 'string') return { id: item, label: item };
        const label =
          item.label ||
          item.displayName ||
          item.name ||
          item.title ||
          item.tenantName ||
          item.companyName ||
          item.code ||
          `${item.id ?? ''}`.trim();
        return {
          ...item,
          id: `${item.id ?? item.value ?? ''}`,
          label: label || `${item.id ?? ''}`,
        };
      })
    : schema.relatedTenants;
  return (
    <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 overflow-visible">
      <CardHeader>
        <CardTitle>Schema Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <FormSelect
              config={{ name: 'schema-type', label: 'Schema Type' }}
              value={schema.schemaType || (schema.isSystemSchema ? 'system' : 'business')}
              onValueChange={(value: 'system' | 'business' | 'action-form') =>
                onUpdate({
                  schemaType: value,
                  isSystemSchema: value === 'system' ? true : value === 'business' ? false : undefined,
                })
              }
              options={[
                { id: 'system', label: 'System' },
                { id: 'business', label: 'Business' },
                { id: 'action-form', label: 'Action Form' },
              ]}
            disabled={readonly}
          />
          </div>
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
        <div>
          <Textarea
            config={{ name: 'schema-description', label: 'Description' }}
            value={schema.description || ''}
            onChange={(value) => onUpdate({ description: value })}
            rows={3}
            disabled={readonly}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 items-center">
        <IconInput
          config={{ name: 'schema-icon', label: 'Icon' }}
          value={schema.icon || ''}
          onChange={(value) => onUpdate({ icon: value })}
          disabled={readonly}
        />
          <Switch
            config={{ name: 'inactive-schema', label: 'Inactive' }}
            value={schema.inactive || false}
            onChange={(checked: boolean) => onUpdate({ inactive: checked })}
            disabled={readonly}
          />
          <Switch
            config={{ name: 'show-in-navigation', label: 'Show in Navigation' }}
            value={schema.showInNavigation || false}
            onChange={(checked: boolean) => onUpdate({ showInNavigation: checked })}
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
            config={{
              name: 'allow-data-related-tenants',
              label: 'Allow Data Related Tenants',
              description: 'Allow linking records of this schema to multiple tenants in System Section',
            }}
            value={schema.allowDataRelatedTenants || false}
            onChange={(checked: boolean) => onUpdate({ allowDataRelatedTenants: checked })}
            disabled={readonly}
          />
        </div>
        <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
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
              config={{ name: 'allow-data-assigned-to', label: 'Allow Assigned To' }}
              value={schema.allowDataAssignedTo || false}
              onChange={(checked: boolean) => onUpdate({ allowDataAssignedTo: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-due-date', label: 'Allow Due Date' }}
              value={schema.allowDataDueDate || false}
              onChange={(checked: boolean) => onUpdate({ allowDataDueDate: checked })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PickerInput
            config={{
              name: 'status-group',
              label: 'Status Group',
              description: 'Select a status group to enable selection on this schema.',
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
          <PickerInput
            config={{
              name: 'entity-type-group',
              label: 'Entity Type Group',
              description: 'Select an entity type group to enable selection on this schema.',
              targetSchema: 'entity-type-groups',
              metadata: {
                allowMultiselect: false,
              },
            }}
            value={schema.entityTypeGroup || []}
            onChange={(selections) => {
              onUpdate({ entityTypeGroup: selections && selections.length > 0 ? selections : undefined });
            }}
            disabled={readonly}
          />
        </div>
        <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Tenant Scope</h3>
          <div className="space-y-4">
            <Switch
              config={{
                name: 'apply-to-all-tenants',
                label: 'Apply to All Tenants',
                description: 'When enabled, schema applies to every tenant and no tenant selection is required.',
              }}
              value={schema.applyToAllTenants || false}
              onChange={(checked: boolean) =>
                onUpdate({
                  applyToAllTenants: checked,
                  relatedTenants: checked ? undefined : schema.relatedTenants,
                })
              }
              disabled={readonly}
            />
            {!schema.applyToAllTenants && (
              <PickerInput
                config={{
                  name: 'related-tenants',
                  label: 'Related Tenants',
                  description: 'Select tenants using the popup picker',
                  targetSchema: 'tenants',
                  metadata: {
                    allowMultiselect: true,
                  },
                }}
                value={relatedTenantsDisplay || []}
                onChange={(value) => {
                  const normalizedValue = Array.isArray(value)
                    ? value
                        .map((item: any) => {
                          if (!item) return undefined;
                          if (typeof item === 'string') {
                            return { id: item, label: item };
                          }
                          if (item?.id) {
                            const label =
                              item.label ||
                              item.displayName ||
                              item.name ||
                              item.title ||
                              item.tenantName ||
                              item.companyName ||
                              item.code ||
                              `${item.id}`;
                            return {
                              id: `${item.id}`,
                              label,
                              color: item.color,
                              icon: item.icon,
                            };
                          }
                          return undefined;
                        })
                        .filter(Boolean)
                    : [];
                  onUpdate({
                    relatedTenants: normalizedValue.length > 0 ? (normalizedValue as any) : undefined,
                  });
                }}
                disabled={readonly}
              />
            )}
            <FormSelect
              config={{
                name: 'sync-strategy',
                label: 'Sync Strategy',
                description: 'Choose how to sync the schema to databases',
              }}
              value={schema.syncStrategy || 'schema-only'}
              onValueChange={(value: 'schema-only' | 'schema-and-data') =>
                onUpdate({ syncStrategy: value })
              }
              options={[
                { id: 'schema-only', label: 'Sync Schema Only' },
                { id: 'schema-and-data', label: 'Sync Schema and Data' },
              ]}
              disabled={readonly}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

