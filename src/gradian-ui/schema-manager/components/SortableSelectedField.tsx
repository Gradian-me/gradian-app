'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortableSelectedFieldProps {
  id: string;
  label: string;
  name: string;
  onRemove: () => void;
}

export function SortableSelectedField({ id, label, name, onRemove }: SortableSelectedFieldProps) {
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
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className={`w-full rounded-lg border transition-all duration-200 ${
        isDragging 
          ? 'border-violet-400 shadow-md ring-2 ring-violet-200 bg-white' 
          : 'border-gray-200 bg-white hover:shadow-sm'
      }`}>
        <div className="p-2">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({name})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-gray-400 dark:text-gray-600 hover:text-red-600 hover:bg-red-50 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

