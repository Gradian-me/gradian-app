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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { SortConfig } from '@/gradian-ui/shared/utils/sort-utils';

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
        "w-full rounded border transition-all duration-200",
        isDragging
          ? 'border-violet-400 dark:border-violet-500 shadow-md ring-2 ring-violet-200 dark:ring-violet-800 bg-white dark:bg-gray-800'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
      )}>
        <div className="p-2">
          <div className="flex items-center gap-2">
            {isSortable && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 shrink-0"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-900 dark:text-gray-100">{columnLabel}</span>
            </div>
            <button
              onClick={onToggleDirection}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
              aria-label={item.isAscending ? 'Change to descending' : 'Change to ascending'}
              title={item.isAscending ? 'Ascending - Click to change to descending' : 'Descending - Click to change to ascending'}
            >
              {item.isAscending ? (
                <ArrowUpNarrowWide className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
              aria-label="Remove from sort"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
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
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // System fields that are always available for sorting
  const systemFields = useMemo(() => {
    const fields = [
      { id: 'status', label: 'Status' },
      { id: 'entityType', label: 'Type' },
      { id: 'updatedBy', label: 'Updated By' },
      { id: 'updatedAt', label: 'Updated At' },
      { id: 'createdBy', label: 'Created By' },
      { id: 'createdAt', label: 'Created At' },
    ];

    // Add company field if schema is company-based
    if (schema && !schema.isNotCompanyBased) {
      fields.push({ id: 'companyId', label: 'Company' });
    }

    return fields;
  }, [schema]);

  // Get available columns from schema
  const availableColumns = useMemo(() => {
    if (!schema?.fields || schema.fields.length === 0) {
      return [];
    }

    // Filter out hidden fields and excluded fields
    const visibleFields = schema.fields.filter((field: any) => {
      if (field.hidden) return false;
      if (excludedFieldIds && excludedFieldIds.has(field.id)) return false;
      if (excludeMetadataFields) {
        // Optionally exclude common metadata fields
        if (field.id === 'id' || field.id === 'createdAt' || field.id === 'updatedAt') {
          return false;
        }
      }
      return true;
    });

    return visibleFields.map((field: any) => ({
      id: field.id,
      label: field.label || field.name || field.id,
      name: field.name || field.id,
      isSystemField: false,
    }));
  }, [schema?.fields, excludeMetadataFields, excludedFieldIds]);

  // Use ref to track the latest value to avoid stale closure issues
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleToggleColumn = useCallback((columnId: string) => {
    const currentValue = valueRef.current;
    const isSelected = currentValue.some(item => item.column === columnId);
    const column = availableColumns.find(c => c.id === columnId) || systemFields.find(f => f.id === columnId);
    
    if (!column) return;

    if (isSelected) {
      // Remove from selected
      onChange(currentValue.filter(item => item.column !== columnId));
    } else {
      // Add to selected (default to ascending)
      onChange([...currentValue, { column: columnId, isAscending: true }]);
    }
  }, [availableColumns, systemFields, onChange]);

  const handleRemoveColumn = useCallback((columnId: string) => {
    const currentValue = valueRef.current;
    onChange(currentValue.filter(item => item.column !== columnId));
  }, [onChange]);

  const handleToggleDirection = useCallback((columnId: string) => {
    const currentValue = valueRef.current;
    onChange(
      currentValue.map(item =>
        item.column === columnId
          ? { ...item, isAscending: !item.isAscending }
          : item
      )
    );
  }, [onChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentValue = valueRef.current;
    const oldIndex = currentValue.findIndex(item => item.column === active.id);
    const newIndex = currentValue.findIndex(item => item.column === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(currentValue, oldIndex, newIndex);
      onChange(reordered);
    }
  }, [onChange]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const getAvailableColumns = () => {
    const selectedColumnIds = new Set(value.map(item => item.column));
    return availableColumns.filter(column => !selectedColumnIds.has(column.id));
  };

  const getAvailableSystemFields = () => {
    const selectedColumnIds = new Set(value.map(item => item.column));
    return systemFields.filter(field => !selectedColumnIds.has(field.id));
  };

  const unselectedColumns = getAvailableColumns();
  const unselectedSystemFields = getAvailableSystemFields();

  const getColumnLabel = (columnId: string): string => {
    const column = availableColumns.find(c => c.id === columnId) || systemFields.find(f => f.id === columnId);
    return column?.label || columnId;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Sort</span>
            {value.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">({value.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {value.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-7 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
          {/* Selected Sort Columns */}
          {value.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sort Order</p>
                {value.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-7 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={value.map(item => item.column)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {value.map((item) => (
                      <SortableItem
                        key={item.column}
                        item={item}
                        columnLabel={getColumnLabel(item.column)}
                        onRemove={() => handleRemoveColumn(item.column)}
                        onToggleDirection={() => handleToggleDirection(item.column)}
                        isSortable={value.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Available Columns - Two Column Layout */}
          {(unselectedColumns.length > 0 || unselectedSystemFields.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unselectedColumns.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Columns
                  </p>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-1 space-y-0.5">
                    {unselectedColumns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => handleToggleColumn(column.id)}
                      >
                        <Checkbox
                          id={`sort-column-${column.id}`}
                          checked={false}
                          onCheckedChange={() => handleToggleColumn(column.id)}
                          className="h-3.5 w-3.5"
                        />
                        <label
                          htmlFor={`sort-column-${column.id}`}
                          className="text-xs font-normal cursor-pointer flex-1 text-gray-700 dark:text-gray-300"
                        >
                          {column.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Fields */}
              {unselectedSystemFields.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    System
                  </p>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-1 space-y-0.5">
                    {unselectedSystemFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => handleToggleColumn(field.id)}
                      >
                        <Checkbox
                          id={`sort-system-${field.id}`}
                          checked={false}
                          onCheckedChange={() => handleToggleColumn(field.id)}
                          className="h-3.5 w-3.5"
                        />
                        <label
                          htmlFor={`sort-system-${field.id}`}
                          className="text-xs font-normal cursor-pointer flex-1 text-gray-700 dark:text-gray-300"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {unselectedColumns.length === 0 && unselectedSystemFields.length === 0 && value.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No columns available for sorting
            </div>
          )}

          {unselectedColumns.length === 0 && unselectedSystemFields.length === 0 && value.length > 0 && (
            <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
              All available columns are selected
            </div>
          )}
      </div>
    </div>
  );
};

DataSort.displayName = 'DataSort';

