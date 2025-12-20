'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X, Edit2, Check, X as XIcon } from 'lucide-react';
import { ButtonMinimal } from './ButtonMinimal';
import { Button } from '@/components/ui/button';
import { ConfirmationMessage } from './ConfirmationMessage';
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

export interface AnnotationItem {
  id: string;
  label: string;
}

export interface ListInputProps {
  value: AnnotationItem[];
  onChange: (items: AnnotationItem[]) => void;
  placeholder?: string;
  addButtonText?: string;
  className?: string;
  enableReordering?: boolean; // Enable drag-and-drop reordering (default: true)
  disabled?: boolean; // Disable add button when loading (default: false)
  label?: string; // Label to display above the list
  required?: boolean; // Whether the field is required
  error?: string; // Error message to display
  config?: any; // Config object containing validation rules
}

const SortableListItem: React.FC<{
  item: AnnotationItem;
  onEdit: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  isSortable: boolean;
  isEditingControlled?: boolean; // If provided, use controlled editing state
  onEnterPress?: (id: string, label: string) => void; // Callback when Enter is pressed
  onEditStateChange?: (id: string, isEditing: boolean) => void; // Callback when edit state changes
  inputRef?: React.RefObject<HTMLInputElement | null>; // Ref for focusing input
  onPasteSplit?: (id: string, items: string[]) => void; // Callback when comma-separated values are pasted
  validationPattern?: RegExp | string; // Validation pattern for item labels
}> = ({ 
  item, 
  onEdit, 
  onDelete, 
  isSortable,
  isEditingControlled,
  onEnterPress,
  onEditStateChange,
  inputRef,
  onPasteSplit,
  validationPattern,
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.label);
  const [itemError, setItemError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const internalInputRef = React.useRef<HTMLInputElement>(null);
  const inputElementRef = inputRef || internalInputRef;
  const isDeletingRef = React.useRef(false);
  
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
        inputElementRef.current?.focus();
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
    if (e.key === 'Enter') {
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
      // If item is newly added (has no original content), delete it; otherwise just cancel editing
      if (!item.label || item.label.trim() === '') {
        onDelete(item.id);
      } else {
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
      <div ref={setNodeRef} style={style} className="relative">
        <div
          className={cn(
            'w-full rounded border transition-all duration-200',
            isDragging
              ? 'border-violet-400 shadow-md ring-2 ring-violet-200 bg-white'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
          )}
        >
          <div className="p-2">
            <div className="flex items-center gap-2">
            {isSortable && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors p-0.5 shrink-0 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <>
                  <input
                    ref={inputElementRef}
                    type="text"
                    value={editValue}
                    onChange={handleInputChange}
                    onPaste={handlePaste}
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
                      "w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-gray-100",
                      itemError 
                        ? "border-red-500 focus:ring-red-500 dark:border-red-500" 
                        : "border-gray-300 focus:ring-violet-500 dark:border-gray-600"
                    )}
                    dir="auto"
                  />
                  {itemError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{itemError}</p>
                  )}
                </>
              ) : (
                <span
                  className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-text"
                  onClick={handleStartEdit}
                >
                  {item.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
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
  disabled = false,
  label,
  required = false,
  error,
  config,
}) => {
  // Extract validation pattern from config
  const validationPattern = config?.validation?.pattern;
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const inputRefs = React.useRef<Map<string, React.RefObject<HTMLInputElement | null>>>(new Map());
  const [itemRefsMap, setItemRefsMap] = useState<Map<string, React.RefObject<HTMLInputElement | null>>>(new Map());
  
  // Set up refs for all current items using useEffect to avoid accessing refs during render
  React.useEffect(() => {
    const refsMap = new Map<string, React.RefObject<HTMLInputElement | null>>();
    value.forEach((item) => {
      if (!inputRefs.current.has(item.id)) {
        inputRefs.current.set(item.id, React.createRef<HTMLInputElement>());
      }
      refsMap.set(item.id, inputRefs.current.get(item.id)!);
    });
    setItemRefsMap(refsMap);
  }, [value]);

  // Clean up refs for deleted items
  React.useEffect(() => {
    const currentIds = new Set(value.map(item => item.id));
    for (const [id] of inputRefs.current) {
      if (!currentIds.has(id)) {
        inputRefs.current.delete(id);
      }
    }
  }, [value]);

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

      const oldIndex = value.findIndex((item) => item.id === active.id);
      const newIndex = value.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(value, oldIndex, newIndex);
        onChange(newItems);
      }
    },
    [value, onChange]
  );

  const handleAddItem = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if button is inside a form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Check if there's an empty item - prevent adding new one
    const hasEmptyItem = value.some(item => !item.label || item.label.trim() === '');
    if (hasEmptyItem) {
      return;
    }
    
    const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: AnnotationItem = {
      id: newId,
      label: '',
    };
    onChange([...value, newItem]);
    // Automatically open new item in edit mode
    setEditingItemId(newId);
    // Focus the new item's input after it's rendered
    setTimeout(() => {
      const newItemRef = inputRefs.current.get(newId);
      if (newItemRef?.current) {
        newItemRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  const handleEditItem = useCallback(
    (id: string, label: string) => {
      const updatedItems = value.map((item) =>
        item.id === id ? { ...item, label } : item
      );
      onChange(updatedItems);
      // Close edit mode after saving
      if (editingItemId === id) {
        setEditingItemId(null);
      }
    },
    [value, onChange, editingItemId]
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
      const updatedItems = value.filter((item) => item.id !== id);
      onChange(updatedItems);
      // Clear editing state if the deleted item was being edited
      if (editingItemId === id) {
        setEditingItemId(null);
      }
    },
    [value, onChange, editingItemId]
  );

  const handlePasteSplit = useCallback(
    (id: string, items: string[]) => {
      // Find the current item index
      const currentIndex = value.findIndex((item) => item.id === id);
      if (currentIndex === -1) return;

      // Filter and validate items based on pattern if provided
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

      // Update the current item with the first valid value
      const updatedItems = value.map((item) =>
        item.id === id ? { ...item, label: validItems[0] } : item
      );

      // Add new items for the remaining valid values
      const newItems = validItems.slice(1).map((label) => ({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label: label.trim(),
      }));

      // Insert new items after the current item
      const finalItems = [
        ...updatedItems.slice(0, currentIndex + 1),
        ...newItems,
        ...updatedItems.slice(currentIndex + 1),
      ];

      onChange(finalItems);

      // If there are new items, open the last one in edit mode
      if (newItems.length > 0) {
        const lastNewItemId = newItems[newItems.length - 1].id;
        setEditingItemId(lastNewItemId);
        // Focus the new item's input after it's rendered
        setTimeout(() => {
          const newItemRef = inputRefs.current.get(lastNewItemId);
          if (newItemRef?.current) {
            newItemRef.current.focus();
          }
        }, 0);
      } else {
        // Close edit mode for current item
        setEditingItemId(null);
      }
    },
    [value, onChange, config]
  );

  const itemIds = useMemo(() => value.map((item) => item.id), [value]);
  
  // Check if there's an empty item to disable add button
  const hasEmptyItem = value.some(item => !item.label || item.label.trim() === '');

  const listContent = (
    <div className="space-y-2">
      {value.map((item) => (
        <SortableListItem
          key={item.id}
          item={item}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          isSortable={enableReordering && value.length > 1}
          isEditingControlled={editingItemId === item.id}
          onEditStateChange={handleEditStateChange}
          inputRef={itemRefsMap.get(item.id)}
          onPasteSplit={handlePasteSplit}
          validationPattern={validationPattern}
        />
      ))}
    </div>
  );

  return (
    <div className={cn('w-full space-y-3', className)}>
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
      {value.length > 0 ? (
        enableReordering ? (
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
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          Click the button below to add one.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddItem}
        disabled={hasEmptyItem || disabled}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        {addButtonText}
      </Button>
    </div>
  );
};

ListInput.displayName = 'ListInput';

