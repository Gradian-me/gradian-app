'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import type { DynamicQueryColumnDef } from '../types';

interface DynamicQueryColumnConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schemaId: string;
  schema: FormSchema | null | undefined;
  columns: DynamicQueryColumnDef[];
  onChange: (columns: DynamicQueryColumnDef[]) => void;
}

const SYSTEM_FIELDS = [
  { id: 'id', label: 'ID' },
  { id: 'status', label: 'Status' },
  { id: 'entityType', label: 'Type' },
  { id: 'updatedBy', label: 'Updated By' },
  { id: 'updatedAt', label: 'Updated At' },
  { id: 'createdBy', label: 'Created By' },
  { id: 'createdAt', label: 'Created At' },
  { id: 'companyId', label: 'Company' },
];

/** Prefer label; if missing, humanize name (camelCase/snake_case to Title Case) */
function humanizeFieldName(str: string): string {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFieldLabel(schema: FormSchema | null | undefined, fieldId: string): string {
  const fromSchema = schema?.fields?.find((f: any) => f.id === fieldId);
  if (fromSchema) {
    if (fromSchema.label && String(fromSchema.label).trim()) return fromSchema.label;
    if (fromSchema.name) return humanizeFieldName(fromSchema.name);
    return humanizeFieldName(fieldId);
  }
  const fromSystem = SYSTEM_FIELDS.find((f) => f.id === fieldId);
  return fromSystem?.label ?? humanizeFieldName(fieldId);
}

interface SortableColumnRowProps {
  item: DynamicQueryColumnDef;
  schema: FormSchema | null | undefined;
  onRemove: () => void;
}

function SortableColumnRow({
  item,
  schema,
  onRemove,
}: SortableColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border p-2 transition-all',
          isDragging
            ? 'border-violet-400 bg-white dark:bg-gray-800 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
        )}
      >
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-0.5 shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 truncate">
          {getFieldLabel(schema, item.fieldId)}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 shrink-0"
          aria-label="Remove column"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DynamicQueryColumnConfigDialog({
  open,
  onOpenChange,
  schemaId,
  schema,
  columns,
  onChange,
}: DynamicQueryColumnConfigDialogProps) {
  const valueRef = useRef(columns);
  useEffect(() => {
    valueRef.current = columns;
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const availableFields = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    if (schema?.fields) {
      for (const f of schema.fields as Array<{ id: string; name?: string; label?: string; hidden?: boolean }>) {
        if (f.hidden) continue;
        const label = f.label && String(f.label).trim() ? f.label : (f.name ? humanizeFieldName(f.name) : humanizeFieldName(f.id));
        list.push({ id: f.id, label });
      }
    }
    for (const f of SYSTEM_FIELDS) {
      if (!list.some((x) => x.id === f.id)) list.push(f);
    }
    return list;
  }, [schema]);

  const selectedFieldIds = useMemo(() => new Set(columns.map((c) => c.fieldId)), [columns]);

  const handleToggleField = useCallback(
    (fieldId: string) => {
      const cur = valueRef.current;
      if (selectedFieldIds.has(fieldId)) {
        onChange(cur.filter((c) => c.fieldId !== fieldId));
      } else {
        const nextSelectOrder =
          cur.length === 0 ? 1 : Math.max(...cur.map((c) => c.selectOrder), 0) + 1;
        onChange([
          ...cur,
          { fieldId, schemaId, selectOrder: nextSelectOrder },
        ]);
      }
    },
    [schemaId, selectedFieldIds, onChange]
  );

  const handleRemove = useCallback(
    (fieldId: string) => {
      const cur = valueRef.current;
      const removed = cur.filter((c) => c.fieldId !== fieldId);
      // Reassign selectOrder 1..n
      const reordered = removed
        .sort((a, b) => a.selectOrder - b.selectOrder)
        .map((c, i) => ({ ...c, selectOrder: i + 1 }));
      onChange(reordered);
    },
    [onChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const cur = valueRef.current;
      const oldIndex = cur.findIndex((c) => c.fieldId === active.id);
      const newIndex = cur.findIndex((c) => c.fieldId === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(
        [...cur].sort((a, b) => a.selectOrder - b.selectOrder),
        oldIndex,
        newIndex
      ).map((c, i) => ({ ...c, selectOrder: i + 1 }));
      onChange(reordered);
    },
    [onChange]
  );

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.selectOrder - b.selectOrder),
    [columns]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <DialogTitle>Configure columns: {schema?.plural_name ?? schemaId}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pr-1">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Selected columns (drag to set order)
            </p>
            {sortedColumns.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedColumns.map((c) => c.fieldId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {sortedColumns.map((item) => (
                      <SortableColumnRow
                        key={item.fieldId}
                        item={item}
                        schema={schema}
                        onRemove={() => handleRemove(item.fieldId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No columns selected. Check fields below to add.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Add fields
            </p>
            <div className="flex flex-wrap gap-3">
              {availableFields.map((field) => (
                <label
                  key={field.id}
                  className="flex items-center gap-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                >
                  <Checkbox
                    checked={selectedFieldIds.has(field.id)}
                    onCheckedChange={() => handleToggleField(field.id)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
