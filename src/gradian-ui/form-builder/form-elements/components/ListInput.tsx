'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X, Edit2, Check, X as XIcon } from 'lucide-react';
import { ButtonMinimal } from './ButtonMinimal';
import { Button } from '@/components/ui/button';
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
}

const SortableListItem: React.FC<{
  item: AnnotationItem;
  onEdit: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  isSortable: boolean;
  isEditingControlled?: boolean; // If provided, use controlled editing state
  onEnterPress?: (id: string, label: string) => void; // Callback when Enter is pressed
  onEditStateChange?: (id: string, isEditing: boolean) => void; // Callback when edit state changes
}> = ({ 
  item, 
  onEdit, 
  onDelete, 
  isSortable,
  isEditingControlled,
  onEnterPress,
  onEditStateChange,
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.label);
  
  // Use controlled editing state if provided, otherwise use internal state
  const isEditing = isEditingControlled !== undefined ? isEditingControlled : internalIsEditing;
  
  // Update edit value when item label changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(item.label);
    }
  }, [item.label, isEditing]);

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
    if (editValue.trim()) {
      onEdit(item.id, editValue.trim());
      if (onEditStateChange) {
        onEditStateChange(item.id, false);
      } else {
        setInternalIsEditing(false);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (editValue.trim()) {
        if (onEnterPress) {
          // Call onEnterPress callback (for adding new item after saving)
          // Save current item first
          onEdit(item.id, editValue.trim());
          // Close edit mode for current item
          if (onEditStateChange) {
            onEditStateChange(item.id, false);
          } else {
            setInternalIsEditing(false);
          }
          // Then trigger enter press (which will add new item)
          onEnterPress(item.id, editValue.trim());
        } else {
          handleSaveEdit();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancelEdit();
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Always delete the item, regardless of edit state
    onDelete(item.id);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className={cn(
          'w-full rounded-lg border transition-all duration-200',
          isDragging
            ? 'border-violet-400 shadow-md ring-2 ring-violet-200 bg-white'
            : 'border-gray-200 bg-white hover:shadow-sm dark:border-gray-700 dark:bg-gray-800'
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
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={(e) => {
                    // Don't save on blur if clicking a button (relatedTarget check)
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (!relatedTarget || !relatedTarget.closest('button')) {
                      handleSaveEdit();
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  autoFocus
                />
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
                    onClick={handleSaveEdit}
                  />
                  <ButtonMinimal
                    icon={XIcon}
                    title="Cancel"
                    color="red"
                    size="sm"
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
                    onClick={handleStartEdit}
                  />
                  <ButtonMinimal
                    icon={X}
                    title="Delete"
                    color="red"
                    size="sm"
                    onClick={handleDelete}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
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

  const handleAddItem = useCallback(() => {
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

  const handleEnterPress = useCallback(
    (id: string, label: string) => {
      // Save the current item and add a new one in a single update
      const updatedItems = value.map((item) =>
        item.id === id ? { ...item, label } : item
      );
      const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newItem: AnnotationItem = {
        id: newId,
        label: '',
      };
      onChange([...updatedItems, newItem]);
      // Close edit mode for current item and open for new item
      setEditingItemId(newId);
    },
    [value, onChange]
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
          onEnterPress={handleEnterPress}
          onEditStateChange={handleEditStateChange}
        />
      ))}
    </div>
  );

  return (
    <div className={cn('space-y-3', className)}>
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
          No annotations yet. Click the button below to add one.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddItem}
        disabled={hasEmptyItem}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        {addButtonText}
      </Button>
    </div>
  );
};

ListInput.displayName = 'ListInput';

