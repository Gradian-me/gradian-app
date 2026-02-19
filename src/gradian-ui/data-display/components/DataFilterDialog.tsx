'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { X, Plus } from 'lucide-react';
import type { FormSchema, FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import type { FilterItem } from '@/gradian-ui/data-display/types';
import { getDefaultLanguage, getT, isRTL, resolveSchemaFieldLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getFieldLabel, getSystemFieldsList, humanizeFieldName } from '@/gradian-ui/shared/utils/field-label';
import { getFilterStrategy, getComponentTypeFromField } from '@/gradian-ui/data-display/utils/filter-strategy';
import { FilterPaneRenderer } from '@/gradian-ui/data-display/utils/filter-pane-renderer-utils';
import { cn } from '@/lib/utils';

export interface DataFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: FormSchema | null;
  value: FilterItem[];
  onChange: (filterArray: FilterItem[]) => void;
  excludedFieldIds?: Set<string>;
  onApply?: () => void;
  title?: string;
}

function createFilterItemId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Build { column, operator, value } for output (no id). */
function toFilterArrayOutput(items: FilterItem[]): Array<{ column: string; operator: string; value: unknown }> {
  return items.map(({ column, operator, value }) => ({ column, operator, value }));
}

// Helper: treat empty strings, null, undefined and empty ranges as "no value"
function isEmptyFilterValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    const v = value as any;
    if ('from' in v || 'to' in v) {
      const fromEmpty =
        v.from == null || (typeof v.from === 'string' && v.from.trim() === '');
      const toEmpty =
        v.to == null || (typeof v.to === 'string' && v.to.trim() === '');
      return fromEmpty && toEmpty;
    }
    return false;
  }
  return false;
}

export function DataFilterDialog({
  open,
  onOpenChange,
  schema,
  value,
  onChange,
  excludedFieldIds,
  onApply,
  title,
}: DataFilterDialogProps) {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  // Local working copy of filters so Cancel can revert to initial state
  const [items, setItems] = useState<FilterItem[]>(value);
  const [initialItems, setInitialItems] = useState<FilterItem[]>(value);
  const [validationError, setValidationError] = useState<string | null>(null);

  // When dialog is opened, snapshot current external value as initial + working copy
  useEffect(() => {
    if (open) {
      setItems(value);
      setInitialItems(value);
      setValidationError(null);
    }
  }, [open, value]);

  const systemFields = useMemo(
    () => getSystemFieldsList({ schema: schema ?? undefined, language, defaultLang }),
    [schema, language, defaultLang]
  );

  const selectedColumnIds = useMemo(
    () => new Set(items.map((item) => item.column)),
    [items]
  );

  const availableFields = useMemo(() => {
    const alreadySelected = (id: string) => selectedColumnIds.has(id);
    if (!schema?.fields?.length) {
      return systemFields
        .filter((f) => !alreadySelected(f.id))
        .map((f) => ({ id: f.id, name: f.name, label: f.label }));
    }
    const fromSchema = (schema.fields as Array<{ id: string; name?: string; label?: string; hidden?: boolean }>)
      .filter((f) => {
        if (f.hidden) return false;
        if (excludedFieldIds?.has(f.id)) return false;
        if (alreadySelected(f.id)) return false;
        return true;
      })
      .map((f) => ({
        id: f.id,
        name: f.name ?? f.id,
        label: resolveSchemaFieldLabel(f, language, defaultLang) || humanizeFieldName(f.name ?? f.id),
      }));
    const fromSystem = systemFields
      .filter((sf) => !fromSchema.some((x) => x.id === sf.id) && !alreadySelected(sf.id))
      .map((f) => ({ id: f.id, name: f.name, label: f.label }));
    return [...fromSchema, ...fromSystem];
  }, [schema, systemFields, excludedFieldIds, selectedColumnIds, language, defaultLang]);

  const getFieldByColumn = useCallback(
    (column: string): FormField | null => {
      const fromSchema = schema?.fields?.find(
        (f: { id: string; name?: string }) => f.id === column || (f as { name?: string }).name === column
      );
      if (fromSchema) return fromSchema as FormField;
      const sys = systemFields.find((f) => f.id === column || f.name === column);
      if (!sys) return null;
      // Map system fields to correct component based on schema (avoid rendering as text input)
      const base = { id: sys.id, name: sys.name, label: sys.label, sectionId: '' };
      const sg = schema?.statusGroup;
      const etg = schema?.entityTypeGroup;
      const statusGroupId = Array.isArray(sg) && sg.length > 0 ? sg[0]?.id : null;
      const entityTypeGroupId = Array.isArray(etg) && etg.length > 0 ? etg[0]?.id : null;
      switch (column) {
        case 'status':
          if (Array.isArray(sg) && sg.length > 0) {
            return { ...base, component: 'picker', targetSchema: 'status-items', referenceSchema: 'status-groups', referenceRelationTypeId: 'HAS_STATUS_ITEM', referenceEntityId: statusGroupId ?? '{{formSchema.statusGroup.[0].id}}', columnMap: { response: { data: 'data.0.data' }, item: { id: 'id', label: 'label', icon: 'icon', color: 'color' } }, metadata: { allowMultiselect: false } } as FormField;
          }
          break;
        case 'assignedTo':
          if (schema?.allowDataAssignedTo) {
            return { ...base, component: 'picker', targetSchema: 'users', metadata: { allowMultiselect: false } } as FormField;
          }
          break;
        case 'dueDate':
          if (schema?.allowDataDueDate) {
            return { ...base, component: 'date', role: 'duedate' } as FormField;
          }
          break;
        case 'entityType':
          if (Array.isArray(etg) && etg.length > 0) {
            return { ...base, component: 'picker', targetSchema: 'entity-type-items', referenceSchema: 'entity-type-groups', referenceRelationTypeId: 'HAS_ENTITY_TYPE_ITEM', referenceEntityId: entityTypeGroupId ?? '{{formSchema.entityTypeGroup.[0].id}}', columnMap: { response: { data: 'data.0.data' }, item: { id: 'id', label: 'label', icon: 'icon', color: 'color' } }, metadata: { allowMultiselect: false } } as FormField;
          }
          break;
        case 'updatedAt':
        case 'createdAt':
          return { ...base, component: 'datetime' } as FormField;
        case 'updatedBy':
        case 'createdBy':
          return { ...base, component: 'picker', targetSchema: 'users', metadata: { allowMultiselect: false } } as FormField;
        case 'companyId':
          return { ...base, component: 'picker', targetSchema: 'companies', metadata: { allowMultiselect: false } } as FormField;
      }
      // id and others without special config
      return { ...base, component: 'text' } as FormField;
    },
    [schema, systemFields]
  );

  const handleAddFilter = useCallback(
    (fieldId: string) => {
      const field = getFieldByColumn(fieldId);
      const componentType = field ? getComponentTypeFromField(field) : 'text';
      const strategy = getFilterStrategy(componentType);
      const newItem: FilterItem = {
        id: createFilterItemId(),
        column: fieldId,
        operator: strategy.defaultOperator,
        value: undefined,
      };
      setItems((prev) => [...prev, newItem]);
      setFieldPickerOpen(false);
    },
    [getFieldByColumn]
  );

  const handleUpdateItem = useCallback(
    (id: string, updates: Partial<Pick<FilterItem, 'operator' | 'value'>>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const handleRemoveItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    []
  );

  const handleClearAll = useCallback(() => {
    setItems([]);
    setValidationError(null);
    onChange([]);
    onApply?.();
    onOpenChange(false);
  }, [onChange, onApply, onOpenChange]);

  const handleApply = useCallback(() => {
    // Basic validation: for operators that require a value, ensure value is not empty
    const hasInvalid = items.some((item) => {
      const field = getFieldByColumn(item.column);
      const componentType = field ? getComponentTypeFromField(field) : 'text';
      const strategy = getFilterStrategy(componentType);
      const op = item.operator;
      const operatorDef = strategy.operators.find((o) => o.id === op);
      if (!operatorDef) return true; // unknown operator -> invalid
      // Operators that do NOT require a value
      if (op === 'is_empty' || op === 'is_not_empty') return false;
      return isEmptyFilterValue(item.value);
    });

    if (hasInvalid) {
      setValidationError(
        'Please fill values for all filters (except "is empty" / "is not empty") before applying.'
      );
      return;
    }

    setValidationError(null);
    // Commit working copy to parent
    onChange(items);

    const output = toFilterArrayOutput(items);
    setJsonOutput(JSON.stringify(output, null, 2));
    setJsonDialogOpen(true);
    onApply?.();
  }, [items, getFieldByColumn, onChange, onApply]);

  const columnLabel = useCallback(
    (column: string) => getFieldLabel(schema, column, language, defaultLang),
    [schema, language, defaultLang]
  );

  const dialogTitle = title ?? getT(TRANSLATION_KEYS.LABEL_FILTERS, language, defaultLang);
  const addLabel = getT(TRANSLATION_KEYS.BUTTON_ADD, language, defaultLang);
  const applyLabel = getT(TRANSLATION_KEYS.BUTTON_APPLY, language, defaultLang);
  const cancelLabel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const closeLabel = getT(TRANSLATION_KEYS.BUTTON_CLOSE, language, defaultLang);
  const clearAllLabel = getT(TRANSLATION_KEYS.BUTTON_CLEAR_ALL, language, defaultLang);
  const selectFieldLabel = getT(TRANSLATION_KEYS.TITLE_SELECT, language, defaultLang);
  const emptyMessage = getT(TRANSLATION_KEYS.MESSAGE_SELECT_COLUMNS_FROM_LEFT, language, defaultLang);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] min-h-[min(500px,85vh)] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-3 shrink-0">
            <DialogTitle className="text-base sm:text-lg">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-3 sm:gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Popover open={fieldPickerOpen} onOpenChange={setFieldPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 h-9 sm:h-10">
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">{addLabel}</span>
                  </Button>
                </PopoverTrigger>
               <PopoverContent
                 className="w-[min(280px,90vw)] sm:w-72 max-h-[60vh] p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg"
                 align="start"
                 dir={language ? (isRTL(language) ? 'rtl' : 'ltr') : undefined}
               >
                  <p
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 px-2 py-1.5"
                    dir={language ? (isRTL(language) ? 'rtl' : 'ltr') : undefined}
                  >
                    {selectFieldLabel}
                  </p>
                  <div
                    className="mt-1 max-h-64 w-full overflow-y-auto rounded-md"
                    dir={language ? (isRTL(language) ? 'rtl' : 'ltr') : undefined}
                  >
                    <div className="space-y-0.5 py-1">
                      {availableFields.length === 0 ? (
                        <p
                          className="text-sm text-muted-foreground px-2 py-2"
                          dir={language ? (isRTL(language) ? 'rtl' : 'ltr') : undefined}
                        >
                          {emptyMessage}
                        </p>
                      ) : (
                        availableFields.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className={cn(
                              'w-full text-start text-sm px-3 py-2 rounded-md',
                              'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                            )}
                            onClick={() => handleAddFilter(f.id)}
                            dir={language ? (isRTL(language) ? 'rtl' : 'ltr') : undefined}
                          >
                            {f.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 min-h-[140px] sm:min-h-[160px] border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 sm:py-8 text-center">
                  {getT(TRANSLATION_KEYS.EMPTY_CLICK_BUTTON_TO_ADD_ONE, language, defaultLang)}
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 p-3 sm:p-4 max-sm:flex-col max-sm:items-stretch"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate min-w-0 shrink-0 w-24 sm:w-32">
                      {columnLabel(item.column)}
                    </span>
                    <div className="flex-1 min-w-0 flex flex-row flex-wrap items-center gap-2 sm:gap-3 max-sm:flex-col max-sm:items-stretch">
                      <FilterPaneRenderer
                        field={getFieldByColumn(item.column)}
                        operator={item.operator}
                        value={item.value}
                        onOperatorChange={(op) => handleUpdateItem(item.id, { operator: op })}
                        onValueChange={(v) => handleUpdateItem(item.id, { value: v })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 shrink-0"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label={getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            {validationError && (
              <p className="text-xs text-red-600 dark:text-red-400 text-end mt-1">
                {validationError}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-between sm:justify-between items-stretch sm:items-center gap-2 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={items.length === 0}
                className="w-full sm:w-auto text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 order-2 sm:order-1"
              >
                {clearAllLabel}
              </Button>
              <div className="flex flex-col-reverse sm:flex-row gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setItems(initialItems);
                    setValidationError(null);
                    onOpenChange(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  {cancelLabel}
                </Button>
                <Button onClick={handleApply} size="sm" className="w-full sm:w-auto px-4">
                  {applyLabel}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-2 shrink-0">
            <DialogTitle className="text-base sm:text-lg">{getT(TRANSLATION_KEYS.LABEL_FILTERS, language, defaultLang)} (JSON)</DialogTitle>
          </DialogHeader>
          <pre dir="ltr" className="text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-[min(20rem,60vh)] border border-gray-200 dark:border-gray-700 shrink min-h-0">
            {jsonOutput || '[]'}
          </pre>
          <div className="flex justify-end pt-3 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setJsonDialogOpen(false)} className="w-full sm:w-auto">
              {closeLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

DataFilterDialog.displayName = 'DataFilterDialog';
