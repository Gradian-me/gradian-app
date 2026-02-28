/**
 * Checklist value normalization and serialization.
 * Used when rendering checklist via ListInput (showCheckbox + allowReorder)
 * and when sending data to APIs that expect legacy { text, completed }.
 */

export interface ChecklistItemType {
  id: string;
  content: string;
  isCompleted: boolean;
  order: number;
}

function generateId(): string {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Normalize legacy { text, completed } or partial items to ChecklistItemType[] */
export function normalizeChecklistValue(value: unknown): ChecklistItemType[] {
  if (!value) return [];

  // Support plain comma-separated string (e.g. "A,B") for AI/legacy fillers.
  if (typeof value === 'string') {
    const parts = value
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return parts.map((content, index) => ({
      id: generateId(),
      content,
      isCompleted: false,
      order: index,
    }));
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item: unknown, index: number) => {
      // Allow simple string/number arrays like ['A', 'B'] or [1, 2]
      if (item == null || typeof item !== 'object') {
        const content = String(item ?? '').trim();
        if (!content) return null;
        return {
          id: generateId(),
          content,
          isCompleted: false,
          order: index,
        };
      }

      const anyItem = item as Record<string, unknown> | null | undefined;
      const content = (anyItem?.content ?? anyItem?.text ?? '') as string;
      const isCompleted = (anyItem?.isCompleted ?? anyItem?.completed ?? false) as boolean;
      const id = (anyItem?.id ?? generateId()) as string;
      const order = typeof anyItem?.order === 'number' ? (anyItem.order as number) : index;
      return { id, content: String(content), isCompleted: Boolean(isCompleted), order };
    })
    .filter((item): item is ChecklistItemType => item !== null)
    .sort((a, b) => a.order - b.order);
}

/** Serialize to legacy { text, completed } for APIs that expect it (e.g. notes) */
export function checklistToLegacy(
  items: ChecklistItemType[]
): { text: string; completed: boolean }[] {
  return items.map((item) => ({ text: item.content, completed: item.isCompleted }));
}

/** Convert ChecklistItemType[] to ListInput format (id, label, completed) for ListInput value */
export function checklistToListInputItems(
  items: ChecklistItemType[]
): { id: string; label: string; completed: boolean }[] {
  return items.map((item) => ({
    id: item.id,
    label: item.content,
    completed: item.isCompleted,
  }));
}

/** Convert ListInput items (id, label, completed) back to ChecklistItemType[] with order = index */
export function listInputItemsToChecklist(
  items: { id: string; label: string; completed?: boolean }[]
): ChecklistItemType[] {
  return items.map((item, index) => ({
    id: item.id,
    content: item.label,
    isCompleted: item.completed === true,
    order: index,
  }));
}

/**
 * Same as listInputItemsToChecklist but omits the order property for API payloads.
 * Array position is the source of truth; no separate order column needed.
 */
export function listInputItemsToChecklistForSubmit(
  items: { id: string; label: string; completed?: boolean }[]
): Omit<ChecklistItemType, 'order'>[] {
  return items.map((item) => ({
    id: item.id,
    content: item.label,
    isCompleted: item.completed === true,
  }));
}
