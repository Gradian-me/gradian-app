// Form System Section Component

import React, { useMemo, useState, useEffect } from 'react';
import { FormSchema, FormData } from '@/gradian-ui/schema-manager/types/form-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '../form-elements/components/Switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '../../shared/utils';
import { Button } from '@/components/ui/button';
import { PopupPicker } from '../form-elements/components/PopupPicker';
import { normalizeOptionArray } from '../form-elements/utils/option-normalizer';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { getValueByRole, getSingleValueByRole } from '../form-elements/utils/field-resolver';

export interface FormSystemSectionProps {
  schema: FormSchema;
  values: FormData;
  onChange: (fieldName: string, value: any) => void;
  onBlur: (fieldName: string) => void;
  disabled?: boolean;
}

export const FormSystemSection: React.FC<FormSystemSectionProps> = ({
  schema,
  values,
  onChange,
  onBlur,
  disabled = false,
}) => {
  // Check if System Section should be shown
  const shouldShow =
    schema.allowDataInactive === true ||
    schema.allowDataForce === true ||
    schema.allowHierarchicalParent === true;

  if (!shouldShow) {
    return null;
  }

  const inactiveValue = values.inactive === true;
  const forceValue = values.isForce === true;
  const forceReasonValue = values.forceReason || '';

  // Hierarchical parent handling
  const [isParentPickerOpen, setIsParentPickerOpen] = useState(false);
  const [resolvedParent, setResolvedParent] = useState<any | null>(null);
  const [isLoadingParent, setIsLoadingParent] = useState(false);

  // Determine if parent is just an ID (string/number) vs an object/array
  const parentId = useMemo(() => {
    if (!values.parent) return null;
    // If it's a string or number, treat it as an ID
    if (typeof values.parent === 'string' || typeof values.parent === 'number') {
      return String(values.parent);
    }
    // If it's an array, check if first item is an object with id or if it's just an ID
    if (Array.isArray(values.parent)) {
      if (values.parent.length === 0) return null;
      const first = values.parent[0];
      if (typeof first === 'string' || typeof first === 'number') {
        return String(first);
      }
      if (first && typeof first === 'object' && first.id) {
        return String(first.id);
      }
      return null;
    }
    // If it's an object with id property
    if (values.parent && typeof values.parent === 'object' && values.parent.id) {
      return String(values.parent.id);
    }
    return null;
  }, [values.parent]);

  // Fetch parent entity when parent is just an ID
  useEffect(() => {
    if (!schema.allowHierarchicalParent || !parentId || !schema.id) {
      setResolvedParent(null);
      return;
    }

    // Check if we already have resolved data (from normalized array)
    const normalizedParent = normalizeOptionArray(values.parent);
    const parentEntry = normalizedParent[0] || null;
    if (parentEntry && parentEntry.label && parentEntry.label !== parentId) {
      // Already has label, no need to fetch
      setResolvedParent(parentEntry);
      return;
    }

    // Fetch parent entity to get its title/label
    setIsLoadingParent(true);
    apiRequest<any>(`/api/data/${schema.id}/${parentId}`)
      .then((response) => {
        if (response.success && response.data) {
          const parentEntity = response.data;
          const title = getValueByRole(schema, parentEntity, 'title') || 
                       parentEntity.name || 
                       parentEntity.title || 
                       parentId;
          const icon = getSingleValueByRole(schema, parentEntity, 'icon') || parentEntity.icon;
          const color = getSingleValueByRole(schema, parentEntity, 'status') 
            ? (() => {
                const statusField = schema.fields?.find(f => f.role === 'status');
                const statusOptions = statusField?.options;
                if (statusOptions && Array.isArray(statusOptions)) {
                  const statusValue = getSingleValueByRole(schema, parentEntity, 'status');
                  const statusMeta = statusOptions.find((opt: any) => 
                    String(opt.id) === String(statusValue) || String(opt.value) === String(statusValue)
                  );
                  return statusMeta?.color;
                }
                return undefined;
              })()
            : parentEntity.color;
          
          setResolvedParent({
            id: parentId,
            label: title,
            icon,
            color,
          });
        } else {
          setResolvedParent(null);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch parent entity:', error);
        setResolvedParent(null);
      })
      .finally(() => {
        setIsLoadingParent(false);
      });
  }, [parentId, schema.id, schema.allowHierarchicalParent, schema, values.parent]);

  const normalizedParent = useMemo(() => {
    if (!values.parent) return [];
    const normalized = normalizeOptionArray(values.parent);
    // If we have resolved parent data, use it to enrich the normalized entry
    if (resolvedParent && normalized.length > 0 && normalized[0]?.id === resolvedParent.id) {
      return [{
        ...normalized[0],
        label: resolvedParent.label || normalized[0].label,
        icon: resolvedParent.icon || normalized[0].icon,
        color: resolvedParent.color || normalized[0].color,
      }];
    }
    // If normalized entry doesn't have a label but we have resolved data, use it
    if (resolvedParent && normalized.length > 0 && !normalized[0]?.label) {
      return [resolvedParent];
    }
    // If no normalized entry but we have resolved data, use it
    if (resolvedParent && normalized.length === 0) {
      return [resolvedParent];
    }
    return normalized;
  }, [values.parent, resolvedParent]);

  const parentEntry = normalizedParent[0] || null;
  const parentLabel = parentEntry?.label || (isLoadingParent ? 'Loading...' : parentId || '');
  const parentIcon = parentEntry?.icon;
  const currentEntityId = values.id ? String(values.id) : undefined;
  const isParentLocked = values.__parentLocked === true;

  return (
    <Card className={cn(
      'border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30',
      'overflow-visible'
    )}>
      <CardHeader className="pb-4 px-6 pt-4">
        <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
          System Section
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 overflow-visible">
        <div className="space-y-4">
          <div className="flex flex-row items-center gap-6">
            {schema.allowDataInactive && (
              <Switch
                config={{
                  name: 'system-inactive',
                  label: 'Inactive',
                }}
                checked={inactiveValue}
                onChange={(checked) => onChange('inactive', checked)}
                onBlur={() => onBlur('inactive')}
                disabled={disabled}
              />
            )}
            
            {schema.allowDataForce && (
              <Switch
                config={{
                  name: 'system-force',
                  label: 'Force',
                }}
                checked={forceValue}
                onChange={(checked) => onChange('isForce', checked)}
                onBlur={() => onBlur('isForce')}
                disabled={disabled}
              />
            )}
          </div>
          
          {schema.allowDataForce && forceValue && (
            <div className="space-y-2">
              <Label 
                htmlFor="system-force-reason"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Force Reason
              </Label>
              <Textarea
                id="system-force-reason"
                name="forceReason"
                value={forceReasonValue}
                onChange={(e) => onChange('forceReason', e.target.value)}
                onBlur={() => onBlur('forceReason')}
                placeholder="Enter the reason for forcing this record..."
                rows={3}
                disabled={disabled}
                className="w-full"
              />
            </div>
          )}

          {schema.allowHierarchicalParent && (
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
              <Label
                htmlFor="system-parent"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                Parent
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                  (hierarchical)
                </span>
              </Label>

              <div className="flex items-center gap-2">
                <Button
                  id="system-parent"
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || isParentLocked}
                  className={cn(
                    'justify-start w-full text-left',
                    !parentLabel && 'text-gray-400 dark:text-gray-500'
                  )}
                  onClick={() => {
                    if (!disabled && !isParentLocked) {
                      setIsParentPickerOpen(true);
                    }
                  }}
                >
                  {parentLabel ? (
                    <span className="inline-flex items-center gap-2 truncate">
                      {parentIcon && (
                        <IconRenderer iconName={parentIcon} className="h-4 w-4 text-violet-500" />
                      )}
                      <span className="truncate">{parentLabel}</span>
                    </span>
                  ) : (
                    <span className="truncate text-xs sm:text-sm">
                      Select parent (optional)
                    </span>
                  )}
                </Button>

                {parentLabel && !disabled && !isParentLocked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={() => {
                      setIsParentPickerOpen(true);
                    }}
                  >
                    Change parent
                  </Button>
                )}
              </div>

              {schema.allowHierarchicalParent && (
                <PopupPicker
                  isOpen={isParentPickerOpen}
                  onClose={() => setIsParentPickerOpen(false)}
                  schemaId={schema.id}
                  schema={schema as any}
                  onSelect={async (selections) => {
                    let nextValue: any = null;
                    if (selections && selections.length > 0) {
                      const first = selections[0];
                      nextValue = first?.id ? String(first.id) : null;
                    }
                    onChange('parent', nextValue);
                    onBlur('parent');
                  }}
                  title={`Select parent ${schema.singular_name || 'item'}`}
                  description={`Choose a parent ${schema.singular_name || 'item'} for hierarchical view`}
                  excludeIds={currentEntityId ? [currentEntityId] : []}
                  selectedIds={parentId ? [parentId] : []}
                  canViewList={true}
                  viewListUrl={`/page/${schema.id}`}
                  allowMultiselect={false}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

FormSystemSection.displayName = 'FormSystemSection';

