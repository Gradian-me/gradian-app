'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import type { GraphNodeData } from '@/domains/graph-designer/types';
import type { DynamicQueryColumnDef } from '../types';

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
  const fromSchema = schema?.fields?.find((f: { id: string; label?: string; name?: string }) => f.id === fieldId);
  if (fromSchema) {
    if (fromSchema.label && String(fromSchema.label).trim()) return fromSchema.label;
    const name = (fromSchema as { name?: string }).name;
    if (name) return humanizeFieldName(name);
    return humanizeFieldName(fieldId);
  }
  const fromSystem = SYSTEM_FIELDS.find((f) => f.id === fieldId);
  return fromSystem?.label ?? humanizeFieldName(fieldId);
}

export interface GroupingItem {
  schemaId: string;
  fieldId: string;
}

function sortableId(item: GroupingItem): string {
  return `${item.schemaId}:${item.fieldId}`;
}

export type ColumnsDialogTab = 'select' | 'grouping';

interface DynamicQueryGroupingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: GraphNodeData[];
  schemas: FormSchema[];
  columns: DynamicQueryColumnDef[];
  onChange: (columns: DynamicQueryColumnDef[]) => void;
  /** Which tab to show when dialog opens */
  initialTab?: ColumnsDialogTab;
}

function SortableGroupingRow({
  item,
  label,
  schemaName,
  onRemove,
}: {
  item: GroupingItem;
  label: string;
  schemaName: string;
  onRemove: () => void;
}) {
  const id = sortableId(item);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded border p-2 transition-all',
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{schemaName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 shrink-0"
          aria-label="Remove from grouping"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DynamicQueryGroupingDialog({
  open,
  onOpenChange,
  nodes,
  schemas,
  columns,
  onChange,
  initialTab = 'select',
}: DynamicQueryGroupingDialogProps) {
  const schemaIdsInGraph = useMemo(() => {
    const set = new Set<string>();
    for (const n of nodes) if (n.schemaId && n.schemaId !== 'parent') set.add(n.schemaId);
    return Array.from(set);
  }, [nodes]);

  const schemaIdToSchema = useMemo(() => {
    const map = new Map<string, FormSchema>();
    for (const s of schemas) map.set(s.id, s);
    return map;
  }, [schemas]);

  const initialOrderedGrouping = useMemo(() => {
    const withGroup = columns.filter(
      (c): c is DynamicQueryColumnDef & { groupOrder: number } =>
        c.groupOrder !== undefined && c.groupOrder >= 0
    );
    withGroup.sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));
    return withGroup.map((c) => ({ schemaId: c.schemaId, fieldId: c.fieldId }));
  }, [columns]);

  const initialOrderedSelect = useMemo(() => {
    const sorted = [...columns].sort((a, b) => a.selectOrder - b.selectOrder);
    return sorted.map((c) => ({ schemaId: c.schemaId, fieldId: c.fieldId }));
  }, [columns]);

  const [activeTab, setActiveTab] = useState<ColumnsDialogTab>(initialTab);
  const [ordered, setOrdered] = useState<GroupingItem[]>(initialOrderedGrouping);
  const [orderedForSelect, setOrderedForSelect] = useState<GroupingItem[]>(initialOrderedSelect);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setOrdered(initialOrderedGrouping);
      setOrderedForSelect(initialOrderedSelect);
    }
  }, [open, initialTab, initialOrderedGrouping, initialOrderedSelect]);

  const orderedSet = useMemo(() => {
    const set = new Set<string>();
    for (const o of ordered) set.add(sortableId(o));
    return set;
  }, [ordered]);

  const selectSet = useMemo(() => {
    const set = new Set<string>();
    for (const o of orderedForSelect) set.add(sortableId(o));
    return set;
  }, [orderedForSelect]);

  const availableFieldsBySchema = useMemo(() => {
    const out = new Map<string, Array<{ id: string; label: string }>>();
    for (const schemaId of schemaIdsInGraph) {
      const schema = schemaIdToSchema.get(schemaId);
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
      out.set(schemaId, list);
    }
    return out;
  }, [schemaIdsInGraph, schemaIdToSchema]);

  const toggleField = useCallback((schemaId: string, fieldId: string) => {
    const key = `${schemaId}:${fieldId}`;
    setOrdered((prev) => {
      if (prev.some((p) => sortableId(p) === key)) {
        return prev.filter((p) => sortableId(p) !== key);
      }
      return [...prev, { schemaId, fieldId }];
    });
  }, []);

  const toggleFieldForSelect = useCallback((schemaId: string, fieldId: string) => {
    const key = `${schemaId}:${fieldId}`;
    setOrderedForSelect((prev) => {
      if (prev.some((p) => sortableId(p) === key)) {
        return prev.filter((p) => sortableId(p) !== key);
      }
      return [...prev, { schemaId, fieldId }];
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrdered((prev) => {
      const ids = prev.map(sortableId);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleDragEndSelect = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedForSelect((prev) => {
      const ids = prev.map(sortableId);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleApply = useCallback(() => {
    const orderMap = new Map<string, number>();
    ordered.forEach((item, index) => {
      orderMap.set(sortableId(item), index);
    });
    const updated: DynamicQueryColumnDef[] = columns.map((c) => {
      const key = sortableId({ schemaId: c.schemaId, fieldId: c.fieldId });
      const idx = orderMap.get(key);
      if (idx !== undefined) return { ...c, groupOrder: idx };
      const { groupOrder: _, ...rest } = c;
      return rest as DynamicQueryColumnDef;
    });
    onChange(updated);
    onOpenChange(false);
  }, [ordered, columns, onChange, onOpenChange]);

  const handleClearAll = useCallback(() => {
    setOrdered([]);
    const updated: DynamicQueryColumnDef[] = columns.map((c) => {
      const { groupOrder: _, ...rest } = c;
      return rest as DynamicQueryColumnDef;
    });
    onChange(updated);
  }, [columns, onChange]);

  const handleApplySelect = useCallback(() => {
    const existingByKey = new Map(
      columns.map((c) => [sortableId({ schemaId: c.schemaId, fieldId: c.fieldId }), c])
    );
    const updated: DynamicQueryColumnDef[] = orderedForSelect.map((item, index) => {
      const key = sortableId(item);
      const existing = existingByKey.get(key);
      return {
        schemaId: item.schemaId,
        fieldId: item.fieldId,
        selectOrder: index,
        groupOrder: existing?.groupOrder,
      };
    });
    onChange(updated);
    onOpenChange(false);
  }, [orderedForSelect, columns, onChange, onOpenChange]);

  const handleClearAllSelect = useCallback(() => {
    setOrderedForSelect([]);
    onChange([]);
  }, [onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const renderAccordion = (checkedSet: Set<string>, onToggle: (schemaId: string, fieldId: string) => void) => (
    schemaIdsInGraph.length === 0 ? (
      <p className="text-sm text-muted-foreground">Add schemas to the graph first.</p>
    ) : (
      <Accordion
        type="single"
        collapsible
        value={openAccordion}
        onValueChange={setOpenAccordion}
        className="w-full"
      >
        {schemaIdsInGraph.map((schemaId) => {
          const schema = schemaIdToSchema.get(schemaId);
          const fields = availableFieldsBySchema.get(schemaId) ?? [];
          const name = schema?.plural_name || schema?.singular_name || schemaId;
          return (
            <AccordionItem key={schemaId} value={schemaId}>
              <AccordionTrigger className="py-3 text-sm">{name}</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-3 pt-1">
                  {fields.map((field, fieldIndex) => {
                    const fieldKey = `${schemaId}:${field.id}`;
                    const rowKey = `${schemaId}:${field.id}:${fieldIndex}`;
                    const checked = checkedSet.has(fieldKey);
                    return (
                      <label
                        key={rowKey}
                        className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => onToggle(schemaId, field.id)}
                        />
                        <span>{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    )
  );

  const renderRightPanel = (
    list: GroupingItem[],
    title: string,
    onClearAll: () => void,
    onDragEnd: (event: DragEndEvent) => void,
    onRemove: (item: GroupingItem) => void
  ) => (
    <div className="w-80 shrink-0 flex flex-col border rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {list.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-red-600"
            onClick={onClearAll}
          >
            Clear all
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Select columns from the left.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={list.map(sortableId)}
              strategy={verticalListSortingStrategy}
            >
              {list.map((item) => {
                const schema = schemaIdToSchema.get(item.schemaId);
                const schemaName = schema?.plural_name || schema?.singular_name || item.schemaId;
                return (
                  <SortableGroupingRow
                    key={sortableId(item)}
                    item={item}
                    label={getFieldLabel(schema, item.fieldId)}
                    schemaName={schemaName}
                    onRemove={() => onRemove(item)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[92vh] h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <DialogTitle>Columns &amp; grouping</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ColumnsDialogTab)} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <TabsList className="shrink-0 w-fit">
            <TabsTrigger value="select">Select columns</TabsTrigger>
            <TabsTrigger value="grouping">Grouping</TabsTrigger>
          </TabsList>
          <TabsContent value="select" className="flex-1 overflow-hidden min-h-0 mt-3 flex flex-col data-[state=inactive]:hidden">
            <p className="text-sm text-muted-foreground shrink-0">
              Choose columns to include and drag to set select order.
            </p>
            <div className="flex flex-1 gap-4 overflow-hidden min-h-0 mt-2">
              <div className="flex-1 overflow-y-auto border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Schemas in graph</p>
                {renderAccordion(selectSet, toggleFieldForSelect)}
              </div>
              {renderRightPanel(
                orderedForSelect,
                'Select order (drag to reorder)',
                handleClearAllSelect,
                handleDragEndSelect,
                (item) => setOrderedForSelect((p) => p.filter((x) => sortableId(x) !== sortableId(item)))
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleApplySelect}>Apply</Button>
            </div>
          </TabsContent>
          <TabsContent value="grouping" className="flex-1 overflow-hidden min-h-0 mt-3 flex flex-col data-[state=inactive]:hidden">
            <p className="text-sm text-muted-foreground shrink-0">
              Select columns to include in grouping, then drag to set the order. Only these columns will have a group order.
            </p>
            <div className="flex flex-1 gap-4 overflow-hidden min-h-0 mt-2">
              <div className="flex-1 overflow-y-auto border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Schemas in graph</p>
                {renderAccordion(orderedSet, toggleField)}
              </div>
              {renderRightPanel(
                ordered,
                'Group order (drag to reorder)',
                handleClearAll,
                handleDragEnd,
                (item) => setOrdered((p) => p.filter((x) => sortableId(x) !== sortableId(item)))
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleApply}>Apply</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
