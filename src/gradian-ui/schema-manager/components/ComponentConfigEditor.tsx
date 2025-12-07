'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { TextInput, NumberInput, Switch, Select } from '@/gradian-ui/form-builder/form-elements';
import { getComponentConfigSchema, mapComponentTypeToId, ComponentConfigField } from '@/gradian-ui/shared/components/component-registry';
import { Settings } from 'lucide-react';

interface ComponentConfigEditorProps {
  componentType: string;
  config: Record<string, any> | undefined;
  onChange: (config: Record<string, any>) => void;
}

export function ComponentConfigEditor({ componentType, config = {}, onChange }: ComponentConfigEditorProps) {
  const configSchema = useMemo(() => {
    const componentId = mapComponentTypeToId(componentType);
    return getComponentConfigSchema(componentId);
  }, [componentType]);

  if (!configSchema || !configSchema.fields || configSchema.fields.length === 0) {
    return null;
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    const newConfig = { ...config };
    if (value === '' || value === null || value === undefined) {
      delete newConfig[fieldName];
    } else {
      newConfig[fieldName] = value;
    }
    onChange(newConfig);
  };

  const renderField = (field: ComponentConfigField) => {
    const currentValue = config[field.name] ?? field.defaultValue;

    switch (field.type) {
      case 'boolean':
        return (
          <Switch
            key={field.name}
            config={{ name: `config-${field.name}`, label: field.label }}
            checked={currentValue ?? false}
            onChange={(checked) => handleFieldChange(field.name, checked)}
          />
        );

      case 'number':
        return (
          <div key={field.name}>
            <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
              {field.label}
              {field.description && (
                <span className="text-gray-500 font-normal ms-1">({field.description})</span>
              )}
            </Label>
            <NumberInput
              config={{ name: `config-${field.name}`, label: '' }}
              value={currentValue ?? ''}
              onChange={(value) => handleFieldChange(field.name, value === '' ? undefined : value)}
              min={field.min}
              max={field.max}
              step={field.step}
              className="h-9"
            />
          </div>
        );

      case 'string':
        return (
          <div key={field.name}>
            <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
              {field.label}
              {field.description && (
                <span className="text-gray-500 font-normal ms-1">({field.description})</span>
              )}
            </Label>
            <TextInput
              config={{ name: `config-${field.name}`, label: '', placeholder: field.description }}
              value={currentValue ?? ''}
              onChange={(value) => handleFieldChange(field.name, value || undefined)}
              className="h-9"
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
              {field.label}
              {field.description && (
                <span className="text-gray-500 font-normal ms-1">({field.description})</span>
              )}
            </Label>
            <Select
              value={currentValue ?? field.defaultValue ?? ''}
              onValueChange={(value) => handleFieldChange(field.name, value || undefined)}
              options={field.options || []}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mt-6 pt-6 border-t-2 border-gray-200">
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="flex items-start gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <Settings className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
              Component Configuration
            </Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Configure component-specific settings for this field
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {configSchema.fields.map(renderField)}
        </div>
      </div>
    </div>
  );
}

