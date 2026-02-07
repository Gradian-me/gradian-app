'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BadgeRenderer } from '../utils/badge-viewer';
import type { BadgeItem } from '../utils/badge-viewer';
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
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { getLabelClasses } from '../utils/field-styles';

interface SortableSelectorConfig {
  name?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
}

export interface SortableSelectorItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

export interface SortableSelectorProps {
  /**
   * All available items to choose from
   */
  availableItems: SortableSelectorItem[];
  
  /**
   * Currently selected items (in order)
   */
  selectedItems: SortableSelectorItem[];
  
  /**
   * Callback when selected items change (including reordering)
   */
  onChange: (selectedItems: SortableSelectorItem[]) => void;
  
  /**
   * Whether items can be reordered via drag and drop
   * @default true
   */
  isSortable?: boolean;
  
  /**
   * Main field label/name displayed above the component
   */
  fieldLabel?: string;
  
  /**
   * Optional config metadata (similar to other form elements)
   */
  config?: SortableSelectorConfig;
  
  /**
   * Label for the selected items section
   * @default "Selected Items"
   */
  selectedLabel?: string;
  
  /**
   * Label for the available items section
   * @default "Available Items"
   */
  availableLabel?: string;
  
  /**
   * Maximum height for the lists (with scrolling)
   * @default "max-h-60"
   */
  maxHeight?: string;
  
  /**
   * Custom className for the container
   */
  className?: string;
  
  /**
   * Empty state message when no items are selected
   */
  emptySelectedMessage?: string;
  
  /**
   * Empty state message when no items are available
   */
  emptyAvailableMessage?: string;
  
  /**
   * URL to fetch available items from (overrides availableItems prop if provided)
   */
  sourceUrl?: string;
  
  /**
   * Query parameters to append to sourceUrl
   */
  queryParams?: Record<string, string | number | boolean | string[]>;
  
  /**
   * Transform function to convert API response to option format
   * Note: The icon should be a string (icon name), not a React node. It will be converted to a React node internally.
   */
  transform?: (data: any) => Array<{ id?: string; label?: string; name?: string; title?: string; icon?: string; color?: string; disabled?: boolean; value?: string }>;
}

/**
 * SortableItem - Internal component for rendering a sortable selected item
 */
interface SortableItemProps {
  item: SortableSelectorItem;
  onRemove: () => void;
  isSortable: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, onRemove, isSortable }) => {
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

  const hasIconOrColor = Boolean(item.icon || item.color);

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className={cn(
        "w-full rounded-lg border transition-all duration-200",
        isDragging
          ? 'border-violet-400 shadow-md ring-2 ring-violet-200 bg-white'
          : 'border-gray-200 bg-white hover:shadow-sm'
      )}>
        <div className="p-2">
          <div className="flex items-center gap-2">
            {isSortable && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors p-0.5 shrink-0"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {hasIconOrColor ? (
                <BadgeRenderer
                  items={[{
                    id: item.id,
                    label: item.label,
                    icon: item.icon,
                    color: item.color,
                  } as BadgeItem]}
                  maxBadges={0}
                  animate={false}
                  className="justify-start"
                />
              ) : (
                <span className="text-sm font-medium text-gray-800">{item.label}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
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
 * SortableSelector - Component for selecting and reordering items
 * Supports drag-and-drop reordering when isSortable is true
 * Uses BadgeRenderer to display items with icons and colors
 */
export const SortableSelector: React.FC<SortableSelectorProps> = ({
  availableItems = [],
  selectedItems = [],
  onChange,
  isSortable = true,
  fieldLabel,
  config,
  selectedLabel = 'Selected Items',
  availableLabel = 'Available Items',
  maxHeight = 'max-h-60',
  className,
  emptySelectedMessage = 'No items selected. Select items below to add them.',
  emptyAvailableMessage = 'No items available.',
  sourceUrl,
  queryParams,
  transform,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch options from URL if sourceUrl is provided
  const {
    options: urlOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
  } = useOptionsFromUrl({
    sourceUrl,
    enabled: Boolean(sourceUrl),
    transform: transform, // Use transform if provided, otherwise use default from useOptionsFromUrl
    queryParams,
  });

  // Convert URL options to SortableSelectorItem format
  const urlAvailableItems = useMemo(() => {
    if (!sourceUrl || !urlOptions.length) return [];
    return urlOptions.map(opt => ({
      id: opt.id,
      label: opt.label ?? opt.id,
      icon: opt.icon ? <IconRenderer iconName={opt.icon} className="h-3 w-3" /> : undefined,
      color: opt.color,
    }));
  }, [sourceUrl, urlOptions]);

  // Use URL items if sourceUrl is provided, otherwise use provided availableItems
  const resolvedAvailableItems = sourceUrl ? urlAvailableItems : availableItems;

  // Use ref to track the latest selectedItems to avoid stale closure issues
  const selectedItemsRef = useRef(selectedItems);
  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  const handleToggleItem = useCallback((itemId: string) => {
    const currentItems = selectedItemsRef.current;
    const isSelected = currentItems.some(item => item.id === itemId);
    const item = resolvedAvailableItems.find(i => i.id === itemId);
    
    if (!item) return;

    if (isSelected) {
      // Remove from selected
      onChange(currentItems.filter(item => item.id !== itemId));
    } else {
      // Add to selected
      onChange([...currentItems, item]);
    }
  }, [resolvedAvailableItems, onChange]);

  const handleRemoveItem = useCallback((itemId: string) => {
    const currentItems = selectedItemsRef.current;
    onChange(currentItems.filter(item => item.id !== itemId));
  }, [onChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!isSortable) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Use ref to get the latest selectedItems
    const currentItems = selectedItemsRef.current;
    const oldIndex = currentItems.findIndex(item => item.id === active.id);
    const newIndex = currentItems.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(currentItems, oldIndex, newIndex);
      onChange(reordered);
    }
  }, [isSortable, onChange]);

  const getAvailableItems = () => {
    const selectedIds = new Set(selectedItems.map(item => item.id));
    return resolvedAvailableItems.filter(item => !selectedIds.has(item.id));
  };

  const unselectedItems = getAvailableItems();

  const resolvedFieldLabel = config?.label || fieldLabel;
  const helperText = config?.helperText;
  const fieldName = config?.name || resolvedFieldLabel?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn("w-full", className)}>
      {resolvedFieldLabel && (
        <label
          htmlFor={fieldName}
          dir="auto"
          className={getLabelClasses({ required: config?.required })}
        >
          {resolvedFieldLabel}
        </label>
      )}
      {helperText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
      <div className={cn("space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 border border-gray-200 rounded-lg p-4")}>
        {/* Available Items Section */}
        <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-700 mb-2 block dark:text-gray-200">
          {availableLabel}
        </p>
        <div className="flex-1">
          {isLoadingOptions ? (
            <div className="border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
              Loading options...
            </div>
          ) : optionsError ? (
            <div className="border border-red-200 rounded-lg p-4 text-center text-sm text-red-600">
              {optionsError}
            </div>
          ) : unselectedItems.length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
              {emptyAvailableMessage}
            </div>
          ) : (
            <div className={cn("space-y-2 overflow-y-auto border border-gray-200 rounded-lg p-3", maxHeight)}>
              {unselectedItems.map((item) => {
                const hasIconOrColor = Boolean(item.icon || item.color);
                return (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sortable-selector-${item.id}`}
                      checked={false}
                      onCheckedChange={() => handleToggleItem(item.id)}
                    />
                    <label
                      htmlFor={`sortable-selector-${item.id}`}
                      className="text-sm font-normal cursor-pointer flex-1 text-gray-700 dark:text-gray-200"
                    >
                      {hasIconOrColor ? (
                        <BadgeRenderer
                          items={[{
                            id: item.id,
                            label: item.label,
                            icon: item.icon,
                            color: item.color,
                          } as BadgeItem]}
                          maxBadges={0}
                          animate={false}
                          className="justify-start"
                        />
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Items Section */}
      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-700 mb-2 block dark:text-gray-200">
          {selectedLabel} ({selectedItems.length})
        </p>
        <div className="flex-1">
          {selectedItems.length > 0 ? (
            <div>
              {isSortable ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={cn("space-y-2 overflow-y-auto border border-gray-200 rounded-lg p-3", maxHeight)}>
                      {selectedItems.map((item) => (
                        <SortableItem
                          key={item.id}
                          item={item}
                          onRemove={() => handleRemoveItem(item.id)}
                          isSortable={isSortable}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className={cn("space-y-2 overflow-y-auto border border-gray-200 rounded-lg p-3", maxHeight)}>
                  <AnimatePresence mode="popLayout">
                    {selectedItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, height: 0 }}
                        transition={{
                          duration: 0.2,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        <SortableItem
                          item={item}
                          onRemove={() => handleRemoveItem(item.id)}
                          isSortable={false}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
              {emptySelectedMessage}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

SortableSelector.displayName = 'SortableSelector';

