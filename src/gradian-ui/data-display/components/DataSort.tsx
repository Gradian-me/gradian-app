'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUpNarrowWide, ArrowDownWideNarrow, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { SortConfig } from '@/gradian-ui/shared/utils/sort-utils';
import { getDefaultLanguage, getT, resolveSchemaFieldLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';

interface DataSortProps {
  /**
   * Schema to get available columns from
   */
  schema: FormSchema | null | undefined;
  
  /**
   * Current sort configuration
   */
  value: SortConfig[];
  
  /**
   * Callback when sort configuration changes
   */
  onChange: (sortConfig: SortConfig[]) => void;
  
  /**
   * Optional className
   */
  className?: string;
  
  /**
   * Whether to exclude metadata fields (id, createdAt, updatedAt) from available columns
   * @default false
   */
  excludeMetadataFields?: boolean;
  
  /**
   * Field IDs to exclude from available columns (e.g., repeating section fields)
   */
  excludedFieldIds?: Set<string>;
  
  /**
   * Whether to show the header (for use in dialogs where header is already provided)
   * @default true
   */
  showHeader?: boolean;

  /**
   * When true, selections are kept in draft until Apply is clicked; otherwise changes apply immediately
   * @default false
   */
  requireApply?: boolean;

  /**
   * Callback when Apply is clicked (e.g. to close the dialog). Only used when requireApply is true.
   */
  onApply?: () => void;
}

/**
 * SortableItem - Internal component for rendering a sortable selected column
 */
interface SortableItemProps {
  item: SortConfig;
  onRemove: () => void;
  onToggleDirection: () => void;
  columnLabel: string;
  isSortable: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  item, 
  onRemove, 
  onToggleDirection,
  columnLabel,
  isSortable 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.column, disabled: !isSortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className={cn(
        "w-full flex items-center gap-2 rounded border p-2 transition-all",
        isDragging
          ? 'border-violet-400 dark:border-violet-500 bg-white dark:bg-gray-800 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}>
        <button
          {...attributes}
          {...listeners}
          type="button"
          disabled={!isSortable}
          className={cn(
            "cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-0.5 shrink-0",
            !isSortable && "cursor-default opacity-50"
          )}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{columnLabel}</span>
        </div>
        <button
          type="button"
          onClick={onToggleDirection}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
          aria-label={item.isAscending ? 'Change to descending' : 'Change to ascending'}
        >
          {item.isAscending ? (
            <ArrowUpNarrowWide className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ArrowDownWideNarrow className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 shrink-0"
          aria-label="Remove from sort"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

/**
 * DataSort - Component for selecting and configuring multi-column sorting
 * Supports drag-and-drop reordering of sort columns and ascending/descending toggles
 */
export const DataSort: React.FC<DataSortProps> = ({
  schema,
  value = [],
  onChange,
  className,
  excludeMetadataFields = false,
  excludedFieldIds,
  showHeader = true,
  requireApply = false,
  onApply,
}) => {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // System fields that are always available for sorting (labels resolved by language)
  const systemFields = useMemo(() => {
    const baseFields: Array<{ id: string; name: string; labelKey: string }> = [
      { id: 'status', name: 'status', labelKey: TRANSLATION_KEYS.LABEL_STATUS },
      { id: 'entityType', name: 'entityType', labelKey: TRANSLATION_KEYS.LABEL_ENTITY_TYPE },
      { id: 'updatedBy', name: 'updatedBy', labelKey: TRANSLATION_KEYS.LABEL_UPDATED_BY },
      { id: 'updatedAt', name: 'updatedAt', labelKey: TRANSLATION_KEYS.LABEL_UPDATED_AT },
      { id: 'createdBy', name: 'createdBy', labelKey: TRANSLATION_KEYS.LABEL_CREATED_BY },
      { id: 'createdAt', name: 'createdAt', labelKey: TRANSLATION_KEYS.LABEL_CREATED_AT },
    ];

    const fields: Array<{ id: string; name: string; label: string }> = baseFields.map((f) => ({
      id: f.id,
      name: f.name,
      label: getT(f.labelKey, language, defaultLang),
    }));

    if (schema && !schema.isNotCompanyBased) {
      fields.push({
        id: 'companyId',
        name: 'companyId',
        label: getT(TRANSLATION_KEYS.LABEL_COMPANY, language, defaultLang),
      });
    }

    return fields;
  }, [schema, language, defaultLang]);

  // Get available columns from schema (labels resolved by language)
  const availableColumns = useMemo(() => {
    if (!schema?.fields || schema.fields.length === 0) {
      return [];
    }

    const visibleFields = schema.fields.filter((field: any) => {
      if (field.hidden) return false;
      if (excludedFieldIds && excludedFieldIds.has(field.id)) return false;
      if (excludeMetadataFields) {
        if (field.id === 'id' || field.id === 'createdAt' || field.id === 'updatedAt') {
          return false;
        }
      }
      return true;
    });

    return visibleFields.map((field: any) => ({
      id: field.id,
      label: resolveSchemaFieldLabel(field, language, defaultLang) || field.name || field.id,
      name: field.name || field.id,
      isSystemField: false,
    }));
  }, [schema, excludeMetadataFields, excludedFieldIds, language, defaultLang]);

  // Draft state when requireApply - edits go to draft, Apply commits to parent
  const [draftValue, setDraftValue] = React.useState<SortConfig[]>(value);
  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const displayValue = requireApply ? draftValue : value;
  const valueRef = useRef(displayValue);
  useEffect(() => {
    valueRef.current = displayValue;
  }, [displayValue]);

  const handleToggleColumn = useCallback((columnId: string) => {
    const currentValue = valueRef.current;
    const column = availableColumns.find(c => c.id === columnId) || systemFields.find(f => f.id === columnId);
    
    if (!column) return;

    // Use field name (not ID) for the sort configuration
    const fieldName = column.name;
    const isSelected = currentValue.some(item => item.column === fieldName);

    const next = isSelected
      ? currentValue.filter(item => item.column !== fieldName)
      : [...currentValue, { column: fieldName, isAscending: true }];
    if (requireApply) setDraftValue(next);
    else onChange(next);
  }, [availableColumns, systemFields, onChange, requireApply]);

  const handleRemoveColumn = useCallback((fieldName: string) => {
    const currentValue = valueRef.current;
    const next = currentValue.filter(item => item.column !== fieldName);
    if (requireApply) setDraftValue(next);
    else onChange(next);
  }, [onChange, requireApply]);

  const handleToggleDirection = useCallback((fieldName: string) => {
    const currentValue = valueRef.current;
    const next = currentValue.map(item =>
      item.column === fieldName ? { ...item, isAscending: !item.isAscending } : item
    );
    if (requireApply) setDraftValue(next);
    else onChange(next);
  }, [onChange, requireApply]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentValue = valueRef.current;
    const oldIndex = currentValue.findIndex(item => item.column === active.id);
    const newIndex = currentValue.findIndex(item => item.column === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(currentValue, oldIndex, newIndex);
      if (requireApply) setDraftValue(reordered);
      else onChange(reordered);
    }
  }, [onChange, requireApply]);

  const handleClearAll = useCallback(() => {
    if (requireApply) setDraftValue([]);
    else onChange([]);
  }, [onChange, requireApply]);

  const handleApply = useCallback(() => {
    onChange(draftValue);
    onApply?.();
  }, [draftValue, onChange, onApply]);

  const selectedFieldNames = useMemo(
    () => new Set(displayValue.map((item) => item.column)),
    [displayValue]
  );

  const isColumnSelected = (fieldName: string) => selectedFieldNames.has(fieldName);

  const getColumnLabel = (fieldName: string): string => {
    const column = availableColumns.find(c => c.name === fieldName) || systemFields.find(f => f.name === fieldName);
    return column?.label || fieldName;
  };

  const hasColumns = availableColumns.length > 0 || systemFields.length > 0;

  const renderLeftPanel = () => (
    <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 shrink-0">
        {getT(TRANSLATION_KEYS.LABEL_COLUMNS, language ?? defaultLang, defaultLang)}
      </p>
      {!hasColumns ? (
        <p className="text-sm text-muted-foreground">
          {getT(TRANSLATION_KEYS.MESSAGE_NO_COLUMNS_AVAILABLE_FOR_SORTING, language ?? defaultLang, defaultLang)}
        </p>
      ) : (
        <div className="space-y-3">
          {availableColumns.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {getT(TRANSLATION_KEYS.LABEL_COLUMNS, language ?? defaultLang, defaultLang)}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((column) => {
                  const checked = isColumnSelected(column.name);
                  return (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleToggleColumn(column.id)}
                      />
                      <span>{column.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {systemFields.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {getT(TRANSLATION_KEYS.LABEL_SYSTEM, language ?? defaultLang, defaultLang)}
              </p>
              <div className="flex flex-wrap gap-2">
                {systemFields.map((field) => {
                  const checked = isColumnSelected(field.name);
                  return (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleToggleColumn(field.id)}
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderRightPanel = () => (
    <div className="w-80 shrink-0 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {getT(TRANSLATION_KEYS.LABEL_SORT_ORDER, language ?? defaultLang, defaultLang)}
        </p>
        {displayValue.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-red-600"
            onClick={handleClearAll}
          >
            {getT(TRANSLATION_KEYS.BUTTON_CLEAR_ALL, language ?? defaultLang, defaultLang)}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-[120px]">
        {displayValue.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {getT(TRANSLATION_KEYS.MESSAGE_SELECT_COLUMNS_FROM_LEFT, language ?? defaultLang, defaultLang)}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayValue.map((item) => item.column)}
              strategy={verticalListSortingStrategy}
            >
              {displayValue.map((item) => (
                <SortableItem
                  key={item.column}
                  item={item}
                  columnLabel={getColumnLabel(item.column)}
                  onRemove={() => handleRemoveColumn(item.column)}
                  onToggleDirection={() => handleToggleDirection(item.column)}
                  isSortable={displayValue.length > 1}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {showHeader && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 mb-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Sort</span>
          {displayValue.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">({displayValue.length})</span>
          )}
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        {renderLeftPanel()}
        {renderRightPanel()}
      </div>

      {requireApply && (
        <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleApply} size="sm" className="px-4">
            {getT(TRANSLATION_KEYS.BUTTON_APPLY, language ?? defaultLang, defaultLang)}
          </Button>
        </div>
      )}
    </div>
  );
};

DataSort.displayName = 'DataSort';

