'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, GripVertical, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RepeatingSectionProps {
  title: string;
  items: any[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onCopy?: (index: number) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
  maxItems?: number;
  minItems?: number;
  className?: string;
}

export function RepeatingSection({
  title,
  items,
  onAdd,
  onRemove,
  onCopy,
  onMove,
  renderItem,
  maxItems,
  minItems = 0,
  className = '',
}: RepeatingSectionProps) {
  const canAdd = maxItems ? items.length < maxItems : true;
  const canRemove = items.length > minItems;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
            {items.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No items added yet</p>
            {canAdd && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="mt-4"
              >
                <Plus className="h-4 w-4 me-2" />
                Add {title}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {onMove && (
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-600 cursor-grab"
                            title="Drag to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        )}
                        <span className="text-sm font-medium text-gray-600">
                          {title.slice(0, -1)} {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {onCopy && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onCopy(index)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Copy item"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canRemove && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onRemove(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {renderItem(item, index)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Add button under the last item */}
            {canAdd && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAdd}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add {title}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing repeating sections
export function useRepeatingSection<T>(
  initialItems: T[] = [],
  generateId: () => string = () => Math.random().toString(36).substr(2, 9)
) {
  const [items, setItems] = React.useState<T[]>(
    initialItems.map(item => ({ ...item, id: (item as any).id || generateId() }))
  );

  const addItem = React.useCallback((newItem: Omit<T, 'id'>) => {
    setItems(prev => [...prev, { ...newItem, id: generateId() } as T]);
  }, [generateId]);

  const removeItem = React.useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = React.useCallback((index: number, updatedItem: Partial<T>) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updatedItem } : item
    ));
  }, []);

  const moveItem = React.useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);

  const copyItem = React.useCallback((index: number) => {
    setItems(prev => {
      const itemToCopy = prev[index];
      const copiedItem = { ...itemToCopy, id: generateId() };
      return [...prev, copiedItem];
    });
  }, [generateId]);

  const resetItems = React.useCallback((newItems: T[] = []) => {
    setItems(newItems.map(item => ({ ...item, id: (item as any).id || generateId() })));
  }, [generateId]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    copyItem,
    resetItems,
    setItems,
  };
}
