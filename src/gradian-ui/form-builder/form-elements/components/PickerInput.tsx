'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PopupPicker } from './PopupPicker';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { getValueByRole, getSingleValueByRole } from '../utils/field-resolver';
import { NormalizedOption, normalizeOptionArray, extractFirstId } from '../utils/option-normalizer';
import { Search, X } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';

export interface PickerInputProps {
  config: any;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const PickerInput: React.FC<PickerInputProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  touched,
  disabled = false,
  required = false,
  className,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [targetSchema, setTargetSchema] = useState<FormSchema | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const queryClient = useQueryClient();

  // Get targetSchema from config
  const targetSchemaId = (config as any).targetSchema;
  const allowMultiselect = Boolean(
    (config as any)?.metadata?.allowMultiselect ??
    (config as any)?.allowMultiselect
  );
  const normalizedSelection = useMemo(
    () => normalizeOptionArray(value),
    [value]
  );
  const selectedIdsForPicker = useMemo(
    () =>
      normalizedSelection
        .map((opt) => opt.id)
        .filter((id): id is string => Boolean(id))
        .map((id) => String(id)),
    [normalizedSelection]
  );

  // Fetch target schema when component mounts or targetSchemaId changes
  useEffect(() => {
    if (targetSchemaId && !targetSchema) {
      setIsLoadingSchema(true);
      const fetchSchema = async () => {
        try {
          const response = await apiRequest<FormSchema>(`/api/schemas/${targetSchemaId}`);
          if (response.success && response.data) {
            await cacheSchemaClientSide(response.data, { queryClient, persist: false });
            setTargetSchema(response.data);
          }
        } catch (err) {
          console.error('Error fetching target schema:', err);
        } finally {
          setIsLoadingSchema(false);
        }
      };
      fetchSchema();
    }
  }, [targetSchemaId, targetSchema, queryClient]);

  // Fetch selected item when value changes
  useEffect(() => {
    const fetchSelectedItem = async (primaryValue: any) => {
      try {
        if (!targetSchemaId || !targetSchema) {
          setSelectedItem(null);
          return;
        }

        if (primaryValue === null || primaryValue === undefined) {
          setSelectedItem(null);
          return;
        }

        const resolvedId = extractFirstId(primaryValue);
        if (!resolvedId) {
          setSelectedItem(null);
          return;
        }

        const response = await apiRequest<any>(`/api/data/${targetSchemaId}/${resolvedId}`);
        if (response.success && response.data) {
          setSelectedItem(response.data);
          return;
        }

        if (typeof primaryValue === 'object') {
          if (primaryValue.label) {
            setSelectedItem({
              id: resolvedId,
              name: primaryValue.label,
              title: primaryValue.label,
            });
          } else {
            setSelectedItem(primaryValue);
          }
          return;
        }

        setSelectedItem({ id: resolvedId });
      } catch (err) {
        console.error('Error fetching selected item:', err);
      }
    };

    if (value === null || value === undefined || value === '') {
      setSelectedItem(null);
      return;
    }

    const primaryValue = normalizedSelection[0] ?? value;
    fetchSelectedItem(primaryValue);
  }, [value, normalizedSelection, targetSchemaId, targetSchema]);

  const handleSelect = (selectedOptions: NormalizedOption[], rawItems: any[]) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      return;
    }

    onChange?.(selectedOptions);

    const primaryRawItem = rawItems?.[0];
    if (primaryRawItem) {
      setSelectedItem(primaryRawItem);
    } else {
      const primaryOption = selectedOptions[0];
      setSelectedItem({
        id: primaryOption.id,
        name: primaryOption.label,
        title: primaryOption.label,
      });
    }

    setIsPickerOpen(false);
  };

  const handleClear = () => {
    onChange?.([]);
    setSelectedItem(null);
  };

  const getDisplayValue = () => {
    if (allowMultiselect) {
      if (normalizedSelection.length === 0) {
        return '';
      }
      if (normalizedSelection.length > 1) {
        return `${normalizedSelection.length} items selected`;
      }
    }

    if (!selectedItem || !targetSchema) {
      const fallbackOption = normalizedSelection[0];
      if (fallbackOption) {
        return fallbackOption.label ?? fallbackOption.id ?? '';
      }
      return '';
    }

    // Try to get title field from schema
    const title = getValueByRole(targetSchema, selectedItem, 'title') || selectedItem.name || selectedItem.title || '';
    const subtitle = getSingleValueByRole(targetSchema, selectedItem, 'subtitle') || selectedItem.email || '';
    
    return subtitle ? `${title} (${subtitle})` : title;
  };

  const fieldName = (config as any).name || 'unknown';
  const fieldLabel = (config as any).label;
  const fieldPlaceholder = (config as any).placeholder || 'Click to select...';

  return (
    <div className={cn('w-full space-y-2', className)}>
      {fieldLabel && (
        <label
          htmlFor={fieldName}
          className={getLabelClasses({ error: Boolean(error), required })}
        >
          {fieldLabel}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={fieldName}
            name={fieldName}
            type="text"
            value={getDisplayValue()}
            placeholder={fieldPlaceholder}
            readOnly
            onClick={() => !disabled && setIsPickerOpen(true)}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={disabled}
            className={cn(
              'cursor-pointer',
              error
                ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500'
                : ''
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => !disabled && setIsPickerOpen(true)}
            disabled={disabled}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {selectedItem && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-10 w-10 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {error && (
        <p className={errorTextClasses} role="alert">
          {error}
        </p>
      )}
      
      {targetSchemaId && (
        <PopupPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          schemaId={targetSchemaId}
          schema={targetSchema || undefined}
          onSelect={handleSelect}
          title={`Select ${targetSchema?.plural_name || targetSchema?.singular_name || targetSchemaId}`}
          description={`Choose a ${targetSchema?.singular_name || 'item'}`}
          canViewList={true}
          viewListUrl={`/page/${targetSchemaId}`}
          allowMultiselect={allowMultiselect}
          selectedIds={selectedIdsForPicker}
        />
      )}
    </div>
  );
};

PickerInput.displayName = 'PickerInput';
