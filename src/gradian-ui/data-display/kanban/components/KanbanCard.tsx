import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface KanbanCardProps {
  id: string;
  children: React.ReactNode;
  handleLabel: string;
  isRecentlyDropped?: boolean;
}

export function KanbanCard({ id, children, handleLabel, isRecentlyDropped = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:text-violet-600"
      aria-label={handleLabel}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );

  const content = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        kanbanDragHandle: dragHandle,
        kanbanDragging: isDragging,
      })
    : (
      <div className="rounded-xl overflow-hidden">
        <div className="flex items-center ps-2 pt-2">
          {dragHandle}
        </div>
        <div className="pt-1 ps-2 pe-2 pb-2">
          {children}
        </div>
      </div>
    );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none rounded-xl transition-all duration-300',
        isRecentlyDropped && 'kanban-drop-pulse',
        isDragging && 'opacity-60'
      )}
    >
      {content}
    </div>
  );
}

