'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Edit2, Check, X as XIcon } from 'lucide-react';
import { ButtonMinimal } from './ButtonMinimal';
import { ConfirmationMessage } from './ConfirmationMessage';
import { AddButtonFull } from './AddButtonFull';
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
import { getLabelClasses } from '../utils/field-styles';
import { validateField } from '@/gradian-ui/shared/utils';
import { scrollInputIntoView } from '@/gradian-ui/shared/utils/dom-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { FormContext } from '@/gradian-ui/schema-manager/context/FormContext';

export interface AnnotationItem {
  id: string;
  label: string;
}

/** Item with optional completion state (used when showCheckbox is true). */
export type ListInputItem = AnnotationItem & { completed?: boolean };

export interface ListInputProps {
  value: ListInputItem[];
  onChange: (items: ListInputItem[]) => void;
  placeholder?: string;
  addButtonText?: string;
  className?: string;
  /** Enable drag-and-drop reordering (default: true). Alias: allowReorder. */
  enableReordering?: boolean;
  /** Alias for enableReordering. When both provided, allowReorder takes precedence in config. */
  allowReorder?: boolean;
  /** When true, each item shows a checkbox and completed state (strikethrough). */
  showCheckbox?: boolean;
  /** When true, do not call onChange on every edit/drag/checkbox; only commit to parent when focus leaves the list (e.g. user clicks elsewhere or Update form). Matches behavior of other form fields that commit on blur/submit. */
  commitOnBlur?: boolean;
  /** Field name for form context; when set with commitOnBlur, this field is flushed into submission data on submit so value is included even if user never blurred the list. */
  name?: string;
  /** When provided with commitOnBlur + name, the value passed to the form on submit is transformForSubmit(currentValue) instead of raw list (e.g. checklist converts to ChecklistItemType[]). */
  transformForSubmit?: (items: ListInputItem[]) => unknown;
  disabled?: boolean; // Disable add button when loading (default: false)
  label?: string; // Label to display above the list
  required?: boolean; // Whether the field is required
  error?: string; // Error message to display
  config?: any; // Config object containing validation rules
}

const SortableListItem: React.FC<{
  item: ListInputItem;
  onEdit: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  isSortable: boolean;
  showCheckbox?: boolean;
  onCompletedChange?: (id: string, completed: boolean) => void;
  isEditingControlled?: boolean; // If provided, use controlled editing state
  onEnterPress?: (id: string, label: string) => void; // Callback when Enter is pressed
  onEditStateChange?: (id: string, isEditing: boolean) => void; // Callback when edit state changes
  inputRef?: React.RefObject<HTMLInputElement | null>; // Ref for focusing input
  onPasteSplit?: (id: string, items: string[]) => void; // Callback when comma-separated values are pasted
  validationPattern?: RegExp | string; // Validation pattern for item labels
  onCommitAndAddNew?: () => void; // Callback to commit current item and add a new one
}> = ({ 
  item,
  onEdit,
  onDelete,
  isSortable,
  showCheckbox,
  onCompletedChange,
  isEditingControlled,
  onEnterPress,
  onEditStateChange,
  inputRef,
  onPasteSplit,
  validationPattern,
  onCommitAndAddNew,
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.label);
  const [itemError, setItemError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const internalInputRef = React.useRef<HTMLInputElement>(null);
  const inputElementRef = inputRef || internalInputRef;
  const isDeletingRef = React.useRef(false);
  const originalValueRef = React.useRef<string>(''); // Store original value when editing starts
  
  // Validate edit value against pattern
  const validateItem = React.useCallback((value: string): boolean => {
    if (!validationPattern) return true;
    const validation = { pattern: validationPattern };
    const result = validateField(value, validation);
    if (!result.isValid) {
      setItemError(result.error || 'Invalid format.');
    } else {
      setItemError(null);
    }
    return result.isValid;
  }, [validationPattern]);
  
  // Use controlled editing state if provided, otherwise use internal state
  const isEditing = isEditingControlled !== undefined ? isEditingControlled : internalIsEditing;
  
  // Update edit value when item label changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(item.label);
    }
  }, [item.label, isEditing]);

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing && inputElementRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (inputElementRef.current) {
          inputElementRef.current.focus();
          // Scroll input into view when focused (especially important on mobile when keyboard opens)
          scrollInputIntoView(inputElementRef.current, { delay: 150 });
        }
      }, 0);
    }
  }, [isEditing, inputElementRef]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isSortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleStartEdit = () => {
    // Store the original value when editing starts to determine if item was committed
    originalValueRef.current = item.label;
    setEditValue(item.label);
    if (onEditStateChange) {
      onEditStateChange(item.id, true);
    } else {
      setInternalIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue) {
      // Validate before saving
      if (validateItem(trimmedValue)) {
        onEdit(item.id, trimmedValue);
        setItemError(null);
        if (onEditStateChange) {
          onEditStateChange(item.id, false);
        } else {
          setInternalIsEditing(false);
        }
      }
    }
  };

  const handleCancelEdit = () => {
    setEditValue(item.label);
    if (onEditStateChange) {
      onEditStateChange(item.id, false);
    } else {
      setInternalIsEditing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if pasted text contains comma-separated values
    if (pastedText.includes(',')) {
      e.preventDefault();
      
      // Split by comma and clean up each item
      const items = pastedText
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      if (items.length > 1 && onPasteSplit) {
        // If multiple items, use the split handler
        onPasteSplit(item.id, items);
      } else if (items.length === 1) {
        // If only one item after splitting, validate and update the current value
        if (validateItem(items[0])) {
          setEditValue(items[0]);
        } else {
          setEditValue(items[0]); // Still set the value but show error
        }
      } else {
        // If no valid items, just paste normally
        setEditValue(pastedText);
      }
    } else {
      // If no comma, validate the pasted text
      const trimmedPasted = pastedText.trim();
      if (trimmedPasted && validationPattern) {
        validateItem(trimmedPasted);
      }
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    // Validate on change if pattern exists
    if (validationPattern && newValue.trim()) {
      validateItem(newValue.trim());
    } else {
      setItemError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter (or Cmd+Enter on Mac): Commit current item and add new one
      e.preventDefault();
      e.stopPropagation();
      const trimmedValue = editValue.trim();
      if (trimmedValue) {
        // Validate before saving
        if (validateItem(trimmedValue)) {
          onEdit(item.id, trimmedValue);
          setItemError(null);
          // Close edit mode for current item
          if (onEditStateChange) {
            onEditStateChange(item.id, false);
          } else {
            setInternalIsEditing(false);
          }
          // Trigger add new item callback
          if (onCommitAndAddNew) {
            onCommitAndAddNew();
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Just save and submit the current item (don't add new item)
      const trimmedValue = editValue.trim();
      if (trimmedValue) {
        // Validate before saving
        if (validateItem(trimmedValue)) {
          onEdit(item.id, trimmedValue);
          setItemError(null);
          // Always switch to view mode for current item
          if (onEditStateChange) {
            onEditStateChange(item.id, false);
          } else {
            setInternalIsEditing(false);
          }
        }
      }
      // Don't call onEnterPress - just check/submit the current item
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      // If item was never committed (original value was empty), delete it without confirmation
      // Otherwise, revert to the original committed value
      const originalValue = originalValueRef.current;
      if (!originalValue || originalValue.trim() === '') {
        // Item was never committed, delete it without confirmation
        onDelete(item.id);
      } else {
        // Item was committed before, revert to original value
        handleCancelEdit();
      }
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if item has no value (empty or just whitespace)
    const hasNoValue = !item.label || item.label.trim() === '';
    
    // If item has no value, delete without confirmation (even in edit mode)
    if (hasNoValue) {
      onDelete(item.id);
      return;
    }
    
    // If item has value, show confirmation dialog
    setShowDeleteConfirmation(true);
  };
  
  const handleConfirmDelete = () => {
    setShowDeleteConfirmation(false);
    onDelete(item.id);
    isDeletingRef.current = false;
  };
  
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    isDeletingRef.current = false;
  };

  return (
    <>
      <ConfirmationMessage
        isOpen={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        title="Delete Item"
        message={`Are you sure you want to delete "${item.label}"? This action cannot be undone.`}
        variant="destructive"
        size="sm"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: handleCancelDelete,
          },
          {
            label: 'Delete',
            variant: 'destructive',
            action: handleConfirmDelete,
            icon: 'Trash2',
          },
        ]}
      />
      <div ref={setNodeRef} style={style} className="relative group">
        <div
          className={cn(
            'w-full rounded-xl border transition-all duration-200',
            isDragging
              ? 'border-violet-400 shadow-lg ring-2 ring-violet-200/50 bg-white dark:bg-gray-800'
              : 'border-gray-200/80 bg-gray-50/70 hover:bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700/80 dark:bg-gray-800/60 dark:hover:bg-gray-800 dark:hover:border-gray-600 dark:hover:shadow-sm'
          )}
        >
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
            {isSortable && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg p-1.5 transition-colors shrink-0 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700/60"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            {showCheckbox && onCompletedChange && (
              <Checkbox
                checked={item.completed === true}
                onCheckedChange={(checked) => onCompletedChange(item.id, checked === true)}
                className="shrink-0"
                aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
              />
            )}
            <div className={cn('flex-1 min-w-0', item.completed && showCheckbox && 'line-through text-gray-500 dark:text-gray-400')} dir="auto">
              {isEditing ? (
                <>
                  <input
                    ref={inputElementRef}
                    type="text"
                    value={editValue}
                    onChange={handleInputChange}
                    onPaste={handlePaste}
                    onFocus={(e) => {
                      // Scroll input into view when focused (especially important on mobile when keyboard opens)
                      scrollInputIntoView(e.currentTarget, { delay: 100 });
                    }}
                    onBlur={(e) => {
                      // Don't save on blur if we're deleting or clicking a button
                      if (isDeletingRef.current) {
                        isDeletingRef.current = false; // Reset the flag
                        return;
                      }
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      if (!relatedTarget || !relatedTarget.closest('button')) {
                        handleSaveEdit();
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "w-full px-3 py-2 text-sm rounded-lg border bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 dark:bg-gray-700/80 dark:text-gray-100 dark:focus:ring-violet-400/25",
                      itemError 
                        ? "border-red-400 focus:ring-red-500/25 dark:border-red-500" 
                        : "border-gray-200 dark:border-gray-600"
                    )}
                    dir="auto"
                  />
                  {itemError && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{itemError}</p>
                  )}
                </>
              ) : (
                <span
                  className="text-sm text-gray-800 dark:text-gray-200 cursor-text py-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={handleStartEdit}
                >
                  {item.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              {isEditing ? (
                <>
                  <ButtonMinimal
                    icon={Check}
                    title="Save"
                    color="green"
                    size="sm"
                    type="button"
                    onClick={handleSaveEdit}
                  />
                  <ButtonMinimal
                    icon={XIcon}
                    title="Cancel"
                    color="red"
                    size="sm"
                    type="button"
                    onClick={handleCancelEdit}
                  />
                </>
              ) : (
                <>
                  <ButtonMinimal
                    icon={Edit2}
                    title="Edit"
                    color="blue"
                    size="sm"
                    type="button"
                    onClick={handleStartEdit}
                  />
                  <ButtonMinimal
                    icon={X}
                    title="Delete"
                    color="red"
                    size="sm"
                    type="button"
                    onMouseDown={(e) => {
                      // Set flag before blur fires
                      isDeletingRef.current = true;
                    }}
                    onClick={handleDelete}
                  />
                </>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * ListInput - Component for managing a list of items with drag-and-drop reordering
 * Supports inline editing, deletion, and adding new items
 * Output format: [{id, label}]
 */
export const ListInput: React.FC<ListInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Enter annotation...',
  addButtonText = 'Add Annotation',
  className,
  enableReordering = true,
  allowReorder,
  showCheckbox = false,
  commitOnBlur = false,
  name: fieldName,
  transformForSubmit,
  disabled = false,
  label,
  required = false,
  error,
  config,
}) => {
  const formContext = React.useContext(FormContext);
  // allowReorder takes precedence when provided (e.g. from config); otherwise use enableReordering
  const reorderingEnabled = allowReorder !== undefined ? allowReorder : enableReordering;
  // Extract validation pattern from config
  const validationPattern = config?.validation?.pattern;
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const inputRefs = React.useRef<Map<string, React.RefObject<HTMLInputElement | null>>>(new Map());
  const [itemRefsMap, setItemRefsMap] = useState<Map<string, React.RefObject<HTMLInputElement | null>>>(new Map());
  const valueRef = React.useRef<ListInputItem[]>(value);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // When commitOnBlur: use local state and only call onChange when focus leaves the list
  const [localValue, setLocalValue] = useState<ListInputItem[]>(value);
  const displayValue = commitOnBlur ? localValue : value;
  const lastSyncedJsonRef = React.useRef<string>(JSON.stringify(value));

  // Sync from prop only when value content actually changed (e.g. form reset), so we don't overwrite local edits on parent re-renders
  React.useEffect(() => {
    if (!commitOnBlur) return;
    const nextJson = JSON.stringify(value);
    if (nextJson !== lastSyncedJsonRef.current) {
      lastSyncedJsonRef.current = nextJson;
      setLocalValue(value);
    }
  }, [commitOnBlur, value]);

  // Keep ref in sync with display value for commitOnBlur (so focusout has latest)
  React.useEffect(() => {
    valueRef.current = displayValue;
  }, [displayValue]);
  
  // When commitOnBlur: commit to parent when focus leaves the list (e.g. user clicks Update form or another field)
  React.useEffect(() => {
    if (!commitOnBlur || !containerRef.current) return;
    const el = containerRef.current;
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node)) {
        const current = valueRef.current;
        lastSyncedJsonRef.current = JSON.stringify(current);
        onChange(current);
      }
    };
    el.addEventListener('focusout', onFocusOut);
    return () => el.removeEventListener('focusout', onFocusOut);
  }, [commitOnBlur, onChange]);

  // Register with form so this field's value is merged into submission data on submit (when user clicks Update form without blurring the list)
  React.useEffect(() => {
    if (!commitOnBlur || !fieldName || !formContext?.registerDeferredField) return;
    formContext.registerDeferredField(fieldName, () =>
      transformForSubmit ? transformForSubmit(valueRef.current) : valueRef.current
    );
    return () => formContext.unregisterDeferredField?.(fieldName);
  }, [commitOnBlur, fieldName, formContext, transformForSubmit]);

  // Set up refs for all current items using useEffect to avoid accessing refs during render
  React.useEffect(() => {
    const refsMap = new Map<string, React.RefObject<HTMLInputElement | null>>();
    displayValue.forEach((item) => {
      if (!inputRefs.current.has(item.id)) {
        inputRefs.current.set(item.id, React.createRef<HTMLInputElement>());
      }
      refsMap.set(item.id, inputRefs.current.get(item.id)!);
    });
    setItemRefsMap(refsMap);
  }, [displayValue]);

  // Clean up refs for deleted items
  React.useEffect(() => {
    const currentIds = new Set(displayValue.map(item => item.id));
    for (const [id] of inputRefs.current) {
      if (!currentIds.has(id)) {
        inputRefs.current.delete(id);
      }
    }
  }, [displayValue]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const current = commitOnBlur ? valueRef.current : displayValue;
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove([...current], oldIndex, newIndex);
        if (commitOnBlur) {
          setLocalValue(newItems);
        } else {
          onChange(newItems);
        }
      }
    },
    [displayValue, commitOnBlur, onChange]
  );

  const handleAddItem = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if button is inside a form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const current = commitOnBlur ? valueRef.current : displayValue;
    // Check if there's an empty item - prevent adding new one
    const hasEmptyItem = current.some(item => !item.label || item.label.trim() === '');
    if (hasEmptyItem) {
      return;
    }
    
    const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: ListInputItem = {
      id: newId,
      label: '',
      ...(showCheckbox ? { completed: false } : {}),
    };
    const next = [...current, newItem];
    if (commitOnBlur) {
      setLocalValue(next);
    } else {
      onChange(next);
    }
    // Automatically open new item in edit mode
    setEditingItemId(newId);
    // Focus the new item's input after it's rendered
    setTimeout(() => {
      const newItemRef = inputRefs.current.get(newId);
      if (newItemRef?.current) {
        newItemRef.current.focus();
        // Scroll input into view when focused (especially important on mobile when keyboard opens)
        scrollInputIntoView(newItemRef.current, { delay: 150 });
      }
    }, 0);
  }, [displayValue, commitOnBlur, onChange, showCheckbox]);

  const handleCommitAndAddNew = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const currentValue = valueRef.current;
        const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newItem: ListInputItem = {
          id: newId,
          label: '',
          ...(showCheckbox ? { completed: false } : {}),
        };
        const next = [...currentValue, newItem];
        if (commitOnBlur) {
          setLocalValue(next);
        } else {
          onChange(next);
        }
        setEditingItemId(newId);
        setTimeout(() => {
          const newItemRef = inputRefs.current.get(newId);
          if (newItemRef?.current) {
            newItemRef.current.focus();
            scrollInputIntoView(newItemRef.current, { delay: 150 });
          }
        }, 0);
      });
    });
  }, [commitOnBlur, onChange, showCheckbox]);

  const handleEditItem = useCallback(
    (id: string, label: string) => {
      const current = commitOnBlur ? valueRef.current : displayValue;
      const updatedItems = current.map((item) =>
        item.id === id ? { ...item, label } : item
      );
      if (commitOnBlur) {
        setLocalValue(updatedItems);
      } else {
        onChange(updatedItems);
      }
      if (editingItemId === id) {
        setEditingItemId(null);
      }
    },
    [displayValue, commitOnBlur, onChange, editingItemId]
  );

  const handleCompletedChange = useCallback(
    (id: string, completed: boolean) => {
      const current = commitOnBlur ? valueRef.current : displayValue;
      const updatedItems = current.map((item) =>
        item.id === id ? { ...item, completed } : item
      );
      if (commitOnBlur) {
        setLocalValue(updatedItems);
      } else {
        onChange(updatedItems);
      }
    },
    [displayValue, commitOnBlur, onChange]
  );

  const handleEditStateChange = useCallback((id: string, isEditing: boolean) => {
    if (isEditing) {
      setEditingItemId(id);
    } else {
      setEditingItemId(null);
    }
  }, []);

  const handleDeleteItem = useCallback(
    (id: string) => {
      const current = commitOnBlur ? valueRef.current : displayValue;
      const updatedItems = current.filter((item) => item.id !== id);
      if (commitOnBlur) {
        setLocalValue(updatedItems);
      } else {
        onChange(updatedItems);
      }
      if (editingItemId === id) {
        setEditingItemId(null);
      }
    },
    [displayValue, commitOnBlur, onChange, editingItemId]
  );

  const handlePasteSplit = useCallback(
    (id: string, items: string[]) => {
      const current = commitOnBlur ? valueRef.current : displayValue;
      const currentIndex = current.findIndex((item) => item.id === id);
      if (currentIndex === -1) return;

      const validation = config?.validation;
      const validItems = items.filter((item) => {
        const trimmed = item.trim();
        if (!trimmed) return false;
        if (validation?.pattern) {
          const result = validateField(trimmed, { pattern: validation.pattern });
          return result.isValid;
        }
        return true;
      });

      if (validItems.length === 0) return;

      const updatedItems = current.map((item) =>
        item.id === id ? { ...item, label: validItems[0] } : item
      );
      const newItems = validItems.slice(1).map((label) => ({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label: label.trim(),
        ...(showCheckbox ? { completed: false } : {}),
      }));
      const finalItems = [
        ...updatedItems.slice(0, currentIndex + 1),
        ...newItems,
        ...updatedItems.slice(currentIndex + 1),
      ];

      if (commitOnBlur) {
        setLocalValue(finalItems);
      } else {
        onChange(finalItems);
      }

      if (newItems.length > 0) {
        const lastNewItemId = newItems[newItems.length - 1].id;
        setEditingItemId(lastNewItemId);
        setTimeout(() => {
          const newItemRef = inputRefs.current.get(lastNewItemId);
          if (newItemRef?.current) {
            newItemRef.current.focus();
            scrollInputIntoView(newItemRef.current, { delay: 150 });
          }
        }, 0);
      } else {
        setEditingItemId(null);
      }
    },
    [displayValue, commitOnBlur, onChange, config, showCheckbox]
  );

  const itemIds = useMemo(() => displayValue.map((item) => item.id), [displayValue]);
  
  // Check if there's an empty item to disable add button
  const hasEmptyItem = displayValue.some(item => !item.label || item.label.trim() === '');

  const listContent = (
    <div className="space-y-1.5">
      {displayValue.map((item) => (
        <SortableListItem
          key={item.id}
          item={item}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          isSortable={reorderingEnabled && displayValue.length > 1}
          showCheckbox={showCheckbox}
          onCompletedChange={showCheckbox ? handleCompletedChange : undefined}
          isEditingControlled={editingItemId === item.id}
          onEditStateChange={handleEditStateChange}
          inputRef={itemRefsMap.get(item.id)}
          onPasteSplit={handlePasteSplit}
          validationPattern={validationPattern}
          onCommitAndAddNew={handleCommitAndAddNew}
        />
      ))}
    </div>
  );

  return (
    <div ref={containerRef} className={cn('w-full space-y-3', className)}>
      {label && (
        <label
          className={getLabelClasses({ error: Boolean(error), required, disabled })}
        >
          {label}
        </label>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {displayValue.length > 0 ? (
        reorderingEnabled ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              {listContent}
            </SortableContext>
          </DndContext>
        ) : (
          listContent
        )
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6 px-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
          Click the button below to add one.
        </div>
      )}

      <AddButtonFull
        label={addButtonText}
        onClick={handleAddItem}
        disabled={hasEmptyItem || disabled}
      />
    </div>
  );
};

ListInput.displayName = 'ListInput';

