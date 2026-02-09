'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput, Textarea, IconInput, Switch, PickerInput } from '@/gradian-ui/form-builder/form-elements';
import { Select as FormSelect } from '@/gradian-ui/form-builder/form-elements';
import { FormSchema } from '../types/form-schema';
import {
  getDefaultLanguage,
  getT,
  resolveFromTranslationsArray,
  isTranslationArray,
  recordToTranslationArray,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface GeneralInfoTabProps {
  schema: FormSchema;
  onUpdate: (updates: Partial<FormSchema>) => void;
  readonly?: boolean;
}

export function GeneralInfoTab({ schema, onUpdate, readonly = false }: GeneralInfoTabProps) {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const schemaType = schema.schemaType ?? (schema.isSystemSchema ? 'system' : 'business');
  const titleInfo = getT(TRANSLATION_KEYS.SCHEMA_TITLE_INFO, language, defaultLang);
  const labelSchemaId = getT(TRANSLATION_KEYS.SCHEMA_LABEL_ID, language, defaultLang);
  const labelSchemaType = getT(TRANSLATION_KEYS.SCHEMA_LABEL_TYPE, language, defaultLang);
  const labelSingularName = getT(TRANSLATION_KEYS.SCHEMA_LABEL_SINGULAR_NAME, language, defaultLang);
  const labelPluralName = getT(TRANSLATION_KEYS.SCHEMA_LABEL_PLURAL_NAME, language, defaultLang);
  const headingDataMgmt = getT(TRANSLATION_KEYS.SCHEMA_HEADING_DATA_MANAGEMENT, language, defaultLang);
  const headingTenantScope = getT(TRANSLATION_KEYS.SCHEMA_HEADING_TENANT_SCOPE, language, defaultLang);
  const labelApplyToAllTenants = getT(TRANSLATION_KEYS.SCHEMA_LABEL_APPLY_TO_ALL_TENANTS, language, defaultLang);
  const descApplyToAllTenants = getT(TRANSLATION_KEYS.SCHEMA_DESC_APPLY_TO_ALL_TENANTS, language, defaultLang);
  const labelSyncStrategy = getT(TRANSLATION_KEYS.SCHEMA_LABEL_SYNC_STRATEGY, language, defaultLang);
  const descSyncStrategy = getT(TRANSLATION_KEYS.SCHEMA_DESC_SYNC_STRATEGY, language, defaultLang);
  const optionSyncSchemaOnly = getT(TRANSLATION_KEYS.SCHEMA_OPTION_SYNC_SCHEMA_ONLY, language, defaultLang);
  const optionSyncSchemaAndData = getT(TRANSLATION_KEYS.SCHEMA_OPTION_SYNC_SCHEMA_AND_DATA, language, defaultLang);
  const labelStatusGroup = getT(TRANSLATION_KEYS.SCHEMA_LABEL_STATUS_GROUP, language, defaultLang);
  const descStatusGroup = getT(TRANSLATION_KEYS.SCHEMA_DESC_STATUS_GROUP, language, defaultLang);
  const labelEntityTypeGroup = getT(TRANSLATION_KEYS.SCHEMA_LABEL_ENTITY_TYPE_GROUP, language, defaultLang);
  const descEntityTypeGroup = getT(TRANSLATION_KEYS.SCHEMA_DESC_ENTITY_TYPE_GROUP, language, defaultLang);
  const labelRelatedTenants = getT(TRANSLATION_KEYS.SCHEMA_LABEL_RELATED_TENANTS, language, defaultLang);
  const descRelatedTenants = getT(TRANSLATION_KEYS.SCHEMA_DESC_RELATED_TENANTS, language, defaultLang);
  const labelCanSelectMulti = getT(TRANSLATION_KEYS.SCHEMA_LABEL_CAN_SELECT_MULTI_COMPANIES, language, defaultLang);
  const descCanSelectMulti = getT(TRANSLATION_KEYS.SCHEMA_DESC_CAN_SELECT_MULTI_COMPANIES, language, defaultLang);
  const labelAllowRelatedTenants = getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_DATA_RELATED_TENANTS, language, defaultLang);
  const descAllowRelatedTenants = getT(TRANSLATION_KEYS.SCHEMA_DESC_ALLOW_DATA_RELATED_TENANTS, language, defaultLang);
  const optionSystem = getT(TRANSLATION_KEYS.SCHEMA_TYPE_SYSTEM, language, defaultLang);
  const optionBusiness = getT(TRANSLATION_KEYS.SCHEMA_TYPE_BUSINESS, language, defaultLang);
  const optionActionForm = getT(TRANSLATION_KEYS.SCHEMA_TYPE_ACTION_FORM, language, defaultLang);
  const labelInactive = getT(TRANSLATION_KEYS.LABEL_INACTIVE, language, defaultLang);
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
        <CardTitle>{titleInfo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TextInput
            config={{ name: 'schema-id', label: labelSchemaId }}
            value={schema.id}
            onChange={() => {}}
            disabled
            className="[&_input]:bg-gray-50"
          />
        </div>
        <div>
            <FormSelect
              config={{ name: 'schema-type', label: labelSchemaType }}
              value={schema.schemaType || (schema.isSystemSchema ? 'system' : 'business')}
              onValueChange={(value: 'system' | 'business' | 'action-form') =>
                onUpdate({
                  schemaType: value,
                  isSystemSchema: value === 'system' ? true : value === 'business' ? false : undefined,
                })
              }
              options={[
                { id: 'system', label: optionSystem },
                { id: 'business', label: optionBusiness },
                { id: 'action-form', label: optionActionForm },
              ]}
            disabled={readonly}
          />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TextInput
              config={{ name: 'singular-name', label: labelSingularName }}
              value={
                schema.singular_name_translations ??
                (schema.singular_name
                  ? recordToTranslationArray({ [defaultLang]: schema.singular_name })
                  : [])
              }
              onChange={(value) => {
                if (isTranslationArray(value)) {
                  onUpdate({
                    singular_name_translations: value,
                    singular_name:
                      resolveFromTranslationsArray(value, defaultLang, defaultLang) || schema.singular_name || '',
                  });
                } else if (typeof value === 'string') {
                  onUpdate({ singular_name: value });
                }
              }}
              disabled={readonly}
              allowTranslation
              language={language}
              defaultLanguage={defaultLang}
            />
          </div>
          <div>
            <TextInput
              config={{ name: 'plural-name', label: labelPluralName }}
              value={
                schema.plural_name_translations ??
                (schema.plural_name
                  ? recordToTranslationArray({ [defaultLang]: schema.plural_name })
                  : [])
              }
              onChange={(value) => {
                if (isTranslationArray(value)) {
                  onUpdate({
                    plural_name_translations: value,
                    plural_name:
                      resolveFromTranslationsArray(value, defaultLang, defaultLang) || schema.plural_name || '',
                  });
                } else if (typeof value === 'string') {
                  onUpdate({ plural_name: value });
                }
              }}
              disabled={readonly}
              allowTranslation
              language={language}
              defaultLanguage={defaultLang}
            />
          </div>
        </div>
        <div>
          <Textarea
            config={{ name: 'schema-description', label: getT(TRANSLATION_KEYS.SECTION_LABEL_DESCRIPTION, language, defaultLang) }}
            value={
              schema.description_translations ??
              (schema.description
                ? recordToTranslationArray({ [defaultLang]: schema.description })
                : [])
            }
            onChange={(value) => {
              if (isTranslationArray(value)) {
                onUpdate({
                  description_translations: value,
                  description:
                    resolveFromTranslationsArray(value, defaultLang, defaultLang) || schema.description || '',
                });
              } else if (typeof value === 'string') {
                onUpdate({ description: value });
              }
            }}
            rows={3}
            disabled={readonly}
            allowTranslation
            language={language}
            defaultLanguage={defaultLang}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 items-center">
        <IconInput
          config={{ name: 'schema-icon', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ICON, language, defaultLang) }}
          value={schema.icon || ''}
          onChange={(value) => onUpdate({ icon: value })}
          disabled={readonly}
        />
          <Switch
            config={{ name: 'inactive-schema', label: labelInactive }}
            value={schema.inactive || false}
            onChange={(checked: boolean) => onUpdate({ inactive: checked })}
            disabled={readonly}
          />
          <Switch
            config={{ name: 'show-in-navigation', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_SHOW_IN_NAVIGATION, language, defaultLang) }}
            value={schema.showInNavigation || false}
            onChange={(checked: boolean) => onUpdate({ showInNavigation: checked })}
            disabled={readonly}
          />
          <Switch
            config={{ name: 'is-not-company-based', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_IS_NOT_COMPANY_BASED, language, defaultLang) }}
            value={schema.isNotCompanyBased || false}
            onChange={(checked: boolean) => onUpdate({ isNotCompanyBased: checked })}
            disabled={readonly}
          />
          <Switch
            config={{
              name: 'can-select-multi-companies',
              label: labelCanSelectMulti,
              description: descCanSelectMulti,
            }}
            value={schema.canSelectMultiCompanies || false}
            onChange={(checked: boolean) => onUpdate({ canSelectMultiCompanies: checked })}
            disabled={readonly}
          />
          <Switch
            config={{
              name: 'allow-data-related-tenants',
              label: labelAllowRelatedTenants,
              description: descAllowRelatedTenants,
            }}
            value={schema.allowDataRelatedTenants || false}
            onChange={(checked: boolean) => onUpdate({ allowDataRelatedTenants: checked })}
            disabled={readonly}
          />
        </div>
        <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{headingDataMgmt}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Switch
              config={{ name: 'allow-data-inactive', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_DATA_INACTIVE, language, defaultLang) }}
              value={schema.allowDataInactive || false}
              onChange={(checked: boolean) => onUpdate({ allowDataInactive: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-force', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_DATA_FORCE, language, defaultLang) }}
              value={schema.allowDataForce || false}
              onChange={(checked: boolean) => onUpdate({ allowDataForce: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-hard-delete', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_DATA_HARD_DELETE, language, defaultLang) }}
              value={schema.allowDataHardDelete || false}
              onChange={(checked: boolean) => onUpdate({ allowDataHardDelete: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-assigned-to', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_ASSIGNED_TO, language, defaultLang) }}
              value={schema.allowDataAssignedTo || false}
              onChange={(checked: boolean) => onUpdate({ allowDataAssignedTo: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-due-date', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_DUE_DATE, language, defaultLang) }}
              value={schema.allowDataDueDate || false}
              onChange={(checked: boolean) => onUpdate({ allowDataDueDate: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-data-bookmark', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_DATA_BOOKMARK, language, defaultLang) }}
              value={schema.allowDataBookmark || false}
              onChange={(checked: boolean) => onUpdate({ allowDataBookmark: checked })}
              disabled={readonly}
            />
            <Switch
              config={{ name: 'allow-hierarchical-parent', label: getT(TRANSLATION_KEYS.SCHEMA_LABEL_ALLOW_HIERARCHICAL_PARENT, language, defaultLang) }}
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
              label: labelStatusGroup,
              description: descStatusGroup,
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
              label: labelEntityTypeGroup,
              description: descEntityTypeGroup,
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
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{headingTenantScope}</h3>
          <div className="space-y-4">
            <Switch
              config={{
                name: 'apply-to-all-tenants',
                label: labelApplyToAllTenants,
                description: descApplyToAllTenants,
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
                  label: labelRelatedTenants,
                  description: descRelatedTenants,
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
                label: labelSyncStrategy,
                description: descSyncStrategy,
              }}
              value={schema.syncStrategy || 'schema-only'}
              onValueChange={(value: 'schema-only' | 'schema-and-data') =>
                onUpdate({ syncStrategy: value })
              }
              options={[
                { id: 'schema-only', label: optionSyncSchemaOnly },
                { id: 'schema-and-data', label: optionSyncSchemaAndData },
              ]}
              disabled={readonly}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

