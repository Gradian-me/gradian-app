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
  if (!Array.isArray(value)) return [];
  return value
    .map((item: unknown, index: number) => {
      const anyItem = item as Record<string, unknown> | null | undefined;
      const content = (anyItem?.content ?? anyItem?.text ?? '') as string;
      const isCompleted = (anyItem?.isCompleted ?? anyItem?.completed ?? false) as boolean;
      const id = (anyItem?.id ?? generateId()) as string;
      const order = typeof anyItem?.order === 'number' ? (anyItem.order as number) : index;
      return { id, content: String(content), isCompleted: Boolean(isCompleted), order };
    })
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
