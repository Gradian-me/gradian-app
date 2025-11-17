'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableFieldProps {
  id: string;
  children: React.ReactNode;
  isIncomplete?: boolean;
  isInactive?: boolean;
}

export function SortableField({ id, children, isIncomplete = false, isInactive = false }: SortableFieldProps) {
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
      <div className={`w-full rounded-lg border hover:shadow-sm transition-all duration-200 ${
        isDragging 
          ? 'border-violet-400 shadow-md ring-2 ring-violet-200 bg-white' 
          : isInactive
            ? 'border-gray-300 bg-gray-50 opacity-60'
            : isIncomplete 
              ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-200' 
              : 'border-gray-200 bg-white'
      }`}>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className={`cursor-grab active:cursor-grabbing transition-colors p-0.5 shrink-0 ${
                isInactive ? 'text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

