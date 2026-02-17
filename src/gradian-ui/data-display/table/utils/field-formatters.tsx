import React, { useState } from 'react';
import { Link as LinkIcon, Check, X, CheckSquare, Square, Languages } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/gradian-ui/shared/utils';
import { BadgeViewer } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';
import type { BadgeItem } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';
import { Badge } from '@/components/ui/badge';
import { IconRenderer, isValidLucideIcon } from '@/gradian-ui/shared/utils/icon-renderer';
import { getBadgeConfig, getValidBadgeVariant } from '../../utils';
import { normalizeOptionArray } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import {
  isTranslationArray,
  resolveFromTranslationsArray,
  getDefaultLanguage,
  resolveSchemaFieldLabel,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import {
  getDisplayStrings,
  getJoinedDisplayString,
  getPickerDisplayValue,
  renderRatingValue,
} from '../../utils/value-display';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar } from '@/gradian-ui/form-builder/form-elements/components/Avatar';
import { ForceIcon } from '@/gradian-ui/form-builder/form-elements/components/ForceIcon';
import { Countdown } from '@/gradian-ui/form-builder/form-elements/components/Countdown';
import { AvatarUser } from '../../components/AvatarUser';
import { toast } from 'sonner';
import { cn } from '@/gradian-ui/shared/utils';
import { CodeBadge } from '@/gradian-ui/form-builder/form-elements/components/CodeBadge';
import { FormulaDisplay } from '@/gradian-ui/form-builder/form-elements/components/FormulaDisplay';
import { replaceDynamicContext } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { TranslationDialog } from '@/gradian-ui/form-builder/form-elements/components/TranslationDialog';
import { getDefaultLanguage as getDefLang } from '@/gradian-ui/shared/utils/translation-utils';

/** Schema field shape for resolving label by language. */
type FieldForLabel = { label?: string; translations?: Array<Record<string, string>> };

/** Renders resolved translation text + a button to open TranslationDialog in view mode. */
function TranslationViewCell({
  displayText,
  rawValue,
  fieldLabel,
  field,
  isTextarea,
}: {
  displayText: string;
  rawValue: Array<Record<string, string>>;
  fieldLabel?: string;
  /** When provided, dialog title is resolved from field.translations/label by current language. */
  field?: FieldForLabel | null;
  isTextarea?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const defaultLang = getDefLang();
  const language = useLanguageStore((s) => s.language);
  const resolvedTitle =
    field ? resolveSchemaFieldLabel(field, language, defaultLang) : fieldLabel;
  const title = resolvedTitle || fieldLabel || '';
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 leading-relaxed min-h-6">
      <span className="min-w-0 truncate leading-relaxed py-0.5" dir="auto" title={displayText}>
        {displayText}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        title="View translations"
        aria-label="View translations"
      >
        <Languages className="h-4 w-4" />
      </Button>
      <TranslationDialog
        open={open}
        onOpenChange={setOpen}
        value={rawValue}
        isTextarea={isTextarea}
        title={title}
        defaultLanguage={defaultLang}
        viewMode
      />
    </span>
  );
}

/** Get raw value from row without resolving translation arrays (for detecting + showing translation button). */
function getRawFieldValue(field: any, row: any): any {
  if (!field || !row) return undefined;
  if (field.source) {
    const { safeGetByPath } = require('@/gradian-ui/shared/utils/security-utils');
    return safeGetByPath(row, field.source) ?? undefined;
  }
  if (field.compute && typeof field.compute === 'function') {
    return field.compute(row);
  }
  return row[field.name];
}

export const getFieldValue = (field: any, row: any): any => {
  if (!field || !row) return null;
  const raw = getRawFieldValue(field, row);
  if (raw != null && isTranslationArray(raw)) {
    const lang = useLanguageStore.getState?.()?.language || getDefaultLanguage();
    const defaultLang = getDefaultLanguage();
    return resolveFromTranslationsArray(raw, lang, defaultLang);
  }
  return raw ?? null;
};

export const formatRelationType = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value.replace(/_/g, ' ').toLowerCase();
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Helper to check if record is inactive
const isRecordInactive = (row?: any): boolean => {
  if (!row) return false;
  
  // Check inactive field
  if (row.inactive === true) return true;
  
  // Check status field for inactive status
  const status = row.status;
  if (status) {
    if (Array.isArray(status) && status.length > 0) {
      const statusItem = status[0];
      const statusLabel = statusItem?.label || statusItem?.id || '';
      if (typeof statusLabel === 'string' && statusLabel.toLowerCase() === 'inactive') {
        return true;
      }
    } else if (typeof status === 'string' && status.toLowerCase() === 'inactive') {
      return true;
    }
  }
  
  return false;
};

// Helper to wrap content with ForceIcon if isForce is true and field is title role
// Also applies strike-through if record is inactive, bold styling for title, and copy button for title content
const wrapWithForceIcon = (
  content: React.ReactNode,
  isForce: boolean,
  field?: any,
  row?: any
): React.ReactNode => {
  const isInactive = isRecordInactive(row);
  const isTitle = field?.role === 'title';

  let wrappedContent = isTitle ? (
    <span className="font-semibold w-full block">{content}</span>
  ) : (
    content
  );

  // Apply strike-through to title if inactive
  wrappedContent =
    isInactive && isTitle ? <span className="line-through">{wrappedContent}</span> : wrappedContent;

  // Get title from row data for copy content (only for title role)
  const titleValue = isTitle && row ? getFieldValue(field, row) : undefined;
  const title = titleValue ? String(titleValue).trim() : undefined;

  // Enhance title fields with copy-to-clipboard action when we have a non-empty title
  const contentWithCopy =
    isTitle && title ? (
      <span className="inline-flex items-center gap-1.5">
        <span className="min-w-0">{wrappedContent}</span>
        <CopyContent content={title} />
      </span>
    ) : (
      wrappedContent
    );

  // Only show ForceIcon for title role fields
  if (!isForce || !isTitle) return contentWithCopy;

  return (
    <span className="inline-flex items-center gap-1.5">
      <ForceIcon isForce={isForce} size="md" forceReason={row?.forceReason} title={title} />
      {contentWithCopy}
    </span>
  );
};

export const formatFieldValue = (
  field: any,
  value: any,
  row?: any,
  showForceIcon: boolean = true,
  highlightQuery?: string
): React.ReactNode => {
  // Use raw value from row when available so we can detect translation arrays even when accessor returns resolved string
  const rawValueFromRow = row ? getRawFieldValue(field, row) : value;
  const isTranslatable =
    rawValueFromRow != null &&
    isTranslationArray(rawValueFromRow) &&
    Array.isArray(rawValueFromRow) &&
    rawValueFromRow.length > 1;

  const lang = useLanguageStore.getState?.()?.language || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  // Resolve translation-array values to display string (selected language, default language, or first non-empty)
  let resolvedValue = value;
  if (isTranslatable) {
    resolvedValue = resolveFromTranslationsArray(rawValueFromRow, lang, defaultLang);
  } else if (value != null && isTranslationArray(value)) {
    resolvedValue = resolveFromTranslationsArray(value, lang, defaultLang);
  }

  // Check if row has isForce flag - only show for title role fields
  const isForce = showForceIcon && row?.isForce === true && field?.role === 'title';
  const isInactive = isRecordInactive(row);
  const isTitle = field?.role === 'title';
  
  // Handle formula fields - show calculated result with view button
  if (field?.component === 'formula' && field?.formula) {
    return wrapWithForceIcon(
      <FormulaDisplay field={field} data={row} />,
      isForce,
      field,
      row
    );
  }
  
  // Handle JSON fields - show button that opens dialog with CodeViewer
  if (field?.component === 'json') {
    // Convert value to JSON string if it's an object/array
    let jsonString: string;
    if (value === null || value === undefined) {
      jsonString = 'null';
    } else if (typeof value === 'string') {
      // Try to parse and reformat if it's already a JSON string
      try {
        const parsed = JSON.parse(value);
        jsonString = JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, use as-is
        jsonString = value;
      }
    } else {
      // Convert object/array to JSON string
      try {
        jsonString = JSON.stringify(value, null, 2);
      } catch {
        jsonString = String(value);
      }
    }
    
    // Helper to truncate JSON for preview
    const truncateJson = (json: string, maxLength: number = 100): string => {
      if (json.length <= maxLength) return json;
      return json.substring(0, maxLength).trim() + '...';
    };
    
    const previewText = truncateJson(jsonString);
    const fieldLabel = field?.label || field?.name || 'JSON';
    
    return wrapWithForceIcon(
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            dir="auto"
            className="text-xs text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 underline font-medium font-mono text-start max-w-full"
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            title="Click to view full JSON"
          >
            {previewText}
          </button>
        </DialogTrigger>
        <DialogContent 
          className={cn(
            "w-full h-full lg:max-w-5xl lg:h-auto lg:max-h-[90vh] overflow-hidden flex flex-col"
          )}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{fieldLabel}</DialogTitle>
              <CopyContent content={jsonString} />
            </div>
          </DialogHeader>
          <div className="mt-4 flex-1 overflow-auto">
            <CodeViewer
              code={jsonString}
              programmingLanguage="json"
              title={fieldLabel}
              initialLineNumbers={20}
            />
          </div>
        </DialogContent>
      </Dialog>,
      isForce,
      field,
      row
    );
  }
  
  if (resolvedValue === null || resolvedValue === undefined || resolvedValue === '') {
    // Still show ForceIcon even if value is empty (only for title role)
    if (isForce && isTitle) {
      const emptyContent = <span className={cn("text-gray-400 w-full block", isTitle && "font-semibold")} dir="auto">—</span>;
      const inactiveContent = isInactive ? <span className="line-through">{emptyContent}</span> : emptyContent;
      return (
        <span className="inline-flex items-center gap-1.5">
          <ForceIcon isForce={isForce} size="md" forceReason={row?.forceReason} />
          {inactiveContent}
        </span>
      );
    }
    const emptyContent = <span className={cn("text-gray-400 w-full block", isTitle && "font-semibold")} dir="auto">—</span>;
    return isInactive && isTitle ? <span className="line-through">{emptyContent}</span> : emptyContent;
  }

  // Translation-array field: show resolved text + button to open dialog in view mode (use raw from row so table/card both get button)
  if (isTranslatable && rawValueFromRow) {
    return wrapWithForceIcon(
      <TranslationViewCell
        displayText={resolvedValue as string}
        rawValue={rawValueFromRow}
        fieldLabel={field?.label}
        field={field}
        isTextarea={field?.component === 'textarea'}
      />,
      isForce,
      field,
      row
    );
  }

  // If value is an array of IDs (strings) and field has options, resolve labels from options first
  // This applies to checkbox-list, picker fields, select fields, and any field that stores IDs but needs to display labels
  // Keep already-resolved translation-array string; do not overwrite with raw value
  resolvedValue = value;
  const isCheckboxList = field?.component === 'checkbox-list' || field?.component === 'checkboxlist' || field?.component === 'checkbox_list';
  const isSelect = field?.component === 'select';
  const isRadio = field?.component === 'radio' || field?.component === 'radio-group' || field?.component === 'radiogroup';
  const isToggleGroup = field?.component === 'toggle-group' || field?.component === 'togglegroup';
  
  // Handle arrays that might contain IDs or objects with just {id}
  if (Array.isArray(value) && value.length > 0) {
    // Check if items are objects with just {id} (like [{id: "..."}])
    const valueIsIdObjects = value.every((item: any) => 
      typeof item === 'object' && item !== null && item.id && Object.keys(item).length === 1
    );
    
    // Check if all items are likely IDs (strings without spaces, length > 10 for ULID format)
    const valueIsStringIds = value.every((item: any) => 
      typeof item === 'string' && !item.includes(' ') && item.length > 10
    );
    
    // Extract IDs if items are {id} objects
    if (valueIsIdObjects) {
      const extractedIds = value.map((item: any) => item.id);
      // Try to resolve from field options if available
      if (field?.options && Array.isArray(field.options) && field.options.length > 0) {
        resolvedValue = extractedIds.map((id: string) => {
          const option = field.options.find((opt: any) => 
            String(opt.id || opt.value) === String(id)
          );
          if (option) {
            return { ...option };
          }
          return { id, label: id };
        });
      } else {
        // No options to resolve from, keep as IDs
        resolvedValue = extractedIds;
      }
    } else if (valueIsStringIds && field?.options && Array.isArray(field.options) && field.options.length > 0) {
      // Items are string IDs, try to resolve from field options
      const shouldResolve = valueIsStringIds || isCheckboxList || isSelect || isRadio || isToggleGroup;
      
      if (shouldResolve) {
        // Map IDs to option objects with labels, icons, colors
        resolvedValue = value.map((id: string) => {
          const option = field.options.find((opt: any) => 
            String(opt.id || opt.value) === String(id)
          );
          // Return the full option object if found (has label, icon, color), otherwise create fallback
          if (option) {
            // Return a copy of the option object to ensure all properties are preserved
            return { ...option };
          }
          return { id, label: id }; // Fallback to ID if option not found
        });
      }
    }
  }
  
  const normalizedOptions = normalizeOptionArray(resolvedValue);
  const displayStrings = getDisplayStrings(resolvedValue);
  const hasStructuredOptions =
    displayStrings.length > 0 &&
    (Array.isArray(resolvedValue) || (typeof resolvedValue === 'object' && resolvedValue !== null));

  // Handle checkbox-list component - render as badges with labels, icons, colors
  // Checkbox-list always stores values as arrays of IDs, so we need to ensure they're resolved
  if (field?.component === 'checkbox-list' || field?.component === 'checkboxlist' || field?.component === 'checkbox_list') {
    if (!resolvedValue || (Array.isArray(resolvedValue) && resolvedValue.length === 0)) {
      return <span className="text-gray-400">—</span>;
    }
    
    // Ensure resolvedValue is an array
    const checkboxItems = Array.isArray(resolvedValue) ? resolvedValue : [resolvedValue];
    
    // Check if resolvedValue contains option objects with labels (from ID resolution)
    // If not, the ID resolution didn't work, so BadgeViewer will handle it
    // BadgeViewer's convertValueToBadgeItems will:
    // 1. Use normalizeOptionArray to extract labels from resolved option objects
    // 2. Use findBadgeOption to look up options if values are still IDs
    // So we pass resolvedValue (which may be resolved option objects or original IDs)
    const valueToPass = resolvedValue;
    
    // Use BadgeViewer to display checkbox list items with proper formatting
    const handleBadgeClick = (item: BadgeItem) => {
      const candidateId = item.normalized?.id ?? item.id;
      if (!candidateId) return;
      
      // For dynamic fields, use targetSchema from the enriched value item (from relation)
      // This is the resolved targetSchema from /api/relations, not the template
      // FIRST: Check the row data directly (most reliable source for enriched data)
      let targetSchema: string | undefined;
      if (row && field?.name) {
        const fieldValue = row[field.name];
        if (Array.isArray(fieldValue)) {
          const matchingItem = fieldValue.find((val: any) => {
            const valId = typeof val === 'object' && val !== null ? val.id : val;
            return String(valId) === String(candidateId);
          });
          if (matchingItem && typeof matchingItem === 'object' && matchingItem !== null) {
            targetSchema = (matchingItem as any).targetSchema;
          }
        } else if (fieldValue && typeof fieldValue === 'object') {
          const valId = fieldValue.id;
          if (String(valId) === String(candidateId)) {
            targetSchema = (fieldValue as any).targetSchema;
          }
        }
      }
      
      // SECOND: Check normalized, original, and direct item properties
      if (!targetSchema) {
        targetSchema = 
          item.normalized?.targetSchema || 
          (item.original as any)?.targetSchema ||
          (item as any).targetSchema;
      }
      
      // Fallback to field.targetSchema if not available in item (for non-relation cases)
      if (!targetSchema) {
        const rawTargetSchema = field?.targetSchema;
        if (!rawTargetSchema) return;

        // Resolve dynamic targetSchema (e.g., "{{formData.resourceType}}") using row data
        // The row contains the formData values, so we can use it to resolve templates
        targetSchema = replaceDynamicContext(rawTargetSchema, { formData: row });

        // Skip if still contains unresolved templates
        if (targetSchema.includes('{{') && targetSchema.includes('}}')) {
          console.warn('[formatFieldValue] Could not resolve targetSchema template:', rawTargetSchema, 'with row:', row);
          return;
        }
      }

      // Ensure we have a valid targetSchema before creating URL
      if (!targetSchema || targetSchema.trim() === '') {
        console.warn('[formatFieldValue] Empty targetSchema for item:', item);
        return;
      }

      const url = `/page/${targetSchema.trim()}/${encodeURIComponent(candidateId)}?showBack=true`;
      if (typeof window !== 'undefined') {
        window.open(url, '_self');
      }
    };

    return wrapWithForceIcon(
      <BadgeViewer
        field={field}
        value={valueToPass}
        badgeVariant={field.roleColor || "default"}
        enforceVariant={false}
        animate={true}
        onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
        isItemClickable={
          field?.targetSchema
            ? (item) => Boolean(item.normalized?.id ?? item.id)
            : () => false
        }
      />,
      isForce,
      field,
      row
    );
  }

  // Handle select component - render similar to picker fields with badges
  // Select fields can have targetSchema (like picker) or static options
  if (field?.component === 'select') {
    if (!resolvedValue || (Array.isArray(resolvedValue) && resolvedValue.length === 0)) {
      return <span className="text-gray-400">—</span>;
    }
    
    // For select fields, value might be a single item or array
    // If it's an array with one item, use that item; if it's a single object, use it directly
    const selectValue = Array.isArray(resolvedValue) 
      ? (resolvedValue.length === 1 ? resolvedValue[0] : resolvedValue)
      : resolvedValue;
    
    // Check if value looks like a picker/select value (object with id/label or array of such objects)
    const looksLikeSelectValue = (val: any): boolean => {
      if (Array.isArray(val) && val.length > 0) {
        return val.some(item => 
          (typeof item === 'object' && item !== null && (item.id || item.label || item.name || item.title))
        );
      }
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return !!(val.id || val.label || val.name || val.title || val.value);
      }
      return false;
    };
    
    // If it looks like a select value (has targetSchema or looks like picker value), use BadgeViewer
    if (field?.targetSchema || looksLikeSelectValue(selectValue)) {
      const handleBadgeClick = (item: BadgeItem) => {
        const candidateId = item.normalized?.id ?? item.id;
        if (!candidateId) return;
        
        // For dynamic fields, use targetSchema from the enriched value item (from relation)
        // This is the resolved targetSchema from /api/relations, not the template
        // FIRST: Check the row data directly (most reliable source for enriched data)
        let targetSchema: string | undefined;
        if (row && field?.name) {
          const fieldValue = row[field.name];
          if (Array.isArray(fieldValue)) {
            const matchingItem = fieldValue.find((val: any) => {
              const valId = typeof val === 'object' && val !== null ? val.id : val;
              return String(valId) === String(candidateId);
            });
            if (matchingItem && typeof matchingItem === 'object' && matchingItem !== null) {
              targetSchema = (matchingItem as any).targetSchema;
            }
          } else if (fieldValue && typeof fieldValue === 'object') {
            const valId = fieldValue.id;
            if (String(valId) === String(candidateId)) {
              targetSchema = (fieldValue as any).targetSchema;
            }
          }
        }
        
        // SECOND: Check normalized, original, and direct item properties
        if (!targetSchema) {
          targetSchema = 
            item.normalized?.targetSchema || 
            (item.original as any)?.targetSchema ||
            (item as any).targetSchema;
        }
        
        // Fallback to field.targetSchema if not available in item (for non-relation cases)
        if (!targetSchema) {
          const rawTargetSchema = field?.targetSchema;
          if (!rawTargetSchema) return;

          // Resolve dynamic targetSchema (e.g., "{{formData.resourceType}}") using row data
          // The row contains the formData values, so we can use it to resolve templates
          targetSchema = replaceDynamicContext(rawTargetSchema, { formData: row });

          // Skip if still contains unresolved templates
          if (targetSchema.includes('{{') && targetSchema.includes('}}')) {
            console.warn('[formatFieldValue] Could not resolve targetSchema template:', rawTargetSchema, 'Row data:', row);
            return;
          }
        }

        // Ensure we have a valid targetSchema before creating URL
        if (!targetSchema || targetSchema.trim() === '') {
          console.warn('[formatFieldValue] Empty targetSchema for item:', item);
          return;
        }

        const url = `/page/${targetSchema.trim()}/${encodeURIComponent(candidateId)}?showBack=true`;
        if (typeof window !== 'undefined') {
          window.open(url, '_self');
        }
      };

      // Normalize to array for BadgeViewer (it handles both single and array values)
      const valueToPass = Array.isArray(selectValue) ? selectValue : [selectValue];

      return wrapWithForceIcon(
        <BadgeViewer
          field={field}
          value={valueToPass}
          badgeVariant={field.roleColor || "default"}
          enforceVariant={false}
          animate={true}
          onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
          isItemClickable={
            field?.targetSchema
              ? (item) => Boolean(item.normalized?.id ?? item.id)
              : () => false
          }
        />,
        isForce,
        field,
        row
      );
    }
    
    // Fallback: try to get display value
    const displayValue = typeof selectValue === 'object' && selectValue !== null
      ? (selectValue.label || selectValue.name || selectValue.title || selectValue.value || selectValue.id)
      : String(selectValue);
    
    if (displayValue) {
      return wrapWithForceIcon(<span className="w-full block" dir="auto">{String(displayValue)}</span>, isForce, field, row);
    }
  }

  // Helper: get display text from a list item (string or object with content/text/label/etc.)
  const getListItemLabel = (item: any): string => {
    if (item === null || item === undefined) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      return (
        item.content ??
        item.text ??
        item.label ??
        item.name ??
        item.title ??
        item.value ??
        (item.id != null ? String(item.id) : '')
      );
    }
    return String(item);
  };

  // Handle checklist component - render as list with checkbox icon and check when done
  if (field?.component === 'checklist') {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-gray-400">—</span>;
    }
    const listItems = Array.isArray(value) ? value : [value];
    return wrapWithForceIcon(
      <ul className="list-none space-y-1 text-sm text-gray-700 dark:text-gray-300 pl-0 w-full" dir="auto">
        {listItems.map((item: any, index: number) => {
          const text = getListItemLabel(item);
          const isDone =
            typeof item === 'object' && item !== null
              ? item.isCompleted === true || item.completed === true
              : false;
          if (!text && !isDone) return null;
          return (
            <li key={item?.id ?? index} className="flex items-center gap-2 break-words overflow-wrap-anywhere">
              <span className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden>
                {isDone ? (
                  <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" aria-label="Done" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-label="Not done" />
                )}
              </span>
              <span className={cn("w-full block", isDone && 'line-through text-gray-500 dark:text-gray-400')} dir="auto">
                {text || '—'}
              </span>
            </li>
          );
        })}
      </ul>,
      isForce,
      field,
      row
    );
  }

  // Handle list-input component - render as bullet list; support array of objects (content/text/label)
  if (field?.component === 'list-input' || field?.component === 'listinput') {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-gray-400">—</span>;
    }
    const listItems = Array.isArray(value) ? value : [value];
    const itemLabels = listItems
      .map((item: any) => getListItemLabel(item))
      .filter((label: string) => label != null && String(label).trim() !== '');
    if (itemLabels.length === 0) {
      return <span className="text-gray-400">—</span>;
    }
    return wrapWithForceIcon(
      <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-700 dark:text-gray-300" dir="auto">
        {itemLabels.map((label: string, index: number) => (
          <li key={index} className="break-words overflow-wrap-anywhere" dir="auto">{label}</li>
        ))}
      </ul>,
      isForce,
      field,
      row
    );
  }

  // Handle picker fields - check for component type or if value is an object/array that looks like a picker value
  const isPickerComponent = field?.component === 'picker' || 
                            field?.component === 'popup-picker' ||
                            field?.component === 'popuppicker' ||
                            field?.component === 'popup-picker-input' ||
                            field?.component === 'pickerinput';
  
  // Check if value looks like a picker value (object/array with id/label structure)
  const looksLikePickerValue = (val: any): boolean => {
    if (Array.isArray(val) && val.length > 0) {
      return val.some(item => 
        (typeof item === 'object' && item !== null && (item.id || item.label || item.name || item.title))
      );
    }
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return !!(val.id || val.label || val.name || val.title || val.value);
    }
    return false;
  };
  
  const isPickerField = isPickerComponent || 
                        (field?.targetSchema && (typeof resolvedValue === 'object' || Array.isArray(resolvedValue))) ||
                        (looksLikePickerValue(resolvedValue) && (typeof resolvedValue === 'object' || Array.isArray(resolvedValue)));
  
  if (isPickerField) {
    // Check if value is an array (even single-item arrays should use BadgeViewer for consistency)
    const isArrayValue = Array.isArray(resolvedValue) && resolvedValue.length > 0;
    
    const isNormalizedArray = isArrayValue && normalizedOptions.length > 0;
    
    // For array values (multi-select or single-item arrays with normalized format),
    // use BadgeViewer to show all items with proper formatting
    // Check if array items look like picker objects (have id, label, name, title, icon, or color)
    const arrayItemsLookLikePicker = isArrayValue && resolvedValue.some((item: any) => 
      typeof item === 'object' && item !== null && 
      (item.id || item.label || item.name || item.title || item.icon || item.color)
    );
    
    if (isNormalizedArray || arrayItemsLookLikePicker) {
      const handleBadgeClick = (item: BadgeItem) => {
        const candidateId = item.normalized?.id ?? item.id;
        if (!candidateId) return;
        const targetSchema = field?.targetSchema;
        if (!targetSchema) return;

        const url = `/page/${targetSchema}/${encodeURIComponent(candidateId)}?showBack=true`;
        if (typeof window !== 'undefined') {
          window.open(url, '_self');
        }
      };

      return wrapWithForceIcon(
        <BadgeViewer
          field={field}
          value={resolvedValue}
          badgeVariant={field.roleColor || "default"}
          enforceVariant={false}
          animate={true}
          onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
          isItemClickable={
            field?.targetSchema
              ? (item) => Boolean(item.normalized?.id ?? item.id)
              : () => false
          }
        />,
        isForce,
        field,
        row
      );
    }
    
    // For single non-array values (including objects), try to get display value
    if (typeof resolvedValue === 'object' && resolvedValue !== null && !Array.isArray(resolvedValue)) {
      const handleBadgeClick = (item: BadgeItem) => {
        const candidateId = item.normalized?.id ?? item.id;
        if (!candidateId) return;
        
        // For dynamic fields, use targetSchema from the enriched value item (from relation)
        // This is the resolved targetSchema from /api/relations, not the template
        // FIRST: Check the row data directly (most reliable source for enriched data)
        let targetSchema: string | undefined;
        if (row && field?.name) {
          const fieldValue = row[field.name];
          if (Array.isArray(fieldValue)) {
            const matchingItem = fieldValue.find((val: any) => {
              const valId = typeof val === 'object' && val !== null ? val.id : val;
              return String(valId) === String(candidateId);
            });
            if (matchingItem && typeof matchingItem === 'object' && matchingItem !== null) {
              targetSchema = (matchingItem as any).targetSchema;
            }
          } else if (fieldValue && typeof fieldValue === 'object') {
            const valId = fieldValue.id;
            if (String(valId) === String(candidateId)) {
              targetSchema = (fieldValue as any).targetSchema;
            }
          }
        }
        
        // SECOND: Check normalized, original, and direct item properties
        if (!targetSchema) {
          targetSchema = 
            item.normalized?.targetSchema || 
            (item.original as any)?.targetSchema ||
            (item as any).targetSchema;
        }
        
        // Fallback to field.targetSchema if not available in item (for non-relation cases)
        if (!targetSchema) {
          const rawTargetSchema = field?.targetSchema;
          if (!rawTargetSchema) return;

          // Resolve dynamic targetSchema (e.g., "{{formData.resourceType}}") using row data
          // The row contains the formData values, so we can use it to resolve templates
          targetSchema = replaceDynamicContext(rawTargetSchema, { formData: row });

          // Skip if still contains unresolved templates
          if (targetSchema.includes('{{') && targetSchema.includes('}}')) {
            console.warn('[formatFieldValue] Could not resolve targetSchema template:', rawTargetSchema, 'Row data:', row);
            return;
          }
        }

        // Ensure we have a valid targetSchema before creating URL
        if (!targetSchema || targetSchema.trim() === '') {
          console.warn('[formatFieldValue] Empty targetSchema for item:', item);
          return;
        }

        const url = `/page/${targetSchema.trim()}/${encodeURIComponent(candidateId)}?showBack=true`;
        if (typeof window !== 'undefined') {
          window.open(url, '_self');
        }
      };

      return wrapWithForceIcon(
        <BadgeViewer
          field={field}
          value={value}
          badgeVariant={field.roleColor || "default"}
          enforceVariant={false}
          animate={true}
          onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
          isItemClickable={
            field?.targetSchema
              ? (item) => Boolean(item.normalized?.id ?? item.id)
              : () => false
          }
        />,
        isForce,
        field,
        row
      );
    }
    
    // For single non-array values (including objects), try to get display value
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Try to get display value from the object
      const pickerDisplay = getPickerDisplayValue(field, value, { row });
      if (pickerDisplay) {
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{pickerDisplay}</span>, isForce, field, row);
      }
      
      // Fallback: try to extract label/name/title/id directly
      const fallbackDisplay = value.label || value.name || value.title || value.value || value.id;
      if (fallbackDisplay !== undefined && fallbackDisplay !== null) {
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{String(fallbackDisplay)}</span>, isForce, field, row);
      }
      
      // If still no display value, show empty instead of [object Object]
      const emptyContent = <span className={cn("text-gray-400 w-full block", isTitle && "font-semibold")} dir="auto">—</span>;
      const inactiveContent = isInactive && isTitle ? <span className="line-through">{emptyContent}</span> : emptyContent;
      return isForce && isTitle ? (
        <span className="inline-flex items-center gap-1.5">
          <ForceIcon isForce={isForce} size="md" forceReason={row?.forceReason} />
          {inactiveContent}
        </span>
      ) : inactiveContent;
    } else if (Array.isArray(value) && value.length === 0) {
      // Empty array
      const emptyContent = <span className={cn("text-gray-400 w-full block", isTitle && "font-semibold")} dir="auto">—</span>;
      return isInactive && isTitle ? <span className="line-through">{emptyContent}</span> : emptyContent;
    } else {
      // For non-object values, use getPickerDisplayValue
      const pickerDisplay = getPickerDisplayValue(field, value, { row });
      if (pickerDisplay) {
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{pickerDisplay}</span>, isForce, field, row);
      }
    }
    
    const emptyContent = <span className={cn("text-gray-400 w-full block", isTitle && "font-semibold")} dir="auto">—</span>;
    const inactiveContent = isInactive && isTitle ? <span className="line-through">{emptyContent}</span> : emptyContent;
    return isForce && isTitle ? (
      <span className="inline-flex items-center gap-1.5">
        <ForceIcon isForce={isForce} size="md" forceReason={row?.forceReason} />
        {inactiveContent}
      </span>
    ) : inactiveContent;
  }

  const displayType = field?.component || 'text';
  const componentType = (field?.component || '').toString().toLowerCase();

  // Handle checkbox and switch fields - show as checked/unchecked icon
  if (displayType === 'checkbox' || displayType === 'switch' || componentType === 'checkbox' || componentType === 'switch') {
    const isChecked = value === true || value === 'true' || value === 1 || value === '1' || value === 'checked' || value === 'on';
    
    return wrapWithForceIcon(
      <div className="inline-flex items-center">
        {isChecked ? (
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>,
      isForce,
      field,
      row
    );
  }

  // Handle password fields - show masked value
  if (displayType === 'password' || componentType === 'password') {
    const passwordLength = String(value).length;
    const maskedValue = '•'.repeat(Math.max(8, Math.min(passwordLength, 20)));
    return (
      <span className="font-mono text-gray-600 dark:text-gray-400 w-full block" dir="auto">
        {maskedValue}
      </span>
    );
  }

  // Handle color fields - show colored circle with color name on hover, copy on click
  if (displayType === 'color-picker' || componentType === 'color-picker' || componentType === 'color') {
    const colorValue = String(value).trim();
    
    // Tailwind color name to hex mapping (using Tailwind 500 shade)
    const tailwindColorMap: Record<string, string> = {
      slate: '#64748b',
      gray: '#6b7280',
      zinc: '#71717a',
      neutral: '#737373',
      stone: '#78716c',
      red: '#ef4444',
      orange: '#f97316',
      amber: '#f59e0b',
      yellow: '#eab308',
      lime: '#84cc16',
      green: '#22c55e',
      emerald: '#10b981',
      teal: '#14b8a6',
      cyan: '#06b6d4',
      sky: '#0ea5e9',
      blue: '#3b82f6',
      indigo: '#6366f1',
      violet: '#8b5cf6',
      purple: '#a855f7',
      fuchsia: '#d946ef',
      pink: '#ec4899',
      rose: '#f43f5e',
    };
    
    // Check if it's a hex color
    const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue);
    // Check if it's a Tailwind color name
    const isTailwindColor = tailwindColorMap[colorValue.toLowerCase()];
    
    // Determine display color and label
    let displayColor: string;
    let displayLabel: string;
    
    if (isValidHex) {
      // Hex color format
      displayColor = colorValue;
      displayLabel = colorValue;
    } else if (isTailwindColor) {
      // Tailwind color name
      displayColor = isTailwindColor;
      displayLabel = colorValue.charAt(0).toUpperCase() + colorValue.slice(1);
    } else {
      // Invalid or unknown - use gray default
      displayColor = '#808080';
      displayLabel = colorValue || 'Unknown';
    }
    
    const handleCopyColor = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(colorValue);
        toast.success(`Color "${displayLabel}" copied to clipboard`);
      } catch (err) {
        toast.error('Failed to copy color');
      }
    };
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm cursor-pointer hover:scale-110 transition-transform duration-200"
              style={{ backgroundColor: displayColor }}
              onClick={handleCopyColor}
              title={`Click to copy ${displayLabel}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-sm">{displayLabel}</p>
            <p className="text-xs text-gray-500 mt-1">Click to copy</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Handle icon fields - show icon using IconRenderer
  if (displayType === 'icon' || componentType === 'icon' || field?.role === 'icon') {
    const iconName = String(value).trim();
    if (!iconName) {
      return <span className="text-gray-400">—</span>;
    }
    
    if (!isValidLucideIcon(iconName)) {
      return <span className="text-gray-600 dark:text-gray-300 w-full block" dir="auto">{iconName}</span>;
    }
    
    return (
      <div className="inline-flex items-center">
        <IconRenderer iconName={iconName} className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  // Handle avatar fields - show avatar image from URL
  if (displayType === 'avatar' || componentType === 'avatar' || field?.role === 'avatar' || field?.role === 'image') {
    const avatarUrl = String(value).trim();
    // Check if it's a valid URL
    const isValidUrl = avatarUrl && (
      avatarUrl.startsWith('http://') || 
      avatarUrl.startsWith('https://') || 
      avatarUrl.startsWith('//') ||
      avatarUrl.startsWith('/')
    );
    
    // Get fallback text from title field or field name
    const getInitials = (text: string): string => {
      if (!text) return '?';
      
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === 0) return '?';
      
      if (words.length === 1) {
        // Single word: take first two characters
        return words[0].substring(0, 2).toUpperCase();
      }
      
      if (words.length === 2) {
        // Two words: take first letter of each
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      
      // More than 2 words: first letter of first two words + first letter of last word
      return (words[0][0] + words[1][0] + words[words.length - 1][0]).toUpperCase();
    };
    
    const titleField = row ? (row.name || row.title || row.label || '') : '';
    const fallbackText = getInitials(titleField);
    
    if (isValidUrl) {
      const normalizedUrl = avatarUrl.startsWith('//') ? `https:${avatarUrl}` : avatarUrl;
      return (
        <Avatar
          src={normalizedUrl}
          alt={titleField || 'Avatar'}
          fallback={fallbackText}
          size="md"
          variant="default"
          className="border border-gray-200 dark:border-gray-700"
        >
          {fallbackText}
        </Avatar>
      );
    }
    
    // If not a valid URL, show fallback avatar
    return (
      <Avatar
        alt={titleField || 'Avatar'}
        fallback={fallbackText}
        size="md"
        variant="default"
        className="border border-gray-200 dark:border-gray-700"
      >
        {fallbackText}
      </Avatar>
    );
  }

  // Handle status field - check by role OR by name (status field in system section might not have role set)
  if (field?.role === 'status' || field?.name === 'status') {
    const statusOptions = field.options || [];
    const primaryOption = normalizedOptions[0];
    
    // Extract raw value item for direct property access (color, icon, etc.)
    // Handle both array format [{}] and single object format {}
    // IMPORTANT: Extract BEFORE normalization to preserve all properties
    let rawValueItem: any = null;
    if (Array.isArray(value) && value.length > 0) {
      // Get the first item from the array - this should contain the full status object with color
      rawValueItem = typeof value[0] === 'object' && value[0] !== null ? value[0] : null;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      rawValueItem = value;
    }
    
    const statusValue = primaryOption?.id ?? String(
      Array.isArray(value) ? (value[0]?.id || value[0]) : value
    );
    const badgeConfig = getBadgeConfig(statusValue, statusOptions);
    
    // Find matching option from statusOptions by ID to get color/icon
    let matchedOption: any = null;
    if (statusValue && statusOptions.length > 0) {
      matchedOption = statusOptions.find((opt: any) => 
        String(opt?.id || opt?.value) === String(statusValue)
      );
    }
    
    // Get color from multiple sources with priority: raw value item > normalized option > matched option > field config > badge config
    // CRITICAL: rawValueItem should have the color if the value is an object/array with color property
    // primaryOption should also have color since normalizeOptionArray preserves all properties via spread
    const badgeColor = (rawValueItem?.color && typeof rawValueItem.color === 'string' ? rawValueItem.color.trim() : null) ||
                       (primaryOption?.color && typeof primaryOption.color === 'string' ? primaryOption.color.trim() : null) ||
                       (matchedOption?.color && typeof matchedOption.color === 'string' ? matchedOption.color.trim() : null) ||
                       (field.roleColor && typeof field.roleColor === 'string' ? field.roleColor.trim() : null) ||
                       (badgeConfig?.color && typeof badgeConfig.color === 'string' ? badgeConfig.color.trim() : null) ||
                       null;
    
    // Get icon from multiple sources with priority: raw value item > normalized option > matched option > badge config
    const badgeIcon = rawValueItem?.icon || 
                   primaryOption?.icon || 
                   matchedOption?.icon ||
                   badgeConfig?.icon;
    
    // Get label from multiple sources
    const badgeLabel = primaryOption?.label || 
                       rawValueItem?.label || 
                       badgeConfig?.label ||
                       'Unknown';
    
    // Use getValidBadgeVariant to convert color to valid Badge variant (same approach as DynamicCardRenderer)
    // This ensures consistency with card view which uses RadixBadge from @/components/ui/badge
    const badgeVariant = getValidBadgeVariant(badgeColor || undefined);
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development' && (field?.role === 'status' || field?.name === 'status')) {
      console.log('[formatFieldValue Status]', {
        value,
        valueType: typeof value,
        isArray: Array.isArray(value),
        arrayLength: Array.isArray(value) ? value.length : 0,
        rawValueItem: rawValueItem ? { id: rawValueItem.id, color: rawValueItem.color, hasColor: !!rawValueItem.color } : null,
        primaryOption: primaryOption ? { id: primaryOption.id, color: primaryOption.color, hasColor: !!primaryOption.color } : null,
        matchedOption: matchedOption ? { id: matchedOption.id, color: matchedOption.color } : null,
        badgeConfig: badgeConfig ? { color: badgeConfig.color } : null,
        badgeColor,
        badgeVariant,
        finalVariant: badgeVariant,
      });
    }
    
    // Use the same Badge component and approach as DynamicCardRenderer for consistency
    return wrapWithForceIcon(
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center whitespace-nowrap w-full">
              <Badge variant={badgeVariant}>
                {badgeIcon && <IconRenderer iconName={badgeIcon} className="h-3 w-3" />}
                <span className="text-xs leading-relaxed" dir="auto">{badgeLabel}</span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <span className="leading-relaxed" dir="auto">{badgeLabel}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
      isForce,
      field,
      row
    );
  }

  if (field?.role === 'entityType') {
    const entityTypeOptions = field.options || [];
    const primaryOption = normalizedOptions[0];
    
    // Extract raw value item for direct property access (color, icon, etc.)
    // Handle both array format [{}] and single object format {}
    let rawValueItem: any = null;
    if (Array.isArray(value) && value.length > 0) {
      rawValueItem = typeof value[0] === 'object' && value[0] !== null ? value[0] : null;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      rawValueItem = value;
    }
    
    const entityTypeValue = primaryOption?.id ?? String(
      Array.isArray(value) ? (value[0]?.id || value[0]) : value
    );
    const badgeConfig = getBadgeConfig(entityTypeValue, entityTypeOptions);
    
    // Find matching option from entityTypeOptions by ID to get color/icon
    let matchedOption: any = null;
    if (entityTypeValue && entityTypeOptions.length > 0) {
      matchedOption = entityTypeOptions.find((opt: any) => 
        String(opt?.id || opt?.value) === String(entityTypeValue)
      );
    }
    
    // Get color from multiple sources with priority: raw value item > normalized option > matched option > field config > badge config
    // Ensure we get the actual color string value
    const badgeColor = (rawValueItem?.color && typeof rawValueItem.color === 'string' ? rawValueItem.color.trim() : null) ||
                       (primaryOption?.color && typeof primaryOption.color === 'string' ? primaryOption.color.trim() : null) ||
                       (matchedOption?.color && typeof matchedOption.color === 'string' ? matchedOption.color.trim() : null) ||
                       (field.roleColor && typeof field.roleColor === 'string' ? field.roleColor.trim() : null) ||
                       (badgeConfig?.color && typeof badgeConfig.color === 'string' ? badgeConfig.color.trim() : null) ||
                       null;
    
    // Get icon from multiple sources with priority: raw value item > normalized option > matched option > badge config
    const badgeIcon = rawValueItem?.icon || 
                   primaryOption?.icon || 
                   matchedOption?.icon ||
                   badgeConfig?.icon;
    
    // Get label from multiple sources
    const badgeLabel = primaryOption?.label || 
                       rawValueItem?.label || 
                       badgeConfig?.label ||
                       'Unknown';
    
    // Use getValidBadgeVariant to convert color to valid Badge variant (same approach as DynamicCardRenderer)
    const badgeVariant = getValidBadgeVariant(badgeColor || undefined);
    
    return wrapWithForceIcon(
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center whitespace-nowrap w-full">
              <Badge variant={badgeVariant}>
                {badgeIcon && <IconRenderer iconName={badgeIcon} className="h-3 w-3" />}
                <span className="text-xs leading-relaxed" dir="auto">{badgeLabel}</span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <span className="leading-relaxed" dir="auto">{badgeLabel}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
      isForce,
      field,
      row
    );
  }

  // View rating: by role or by component (e.g. project-proposal, lean-management rating fields) – view-only, cursor default
  if (field?.role === 'rating' || field?.component === 'rating') {
    return wrapWithForceIcon(
      <div className="inline-flex items-center cursor-default">
        {renderRatingValue(value, { size: 'sm', showValue: true, readOnly: true })}
      </div>,
      isForce,
      field,
      row
    );
  }

  // Handle code role - show as CodeBadge
  if (field?.role === 'code') {
    if (!value && value !== 0) {
      return <span className="text-gray-400">—</span>;
    }
    return wrapWithForceIcon(
      <CodeBadge code={value} highlightQuery={highlightQuery} />,
      isForce,
      field,
      row
    );
  }

  // Handle duedate role - show as formatted date in tables (not countdown)
  if (field?.role === 'duedate') {
    if (!value || value === '' || value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }
    
    // Validate that value is a valid date
    let dateValue: string | Date | null = null;
    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'string' && value.trim() !== '') {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        dateValue = parsedDate;
      }
    }
    
    if (!dateValue) {
      return <span className="text-gray-400">—</span>;
    }
    
    // Check if field component is 'date' (not 'datetime' or 'datetime-local')
    const isDateOnly = field?.component === 'date';
    
    // Format date for table display
    // If component is 'date', show only date without time
    // Otherwise, show date with time
    const formattedDate = isDateOnly
      ? formatDate(dateValue, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : formatDate(dateValue, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
    
    return wrapWithForceIcon(
      <span className="text-gray-700 dark:text-gray-300 w-full block" dir="auto">{formattedDate}</span>,
      isForce,
      field,
      row
    );
  }

  // Handle person role - show avatar and label
  if (field?.role === 'person') {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-gray-400">—</span>;
    }
    
    // Normalize value to array format
    const normalizedValue = Array.isArray(value) ? value : [value];
    if (normalizedValue.length === 0) {
      return <span className="text-gray-400">—</span>;
    }
    
    // Get first person (assignedTo is typically single-select)
    const person = normalizedValue[0];
    const normalizedPerson = normalizeOptionArray(person)[0];
    
    // Get person details
    const personLabel = normalizedPerson?.label || normalizedPerson?.normalized?.label || person?.label || person?.name || person?.email || 'Unknown';
    const personAvatar = normalizedPerson?.avatar || normalizedPerson?.normalized?.avatar || person?.avatar || person?.image || person?.avatarUrl || null;
    const personId = normalizedPerson?.id || normalizedPerson?.normalized?.id || person?.id || null;
    
    // Convert person data to AvatarUser format
    const userData = {
      ...person,
      ...normalizedPerson,
      id: personId,
      label: personLabel,
      name: personLabel,
      email: person?.email || normalizedPerson?.email || normalizedPerson?.normalized?.email || null,
      avatarUrl: personAvatar,
      firstName: person?.firstName || normalizedPerson?.firstName || normalizedPerson?.normalized?.firstName || null,
      lastName: person?.lastName || normalizedPerson?.lastName || normalizedPerson?.normalized?.lastName || null,
      username: person?.username || normalizedPerson?.username || normalizedPerson?.normalized?.username || null,
      postTitle: person?.postTitle || normalizedPerson?.postTitle || normalizedPerson?.normalized?.postTitle || null,
      company: person?.company || normalizedPerson?.company || normalizedPerson?.normalized?.company || null,
    };
    
    return wrapWithForceIcon(
      <div className="inline-flex items-center gap-2">
        <AvatarUser
          user={userData}
          avatarType="user"
          size="sm"
          showDialog={true}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300 min-w-0 flex-1" dir="auto">{personLabel}</span>
      </div>,
      isForce,
      field,
      row
    );
  }

  const candidateComponents = new Set([
    'select',
    'checkbox',
    'radio',
    'popup-picker',
    'popuppicker',
    'popup-picker-input',
    'picker',
    'pickerinput',
    'combo',
    'multiselect',
    'multi-select',
  ]);
  const componentKey = (field?.component || '').toString().toLowerCase();
  const hasFieldOptions = Array.isArray(field?.options) && field.options.length > 0;
  // Exclude list-input and checklist from badge rendering (handled separately above)
  const shouldRenderAsBadges =
    (field?.role === 'badge' || candidateComponents.has(componentKey)) &&
    componentKey !== 'list-input' &&
    componentKey !== 'listinput' &&
    componentKey !== 'checklist' &&
    (hasStructuredOptions || hasFieldOptions || Array.isArray(value));

  if (shouldRenderAsBadges) {
    const handleBadgeClick = (item: BadgeItem) => {
      const candidateId = item.normalized?.id ?? item.id;
      if (!candidateId) return;
      
      // For dynamic fields, use targetSchema from the enriched value item (from relation)
      // This is the resolved targetSchema from /api/relations, not the template
      // FIRST: Check the row data directly (most reliable source for enriched data)
      let targetSchema: string | undefined;
      if (row && field?.name) {
        const fieldValue = row[field.name];
        if (Array.isArray(fieldValue)) {
          const matchingItem = fieldValue.find((val: any) => {
            const valId = typeof val === 'object' && val !== null ? val.id : val;
            return String(valId) === String(candidateId);
          });
          if (matchingItem && typeof matchingItem === 'object' && matchingItem !== null) {
            targetSchema = (matchingItem as any).targetSchema;
          }
        } else if (fieldValue && typeof fieldValue === 'object') {
          const valId = fieldValue.id;
          if (String(valId) === String(candidateId)) {
            targetSchema = (fieldValue as any).targetSchema;
          }
        }
      }
      
      // SECOND: Check normalized, original, and direct item properties
      if (!targetSchema) {
        targetSchema = 
          item.normalized?.targetSchema || 
          (item.original as any)?.targetSchema ||
          (item as any).targetSchema;
      }
      
      // Fallback to field.targetSchema if not available in item (for non-relation cases)
      if (!targetSchema) {
        targetSchema = field?.targetSchema;
        if (!targetSchema) return;
        
        // If field.targetSchema contains a template, try to resolve it
        if (targetSchema.includes('{{') && targetSchema.includes('}}')) {
          targetSchema = replaceDynamicContext(targetSchema, { formData: row });
          
          // Skip if still contains unresolved templates
          if (targetSchema.includes('{{') && targetSchema.includes('}}')) {
            console.warn('[formatFieldValue] Could not resolve targetSchema template:', field?.targetSchema, 'Row data:', row);
            return;
          }
        }
      }

      // Ensure we have a valid targetSchema before creating URL
      if (!targetSchema || targetSchema.trim() === '') {
        console.warn('[formatFieldValue] Empty targetSchema for item:', item);
        return;
      }

      const url = `/page/${targetSchema.trim()}/${encodeURIComponent(candidateId)}?showBack=true`;
      if (typeof window !== 'undefined') {
        window.open(url, '_self');
      }
    };

    return wrapWithForceIcon(
      <BadgeViewer
        field={field}
        value={value}
        badgeVariant={field.roleColor || "default"}
        enforceVariant={false}
        animate={true}
        onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
        isItemClickable={
          field?.targetSchema
            ? (item) => Boolean(item.normalized?.id ?? item.id)
            : () => false
        }
      />,
      isForce,
      field,
      row
    );
  }

  // Handle datetime fields early (before switch) to ensure they're caught
  // Check both displayType and componentType to catch all variations
  if (displayType === 'datetime' || displayType === 'datetime-local' || 
      componentType === 'datetime' || componentType === 'datetime-local') {
    try {
      const dateValue = typeof value === 'string' ? new Date(value) : value;
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return wrapWithForceIcon(
          <span className="w-full block" dir="auto">
            {formatDate(dateValue, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </span>,
          isForce,
          field,
          row
        );
      }
      // If date parsing fails, fall through to default handling
    } catch {
      // If date parsing fails, fall through to default handling
    }
  }

  switch (displayType) {
    case 'currency':
      return wrapWithForceIcon(
        <span className="whitespace-nowrap w-full block" dir="auto">
          {formatCurrency(typeof value === 'number' ? value : parseFloat(value) || 0)}
        </span>,
        isForce,
        field,
        row
      );
    case 'percentage': {
      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      return wrapWithForceIcon(
        <span className="whitespace-nowrap w-full block" dir="auto">{numValue.toFixed(2)}%</span>,
        isForce,
        field,
        row
      );
    }
    case 'number':
      return wrapWithForceIcon(
        <span className="whitespace-nowrap w-full block" dir="auto">
          {formatNumber(typeof value === 'number' ? value : parseFloat(value) || 0)}
        </span>,
        isForce,
        field,
        row
      );
    case 'date':
      try {
        const dateValue = typeof value === 'string' ? new Date(value) : value;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return wrapWithForceIcon(
            <span className="w-full block" dir="auto">
              {formatDate(dateValue, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>,
            isForce,
            field,
            row
          );
        }
        return wrapWithForceIcon(<span dir="auto">{String(resolvedValue)}</span>, isForce, field, row);
      } catch {
        return wrapWithForceIcon(<span dir="auto">{String(resolvedValue)}</span>, isForce, field, row);
      }
    case 'datetime':
    case 'datetime-local':
      try {
        const dateValue = typeof value === 'string' ? new Date(value) : value;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return wrapWithForceIcon(
            <span className="w-full block" dir="auto">
              {formatDate(dateValue, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>,
            isForce,
            field,
            row
          );
        }
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{String(resolvedValue)}</span>, isForce, field, row);
      } catch {
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{String(resolvedValue)}</span>, isForce, field, row);
      }
    case 'url': {
      const stringValue = String(resolvedValue);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      if (!isUrl) {
        return wrapWithForceIcon(<span>{stringValue}</span>, isForce, field, row);
      }
      // Get link label from componentTypeConfig or use default
      const linkLabel = field?.componentTypeConfig?.label || 'URL';
      const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
      return wrapWithForceIcon(
        <a
          href={urlToOpen}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-400 underline transition-colors duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          {linkLabel}
        </a>,
        isForce,
        field,
        row
      );
    }
    case 'array':
    case 'checkbox':
      if (displayStrings.length > 0) {
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{displayStrings.join(', ')}</span>, isForce, field, row);
      }
      if (Array.isArray(value) && !isTranslationArray(value)) {
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{value.join(', ')}</span>, isForce, field, row);
      }
      return wrapWithForceIcon(<span className="w-full block" dir="auto">{String(resolvedValue)}</span>, isForce, field, row);
    default:
      if (hasStructuredOptions) {
        const joined = getJoinedDisplayString(resolvedValue);
        if (joined) {
          return wrapWithForceIcon(<span className="w-full block" dir="auto">{joined}</span>, isForce, field, row);
        }
      }
      if (normalizedOptions.length > 0 && !(Array.isArray(value) || typeof value === 'object')) {
        const label = normalizedOptions[0].label ?? normalizedOptions[0].id;
        return wrapWithForceIcon(<span className="w-full block" dir="auto">{String(label)}</span>, isForce, field, row);
      }
      
      // Handle object values that weren't caught by picker field check
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Try to extract a display value from the object
        const objectDisplay = value.label || value.name || value.title || value.value || value.id;
        if (objectDisplay !== undefined && objectDisplay !== null) {
          return wrapWithForceIcon(<span className="w-full block" dir="auto">{String(objectDisplay)}</span>, isForce, field, row);
        }
        // If no display value found, show empty instead of [object Object]
        const emptyContent = <span className={cn("text-gray-400 w-full block", isTitle && "font-semibold")} dir="auto">—</span>;
        return isInactive && isTitle ? <span className="line-through">{emptyContent}</span> : emptyContent;
      }
      
      // Check if it's a URL even if not explicitly typed as url
      const stringValue = String(resolvedValue);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      if (isUrl && field?.component === 'url') {
        const linkLabel = field?.componentTypeConfig?.label || 'URL';
        const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
        return wrapWithForceIcon(
          <a
            href={urlToOpen}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-400 underline transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            {linkLabel}
          </a>,
          isForce,
          field,
          row
        );
      }
      
      // Check if it's an ISO datetime string (e.g., "2025-12-28T14:30" or "2025-12-28T14:30:00")
      // This handles cases where datetime values aren't explicitly typed as datetime component
      const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;
      if (isoDateTimePattern.test(stringValue.trim())) {
        try {
          const dateValue = new Date(stringValue);
          if (!isNaN(dateValue.getTime())) {
            // Check if field component is 'date' (not 'datetime' or 'datetime-local')
            const isDateOnly = field?.component === 'date';
            
            return wrapWithForceIcon(
              <span className="w-full block" dir="auto">
                {isDateOnly
                  ? formatDate(dateValue, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : formatDate(dateValue, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
              </span>,
              isForce,
              field,
              row
            );
          }
        } catch {
          // Fall through to default string display
        }
      }
      
      return wrapWithForceIcon(<span className="w-full block" dir="auto">{stringValue}</span>, isForce, field, row);
  }
};


