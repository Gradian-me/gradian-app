import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { GripVertical } from 'lucide-react';
import { resolveDisplayLabel, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { getNodeBorderColor } from '@/domains/graph-designer/utils/color-mapper';

/** Label may be a string or a localized value (e.g. { en: "To Do", fa: "انجام شود" } or array of same). */
export interface KanbanColumnMeta {
  id: string;
  label: string | Record<string, string> | Array<Record<string, string>>;
  color?: string;
  icon?: string;
}

interface KanbanColumnProps {
  column: KanbanColumnMeta;
  count: number;
  emptyLabel: string;
  handleLabel: string;
  allowReorder?: boolean;
  isDropHovered?: boolean;
  children: React.ReactNode;
}

function getDotColor(color?: string): string {
  if (!color) return getNodeBorderColor('violet');
  return getNodeBorderColor(color);
}

export function KanbanColumn({ column, count, emptyLabel, handleLabel, allowReorder = false, isDropHovered = false, children }: KanbanColumnProps) {
  const language = useLanguageStore((s) => s.getLanguage?.()) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const columnLabel = resolveDisplayLabel(column.label, language, defaultLang);

  const {
    setNodeRef: setSortableNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `col:${column.id}`, disabled: !allowReorder });
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({ id: `col:${column.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  return (
    <div
      ref={setSortableNodeRef}
      style={style}
      className={cn(
        'flex h-full min-w-[300px] max-w-[360px] flex-col rounded-2xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-800/50',
        isDragging && 'opacity-70'
      )}
    >
      <div
        className="mb-3 flex items-center justify-between rounded-xl px-1 py-1"
      >
        <div className="flex min-w-0 items-center gap-2">
          {allowReorder ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md bg-white/80 text-gray-500 shadow-sm transition hover:text-violet-600 active:cursor-grabbing dark:bg-gray-900/80"
              aria-label={handleLabel}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: getDotColor(column.color) }}
          />
          {column.icon ? (
            <IconRenderer iconName={column.icon} className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          ) : null}
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {columnLabel}
          </span>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          {count}
        </span>
      </div>

      <div
        ref={setDroppableNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto rounded-xl border border-transparent p-1 transition-colors',
          (isOver || isDropHovered) && 'border-2 border-dashed border-violet-500 bg-violet-50/80 dark:border-violet-400 dark:bg-violet-900/30'
        )}
      >
        {count === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
            {emptyLabel}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

