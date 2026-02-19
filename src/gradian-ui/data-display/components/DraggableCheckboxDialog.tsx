'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
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
import { GripVertical, ArrowUpNarrowWide, ArrowDownWideNarrow, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { SortConfig } from '@/gradian-ui/shared/utils/sort-utils';
import { getDefaultLanguage, getT, resolveSchemaFieldLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getFieldLabel, getSystemFieldsList, humanizeFieldName } from '@/gradian-ui/shared/utils/field-label';

export type DraggableCheckboxDialogMode = 'sorting' | 'grouping' | 'selecting';

/** Single-schema: value is sort or group config. */
export interface DraggableCheckboxDialogPropsBase {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentType: DraggableCheckboxDialogMode;
  enableAccordion?: boolean;
  schema?: FormSchema | null;
  /** Multi-schema: list of schemas and which ids are in graph (for accordion by schema). */
  schemas?: FormSchema[];
  schemaIdsInGraph?: string[];
  title?: string;
  requireApply?: boolean;
  onApply?: () => void;
  excludedFieldIds?: Set<string>;
  excludeMetadataFields?: boolean;
}

export interface DraggableCheckboxDialogSortProps extends DraggableCheckboxDialogPropsBase {
  componentType: 'sorting';
  value: SortConfig[];
  onChange: (value: SortConfig[]) => void;
}

export interface DraggableCheckboxDialogGroupProps extends DraggableCheckboxDialogPropsBase {
  componentType: 'grouping';
  value: { column: string }[];
  onChange: (value: { column: string }[]) => void;
}

export type DraggableCheckboxDialogProps = DraggableCheckboxDialogSortProps | DraggableCheckboxDialogGroupProps;

function SortableSortRow({
  item,
  columnLabel,
  onRemove,
  onToggleDirection,
  isSortable,
}: {
  item: SortConfig;
  columnLabel: string;
  onRemove: () => void;
  onToggleDirection: () => void;
  isSortable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.column,
    disabled: !isSortable,
  });
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
          isDragging ? 'border-violet-400 bg-white dark:bg-gray-800 shadow-md' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
        )}
      >
        <button
          {...attributes}
          {...listeners}
          type="button"
          disabled={!isSortable}
          className={cn('cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-0.5 shrink-0', !isSortable && 'cursor-default opacity-50')}
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
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 shrink-0" aria-label="Remove">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SortableGroupRow({
  column,
  columnLabel,
  onRemove,
}: {
  column: string;
  columnLabel: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column });
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
          isDragging ? 'border-violet-400 bg-white dark:bg-gray-800 shadow-md' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
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
        <div className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 truncate">{columnLabel}</div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 shrink-0" aria-label="Remove">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DraggableCheckboxDialog(props: DraggableCheckboxDialogProps) {
  const {
    open,
    onOpenChange,
    componentType,
    enableAccordion = false,
    schema,
    schemas,
    schemaIdsInGraph,
    title,
    requireApply = false,
    onApply,
    excludedFieldIds,
    excludeMetadataFields = false,
  } = props;

  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const effectiveSchema = schema ?? null;
  const multiSchema = Boolean(schemas?.length && schemaIdsInGraph?.length);
  const schemaIdToSchema = useMemo(() => {
    if (!schemas?.length) return new Map<string, FormSchema>();
    const m = new Map<string, FormSchema>();
    for (const s of schemas) m.set(s.id, s);
    return m;
  }, [schemas]);

  // Per-schema field list including all system fields (id, status, entityType, createdBy, createdAt, updatedBy, updatedAt, and companyId when schema is company-based). Used for grouping and select-columns dialogs in multi-schema mode.
  const availableFieldsBySchema = useMemo(() => {
    if (!multiSchema || !schemaIdsInGraph?.length) return new Map<string, Array<{ id: string; name: string; label: string }>>();
    const out = new Map<string, Array<{ id: string; name: string; label: string }>>();
    for (const schemaId of schemaIdsInGraph) {
      const schema = schemaIdToSchema.get(schemaId);
      const systemList = getSystemFieldsList({ schema: schema ?? undefined, language, defaultLang });
      const list: Array<{ id: string; name: string; label: string }> = [];
      if (schema?.fields) {
        for (const f of schema.fields as Array<{ id: string; name?: string; label?: string; hidden?: boolean }>) {
          if (f.hidden || excludedFieldIds?.has(f.id)) continue;
          if (excludeMetadataFields && (f.id === 'id' || f.id === 'createdAt' || f.id === 'updatedAt')) continue;
          const label = resolveSchemaFieldLabel(f, language, defaultLang) || humanizeFieldName(f.name ?? f.id);
          list.push({ id: f.id, name: f.name ?? f.id, label });
        }
      }
      for (const sf of systemList) {
        if (!list.some((x) => x.id === sf.id)) list.push(sf);
      }
      out.set(schemaId, list);
    }
    return out;
  }, [multiSchema, schemaIdsInGraph, schemaIdToSchema, excludedFieldIds, excludeMetadataFields, language, defaultLang]);

  // All system fields (SYSTEM_FIELDS_BASE) for sorting/grouping single-schema; companyId excluded when schema is not company-based.
  const systemFields = useMemo(
    () => getSystemFieldsList({ schema: effectiveSchema, language, defaultLang }),
    [effectiveSchema, language, defaultLang]
  );

  const availableColumns = useMemo(() => {
    if (!effectiveSchema?.fields?.length) return [];
    const visible = (effectiveSchema.fields as Array<{ id: string; name?: string; label?: string; hidden?: boolean }>).filter((f) => {
      if (f.hidden) return false;
      if (excludedFieldIds?.has(f.id)) return false;
      if (excludeMetadataFields && (f.id === 'id' || f.id === 'createdAt' || f.id === 'updatedAt')) return false;
      return true;
    });
    return visible.map((f) => ({
      id: f.id,
      name: f.name ?? f.id,
      label: resolveSchemaFieldLabel(f, language, defaultLang) || humanizeFieldName(f.name ?? f.id),
    }));
  }, [effectiveSchema, excludedFieldIds, excludeMetadataFields, language, defaultLang]);

  const hasColumns = multiSchema && componentType === 'grouping'
    ? Array.from(availableFieldsBySchema.values()).some((arr) => arr.length > 0)
    : availableColumns.length > 0 || systemFields.length > 0;

  const sortValue = componentType === 'sorting' ? (props as DraggableCheckboxDialogSortProps).value : [];
  const groupValue = componentType === 'grouping' ? (props as DraggableCheckboxDialogGroupProps).value : [];

  const [sortDraft, setSortDraft] = useState<SortConfig[]>(sortValue);
  const [groupDraft, setGroupDraft] = useState<{ column: string }[]>(groupValue);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (open) {
      setSortDraft(componentType === 'sorting' ? (props as DraggableCheckboxDialogSortProps).value : []);
      setGroupDraft(componentType === 'grouping' ? (props as DraggableCheckboxDialogGroupProps).value : []);
    }
  }, [open, componentType, props.value]);

  const sortDisplayValue = requireApply && componentType === 'sorting' ? sortDraft : (componentType === 'sorting' ? sortValue : []);
  const groupDisplayValue = requireApply && componentType === 'grouping' ? groupDraft : (componentType === 'grouping' ? groupValue : []);

  const sortValueRef = useRef(sortDisplayValue);
  const groupValueRef = useRef(groupDisplayValue);
  useEffect(() => {
    sortValueRef.current = sortDisplayValue;
  }, [sortDisplayValue]);
  useEffect(() => {
    groupValueRef.current = groupDisplayValue;
  }, [groupDisplayValue]);

  const onSortChange = componentType === 'sorting' ? (props as DraggableCheckboxDialogSortProps).onChange : undefined;
  const onGroupChange = componentType === 'grouping' ? (props as DraggableCheckboxDialogGroupProps).onChange : undefined;

  const handleToggle = useCallback(
    (columnId: string) => {
      const col = availableColumns.find((c) => c.id === columnId) || systemFields.find((f) => f.id === columnId);
      if (!col || componentType !== 'sorting' || !onSortChange) return;
      const name = col.name;
      const cur = sortValueRef.current;
      const isSelected = cur.some((item) => item.column === name);
      const next = isSelected ? cur.filter((item) => item.column !== name) : [...cur, { column: name, isAscending: true }];
      if (requireApply) setSortDraft(next);
      else onSortChange(next);
    },
    [availableColumns, systemFields, onSortChange, requireApply, componentType]
  );

  const handleRemoveSort = useCallback(
    (column: string) => {
      if (componentType !== 'sorting' || !onSortChange) return;
      const next = sortValueRef.current.filter((item) => item.column !== column);
      if (requireApply) setSortDraft(next);
      else onSortChange(next);
    },
    [onSortChange, requireApply, componentType]
  );

  const handleToggleDirection = useCallback(
    (column: string) => {
      if (componentType !== 'sorting' || !onSortChange) return;
      const next = sortValueRef.current.map((item) => (item.column === column ? { ...item, isAscending: !item.isAscending } : item));
      if (requireApply) setSortDraft(next);
      else onSortChange(next);
    },
    [onSortChange, requireApply, componentType]
  );

  const handleDragEndSort = useCallback(
    (event: DragEndEvent) => {
      if (componentType !== 'sorting' || !onSortChange) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const cur = sortValueRef.current;
      const oldIndex = cur.findIndex((item) => item.column === active.id);
      const newIndex = cur.findIndex((item) => item.column === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(cur, oldIndex, newIndex);
      if (requireApply) setSortDraft(reordered);
      else onSortChange(reordered);
    },
    [onSortChange, requireApply, componentType]
  );

  const handleClearAllSort = useCallback(() => {
    if (componentType !== 'sorting' || !onSortChange) return;
    if (requireApply) setSortDraft([]);
    else onSortChange([]);
  }, [onSortChange, requireApply, componentType]);

  const handleApplySort = useCallback(() => {
    if (componentType !== 'sorting' || !onSortChange) return;
    onSortChange(sortDraft);
    onApply?.();
  }, [sortDraft, onSortChange, onApply, componentType]);

  const handleToggleGroup = useCallback(
    (columnId: string) => {
      if (componentType !== 'grouping' || !onGroupChange) return;
      const col = !multiSchema ? (availableColumns.find((c) => c.id === columnId) || systemFields.find((f) => f.id === columnId)) : null;
      const name = multiSchema ? columnId : (col?.name ?? columnId);
      if (!multiSchema && !col) return;
      const cur = groupValueRef.current;
      const isSelected = cur.some((item) => item.column === name);
      const next = isSelected ? cur.filter((item) => item.column !== name) : [...cur, { column: name }];
      if (requireApply) setGroupDraft(next);
      else onGroupChange(next);
    },
    [availableColumns, systemFields, onGroupChange, requireApply, componentType, multiSchema]
  );

  const handleRemoveGroup = useCallback(
    (column: string) => {
      if (componentType !== 'grouping' || !onGroupChange) return;
      const next = groupValueRef.current.filter((item) => item.column !== column);
      if (requireApply) setGroupDraft(next);
      else onGroupChange(next);
    },
    [onGroupChange, requireApply, componentType]
  );

  const handleDragEndGroup = useCallback(
    (event: DragEndEvent) => {
      if (componentType !== 'grouping' || !onGroupChange) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const cur = groupValueRef.current;
      const oldIndex = cur.findIndex((item) => item.column === active.id);
      const newIndex = cur.findIndex((item) => item.column === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(cur, oldIndex, newIndex);
      if (requireApply) setGroupDraft(reordered);
      else onGroupChange(reordered);
    },
    [onGroupChange, requireApply, componentType]
  );

  const handleClearAllGroup = useCallback(() => {
    if (componentType !== 'grouping' || !onGroupChange) return;
    if (requireApply) setGroupDraft([]);
    else onGroupChange([]);
  }, [onGroupChange, requireApply, componentType]);

  const handleApplyGroup = useCallback(() => {
    if (componentType !== 'grouping' || !onGroupChange) return;
    onGroupChange(groupDraft);
    onApply?.();
  }, [groupDraft, onGroupChange, onApply, componentType]);

  const getColumnLabel = (column: string) => {
    const c = availableColumns.find((x) => x.name === column) || systemFields.find((x) => x.name === column);
    return c?.label ?? column;
  };

  const getGroupColumnLabel = (column: string) => {
    if (multiSchema && column.includes(':')) {
      const idx = column.indexOf(':');
      const schemaId = column.slice(0, idx);
      const fieldId = column.slice(idx + 1);
      const s = schemaIdToSchema.get(schemaId);
      return getFieldLabel(s, fieldId, language, defaultLang);
    }
    return getFieldLabel(effectiveSchema, column, language, defaultLang);
  };

  if (componentType === 'sorting') {
    const rightTitle = getT(TRANSLATION_KEYS.LABEL_SORT_ORDER, language, defaultLang);
    const emptyMessage = getT(TRANSLATION_KEYS.MESSAGE_SELECT_COLUMNS_FROM_LEFT, language, defaultLang);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full rounded-none sm:rounded-2xl lg:max-w-4xl lg:max-h-[85vh] lg:h-auto overflow-hidden flex flex-col">
          <DialogHeader className="pb-3">
            <DialogTitle>{title ?? getT(TRANSLATION_KEYS.TITLE_SORT_DATA, language, defaultLang)}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 shrink-0">
                {getT(TRANSLATION_KEYS.LABEL_COLUMNS, language, defaultLang)}
              </p>
              {!hasColumns ? (
                <p className="text-sm text-muted-foreground">
                  {getT(TRANSLATION_KEYS.MESSAGE_NO_COLUMNS_AVAILABLE_FOR_SORTING, language, defaultLang)}
                </p>
              ) : (
                <div className="space-y-3">
                  {availableColumns.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {getT(TRANSLATION_KEYS.LABEL_COLUMNS, language, defaultLang)}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {availableColumns.map((col) => {
                          const checked = sortDisplayValue.some((item) => item.column === col.name);
                          return (
                            <label key={col.id} className="flex items-center gap-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                              <Checkbox checked={checked} onCheckedChange={() => handleToggle(col.id)} />
                              <span>{col.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {systemFields.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {getT(TRANSLATION_KEYS.LABEL_SYSTEM, language, defaultLang)}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {systemFields.map((f) => {
                          const checked = sortDisplayValue.some((item) => item.column === f.name);
                          return (
                            <label key={f.id} className="flex items-center gap-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                              <Checkbox checked={checked} onCheckedChange={() => handleToggle(f.id)} />
                              <span>{f.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="w-80 shrink-0 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-hidden">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rightTitle}</p>
                {sortDisplayValue.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-red-600" onClick={handleClearAllSort}>
                    {getT(TRANSLATION_KEYS.BUTTON_CLEAR_ALL, language, defaultLang)}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 min-h-[120px]">
                {sortDisplayValue.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSort}>
                    <SortableContext items={sortDisplayValue.map((i) => i.column)} strategy={verticalListSortingStrategy}>
                      {sortDisplayValue.map((item) => (
                        <SortableSortRow
                          key={item.column}
                          item={item}
                          columnLabel={getColumnLabel(item.column)}
                          onRemove={() => handleRemoveSort(item.column)}
                          onToggleDirection={() => handleToggleDirection(item.column)}
                          isSortable={sortDisplayValue.length > 1}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
          {requireApply && (
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang)}
              </Button>
              <Button onClick={handleApplySort} size="sm" className="px-4">
                {getT(TRANSLATION_KEYS.BUTTON_APPLY, language, defaultLang)}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // componentType === 'grouping'
  const rightTitleGroup = getT(TRANSLATION_KEYS.LABEL_GROUP_ORDER_DRAG, language ?? defaultLang, defaultLang);
  const emptyMessageGroup = getT(TRANSLATION_KEYS.MESSAGE_SELECT_COLUMNS_FROM_LEFT_GROUP, language ?? defaultLang, defaultLang);

  const leftPanelGrouping = multiSchema ? (
    schemaIdsInGraph?.length === 0 ? (
      <p className="text-sm text-muted-foreground">{getT(TRANSLATION_KEYS.MESSAGE_ADD_SCHEMAS_TO_GRAPH_FIRST, language ?? defaultLang, defaultLang)}</p>
    ) : (
      <Accordion type="single" collapsible value={openAccordion} onValueChange={setOpenAccordion} className="w-full">
        {schemaIdsInGraph?.map((schemaId) => {
          const schema = schemaIdToSchema.get(schemaId);
          const fields = availableFieldsBySchema.get(schemaId) ?? [];
          const name = schema?.plural_name || schema?.singular_name || schemaId;
          return (
            <AccordionItem key={schemaId} value={schemaId}>
              <AccordionTrigger className="py-3 text-sm">{name}</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-3 pt-1">
                  {fields.map((field) => {
                    const compositeId = `${schemaId}:${field.id}`;
                    const checked = groupDisplayValue.some((item) => item.column === compositeId);
                    return (
                      <label
                        key={compositeId}
                        className="flex items-center gap-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => handleToggleGroup(compositeId)} />
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
  ) : (
    <div className="space-y-3">
      {availableColumns.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {getT(TRANSLATION_KEYS.LABEL_COLUMNS, language, defaultLang)}
          </p>
          <div className="flex flex-wrap gap-3">
            {availableColumns.map((col) => {
              const checked = groupDisplayValue.some((item) => item.column === col.name);
              return (
                <label key={col.id} className="flex items-center gap-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <Checkbox checked={checked} onCheckedChange={() => handleToggleGroup(col.id)} />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      {systemFields.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {getT(TRANSLATION_KEYS.LABEL_SYSTEM, language, defaultLang)}
          </p>
          <div className="flex flex-wrap gap-3">
            {systemFields.map((f) => {
              const checked = groupDisplayValue.some((item) => item.column === f.name);
              return (
                <label key={f.id} className="flex items-center gap-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <Checkbox checked={checked} onCheckedChange={() => handleToggleGroup(f.id)} />
                  <span>{f.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full rounded-none sm:rounded-2xl lg:max-w-4xl lg:max-h-[85vh] lg:h-auto overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <DialogTitle>{title ?? getT(TRANSLATION_KEYS.TITLE_GROUP_BY, language ?? defaultLang, defaultLang)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 shrink-0">
              {multiSchema ? getT(TRANSLATION_KEYS.LABEL_SCHEMAS_IN_GRAPH, language ?? defaultLang, defaultLang) : getT(TRANSLATION_KEYS.LABEL_COLUMNS, language ?? defaultLang, defaultLang)}
            </p>
            {!hasColumns ? (
              <p className="text-sm text-muted-foreground">
                {getT(TRANSLATION_KEYS.MESSAGE_NO_COLUMNS_AVAILABLE_FOR_SORTING, language, defaultLang)}
              </p>
            ) : (
              leftPanelGrouping
            )}
          </div>
          <div className="w-80 shrink-0 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rightTitleGroup}</p>
              {groupDisplayValue.length > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-red-600" onClick={handleClearAllGroup}>
                  {getT(TRANSLATION_KEYS.BUTTON_CLEAR_ALL, language, defaultLang)}
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-[120px]">
              {groupDisplayValue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{emptyMessageGroup}</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndGroup}>
                  <SortableContext items={groupDisplayValue.map((i) => i.column)} strategy={verticalListSortingStrategy}>
                    {groupDisplayValue.map((item) => (
                      <SortableGroupRow
                        key={item.column}
                        column={item.column}
                        columnLabel={getGroupColumnLabel(item.column)}
                        onRemove={() => handleRemoveGroup(item.column)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
        {requireApply && (
          <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang)}
            </Button>
            <Button onClick={handleApplyGroup} size="sm" className="px-4">
              {getT(TRANSLATION_KEYS.BUTTON_APPLY, language, defaultLang)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

DraggableCheckboxDialog.displayName = 'DraggableCheckboxDialog';
