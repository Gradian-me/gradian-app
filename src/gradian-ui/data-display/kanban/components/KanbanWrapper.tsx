import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import { KanbanColumn, KanbanColumnMeta } from './KanbanColumn';

interface KanbanWrapperProps<TItem extends { id: string | number }> {
  columns: KanbanColumnMeta[];
  items: TItem[];
  getItemColumnId: (item: TItem) => string | null | undefined;
  onCardMove: (item: TItem, targetColumnId: string) => Promise<void> | void;
  onCardMoveError?: (error: unknown) => void;
  onColumnOrderChange?: (orderedColumnIds: string[]) => void;
  allowColumnReorder?: boolean;
  renderCard: (item: TItem, index: number) => React.ReactNode;
  emptyColumnLabel: string;
  cardHandleLabel: string;
  columnHandleLabel: string;
  initialColumnOrder?: string[];
  className?: string;
}

function parseColumnId(value: string): string {
  return value.replace(/^col:/, '');
}

function parseCardId(value: string): string {
  return value.replace(/^card:/, '');
}

function cloneBoard<T>(board: Record<string, T[]>): Record<string, T[]> {
  return Object.fromEntries(Object.entries(board).map(([k, v]) => [k, [...v]]));
}

export function KanbanWrapper<TItem extends { id: string | number }>({
  columns,
  items,
  getItemColumnId,
  onCardMove,
  onCardMoveError,
  onColumnOrderChange,
  allowColumnReorder = false,
  renderCard,
  emptyColumnLabel,
  cardHandleLabel,
  columnHandleLabel,
  initialColumnOrder,
  className,
}: KanbanWrapperProps<TItem>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnMap = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(columns.map((c) => c.id));
  const [board, setBoard] = useState<Record<string, TItem[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const [recentlyDroppedCardId, setRecentlyDroppedCardId] = useState<string | null>(null);
  const dropPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartBoardRef = useRef<Record<string, TItem[]> | null>(null);

  const markRecentlyDropped = (cardId: string) => {
    setRecentlyDroppedCardId(cardId);
    if (dropPulseTimeoutRef.current) {
      clearTimeout(dropPulseTimeoutRef.current);
    }
    dropPulseTimeoutRef.current = setTimeout(() => {
      setRecentlyDroppedCardId(null);
      dropPulseTimeoutRef.current = null;
    }, 900);
  };

  useEffect(() => {
    const available = columns.map((c) => c.id);
    if (!initialColumnOrder || initialColumnOrder.length === 0) {
      setColumnOrder(available);
      return;
    }
    const validPreferred = initialColumnOrder.filter((id) => available.includes(id));
    const remainder = available.filter((id) => !validPreferred.includes(id));
    setColumnOrder([...validPreferred, ...remainder]);
  }, [columns, initialColumnOrder]);

  useEffect(() => {
    const next: Record<string, TItem[]> = {};
    for (const col of columns) {
      next[col.id] = [];
    }

    for (const item of items) {
      if (!item || item.id === undefined || item.id === null) continue;
      const rawColumnId = getItemColumnId(item);
      const candidateId = rawColumnId && columnMap.has(rawColumnId) ? rawColumnId : columns[0]?.id;
      if (!candidateId) continue;
      next[candidateId].push(item);
    }

    setBoard(next);
  }, [columns, items, getItemColumnId, columnMap]);

  useEffect(() => {
    return () => {
      if (dropPulseTimeoutRef.current) {
        clearTimeout(dropPulseTimeoutRef.current);
      }
    };
  }, []);

  const idToItem = useMemo(() => {
    const m = new Map<string, TItem>();
    for (const colId of Object.keys(board)) {
      for (const item of board[colId] ?? []) {
        if (!item || item.id === undefined || item.id === null) continue;
        m.set(String(item.id), item);
      }
    }
    return m;
  }, [board]);

  const findCardLocation = (cardId: string): { columnId: string; index: number } | null => {
    for (const [columnId, list] of Object.entries(board)) {
      const idx = list.findIndex((x) => x && x.id !== undefined && x.id !== null && String(x.id) === cardId);
      if (idx >= 0) return { columnId, index: idx };
    }
    return null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!active || !over) {
      setHoveredColumnId(null);
      return;
    }

    const activeValue = String(active.id);
    if (!activeValue.startsWith('card:')) {
      setHoveredColumnId(null);
      return;
    }

    const overValue = String(over.id);
    if (overValue.startsWith('col:')) {
      setHoveredColumnId(parseColumnId(overValue));
      return;
    }

    if (overValue.startsWith('card:')) {
      const overCardId = parseCardId(overValue);
      const location = findCardLocation(overCardId);
      setHoveredColumnId(location?.columnId ?? null);
      return;
    }

    setHoveredColumnId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setHoveredColumnId(null);
    const activeValue = String(active.id);
    if (!over) {
      if (activeValue.startsWith('card:') && dragStartBoardRef.current) {
        setBoard(cloneBoard(dragStartBoardRef.current));
      }
      dragStartBoardRef.current = null;
      return;
    }

    const overValue = String(over.id);

    if (activeValue.startsWith('col:') && overValue.startsWith('col:')) {
      if (!allowColumnReorder) {
        dragStartBoardRef.current = null;
        return;
      }
      const oldIndex = columnOrder.findIndex((id) => id === parseColumnId(activeValue));
      const newIndex = columnOrder.findIndex((id) => id === parseColumnId(overValue));
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const reordered = arrayMove(columnOrder, oldIndex, newIndex);
      setColumnOrder(reordered);
      onColumnOrderChange?.(reordered);
      dragStartBoardRef.current = null;
      return;
    }

    if (!activeValue.startsWith('card:')) {
      dragStartBoardRef.current = null;
      return;
    }
    const activeCardId = parseCardId(activeValue);
    const source = findCardLocation(activeCardId);
    if (!source) {
      if (dragStartBoardRef.current) {
        setBoard(cloneBoard(dragStartBoardRef.current));
      }
      dragStartBoardRef.current = null;
      return;
    }

    let targetColumnId: string | null = null;
    let targetIndex = 0;

    if (overValue.startsWith('col:')) {
      targetColumnId = parseColumnId(overValue);
      targetIndex = (board[targetColumnId] ?? []).length;
    } else if (overValue.startsWith('card:')) {
      const overCardId = parseCardId(overValue);
      const location = findCardLocation(overCardId);
      if (!location) {
        if (dragStartBoardRef.current) {
          setBoard(cloneBoard(dragStartBoardRef.current));
        }
        dragStartBoardRef.current = null;
        return;
      }
      targetColumnId = location.columnId;
      targetIndex = location.index;
    }

    if (!targetColumnId || !board[targetColumnId]) {
      if (dragStartBoardRef.current) {
        setBoard(cloneBoard(dragStartBoardRef.current));
      }
      dragStartBoardRef.current = null;
      return;
    }

    const previousBoard = cloneBoard(board);
    const nextBoard = cloneBoard(board);

    if (source.columnId === targetColumnId) {
      const from = source.index;
      let to = targetIndex;
      const sourceList = nextBoard[targetColumnId];
      if (!sourceList || from < 0 || from >= sourceList.length) return;
      if (to > from) to -= 1;
      if (to < 0) to = 0;
      if (to >= sourceList.length) to = sourceList.length - 1;
      nextBoard[targetColumnId] = arrayMove(sourceList, from, to);
      setBoard(nextBoard);
      markRecentlyDropped(activeCardId);
      dragStartBoardRef.current = null;
      return;
    }

    const sourceList = nextBoard[source.columnId];
    if (!sourceList || source.index < 0 || source.index >= sourceList.length) return;
    const [moved] = sourceList.splice(source.index, 1);
    if (!moved) return;
    nextBoard[targetColumnId].splice(targetIndex, 0, moved);
    setBoard(nextBoard);
    markRecentlyDropped(activeCardId);

    try {
      await onCardMove(moved, targetColumnId);
    } catch (error) {
      setBoard(dragStartBoardRef.current ? cloneBoard(dragStartBoardRef.current) : previousBoard);
      setRecentlyDroppedCardId(null);
      onCardMoveError?.(error);
    } finally {
      dragStartBoardRef.current = null;
    }
  };

  const activeCard = activeId && activeId.startsWith('card:') ? idToItem.get(parseCardId(activeId)) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) => {
        setActiveId(String(event.active.id));
        dragStartBoardRef.current = cloneBoard(board);
      }}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setHoveredColumnId(null);
        if (dragStartBoardRef.current) {
          setBoard(cloneBoard(dragStartBoardRef.current));
        }
        dragStartBoardRef.current = null;
      }}
    >
      <SortableContext
        items={columnOrder.map((id) => `col:${id}`)}
        strategy={horizontalListSortingStrategy}
      >
        <div className={cn('flex h-full w-full gap-4 overflow-x-auto pb-2', className)}>
          {columnOrder.map((columnId) => {
            const column = columnMap.get(columnId);
            if (!column) return null;
            const colItems = (board[columnId] ?? []).filter((item) => item && item.id !== undefined && item.id !== null);
            return (
              <KanbanColumn
                key={columnId}
                column={column}
                count={colItems.length}
                emptyLabel={emptyColumnLabel}
                handleLabel={columnHandleLabel}
                allowReorder={allowColumnReorder}
                isDropHovered={hoveredColumnId === columnId && activeId?.startsWith('card:') === true}
              >
                <SortableContext
                  items={colItems.map((item) => `card:${item.id}`)}
                  strategy={rectSortingStrategy}
                >
                  {colItems.map((item, index) => (
                    <KanbanCard
                      key={item.id}
                      id={`card:${item.id}`}
                      handleLabel={cardHandleLabel}
                      isRecentlyDropped={recentlyDroppedCardId === String(item.id)}
                    >
                      {renderCard(item, index)}
                    </KanbanCard>
                  ))}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeCard ? <div className="w-[320px] opacity-90">{renderCard(activeCard, 0)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

