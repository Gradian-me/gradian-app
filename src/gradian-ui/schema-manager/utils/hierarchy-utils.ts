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

/**
 * Check if a node or any of its descendants (recursive) are in the matched set.
 * This is used to determine if a node should be visible in search results.
 */
export const hasMatchingDescendant = (
  node: HierarchyNode,
  matchedIds: Set<string>,
  visited: Set<string> = new Set()
): boolean => {
  // Avoid infinite loops in case of cycles
  if (visited.has(node.id)) {
    return false;
  }
  visited.add(node.id);

  // If this node matches, return true
  if (matchedIds.has(node.id)) {
    return true;
  }

  // Recursively check all children
  for (const child of node.children) {
    if (hasMatchingDescendant(child, matchedIds, visited)) {
      return true;
    }
  }

  return false;
};

/**
 * Filter a hierarchy tree to only include nodes that match or have matching descendants.
 * Returns a new filtered tree structure.
 */
export const filterHierarchyTree = (
  nodes: HierarchyNode[],
  matchedIds: Set<string>
): HierarchyNode[] => {
  if (matchedIds.size === 0) {
    return nodes;
  }

  const filterNode = (node: HierarchyNode): HierarchyNode | null => {
    // Check if this node or any descendant matches
    if (!hasMatchingDescendant(node, matchedIds)) {
      return null;
    }

    // Recursively filter children
    const filteredChildren = node.children
      .map(filterNode)
      .filter((child): child is HierarchyNode => child !== null);

    // Return a new node with filtered children
    return {
      ...node,
      children: filteredChildren,
    };
  };

  return nodes.map(filterNode).filter((node): node is HierarchyNode => node !== null);
};


