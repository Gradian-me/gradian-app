import { normalizeOptionArray } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';

export interface HierarchyNode {
  id: string;
  entity: any;
  parentId?: string | null;
  children: HierarchyNode[];
}

/**
 * Extract parentId from an entity's `parent` field.
 * Expects the value style used by popup pickers: [{ id, label, icon, color }]
 */
export const getParentIdFromEntity = (entity: any): string | null => {
  if (!entity || !entity.parent) return null;
  const arr = normalizeOptionArray(entity.parent);
  if (!arr.length) return null;
  const first = arr[0];
  if (!first) return null;
  if (typeof first === 'string' || typeof first === 'number') {
    return String(first);
  }
  if (first.id) return String(first.id);
  return null;
};

/**
 * Build a parent/child hierarchy from a flat list of entities.
 * Items whose parent is not present in the list are treated as roots.
 */
export const buildHierarchyTree = (
  items: any[]
): { roots: HierarchyNode[]; nodeMap: Map<string, HierarchyNode> } => {
  const nodeMap = new Map<string, HierarchyNode>();

  // First pass – create nodes
  for (const entity of items || []) {
    const id = entity?.id ? String(entity.id) : null;
    if (!id) continue;

    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        entity,
        parentId: null,
        children: [],
      });
    } else {
      // Merge entity into existing node if already created as a child
      const existing = nodeMap.get(id)!;
      existing.entity = entity;
    }
  }

  // Second pass – wire up parent/child relationships
  for (const node of nodeMap.values()) {
    const parentId = getParentIdFromEntity(node.entity);
    if (parentId && parentId !== node.id && nodeMap.has(parentId)) {
      node.parentId = parentId;
      const parentNode = nodeMap.get(parentId)!;
      if (!parentNode.children.some((child) => child.id === node.id)) {
        parentNode.children.push(node);
      }
    }
  }

  // Detect and avoid simple cycles by breaking parent links that create cycles
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const dfsDetectCycle = (node: HierarchyNode) => {
    if (inStack.has(node.id)) {
      // Break cycle by removing parent
      node.parentId = null;
      return;
    }
    if (visited.has(node.id)) return;

    visited.add(node.id);
    inStack.add(node.id);
    for (const child of node.children) {
      dfsDetectCycle(child);
    }
    inStack.delete(node.id);
  };

  for (const node of nodeMap.values()) {
    dfsDetectCycle(node);
  }

  // Roots are nodes without a valid parentId
  const roots: HierarchyNode[] = [];
  for (const node of nodeMap.values()) {
    if (!node.parentId || !nodeMap.has(node.parentId)) {
      roots.push(node);
    }
  }

  return { roots, nodeMap };
};

/**
 * Get all ancestor IDs (from closest parent up to the root) for a given node ID.
 */
export const getAncestorIds = (nodeMap: Map<string, HierarchyNode>, nodeId: string): string[] => {
  const ancestors: string[] = [];
  const visited = new Set<string>();

  let currentId: string | null = nodeId;

  while (currentId) {
    if (visited.has(currentId)) {
      // Safety guard against cycles
      break;
    }
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (!node || !node.parentId) break;

    ancestors.push(node.parentId);
    currentId = node.parentId;
  }

  return ancestors;
};


