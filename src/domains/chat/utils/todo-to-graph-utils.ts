/**
 * Utility functions to convert Todo data to Graph format
 */

import type { Todo } from '../types';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';

export interface TodoGraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  nodeTypes?: Array<{
    id: string;
    label: string;
    color: string;
    icon?: string;
  }>;
  relationTypes?: Array<{
    id: string;
    label: string;
    color: string;
    icon?: string;
  }>;
  schemas?: Array<{
    id: string;
    label: string;
    color: string;
    icon?: string;
  }>;
}

/**
 * Get status color based on todo status
 * Uses Tailwind color names for sharp pastel colors
 */
function getStatusColor(status: Todo['status']): string {
  switch (status) {
    case 'completed':
      return 'emerald'; // Sharp pastel green
    case 'in_progress':
      return 'sky'; // Sharp pastel blue
    case 'failed':
      return 'rose'; // Sharp pastel red
    case 'pending':
    default:
      return 'slate'; // Sharp pastel gray
  }
}

/**
 * Get status icon based on todo status
 */
function getStatusIcon(status: Todo['status']): string {
  switch (status) {
    case 'completed':
      return 'check-circle';
    case 'in_progress':
      return 'loader-2';
    case 'failed':
      return 'x-circle';
    case 'pending':
    default:
      return 'clock';
  }
}

/**
 * Normalize dependencies - convert step references to actual todo IDs
 */
function normalizeDependencies(todo: Todo, allTodos: Todo[]): string[] {
  if (!todo.dependencies || todo.dependencies.length === 0) {
    return [];
  }

  return todo.dependencies
    .map((dep) => {
      // If it's already an ID, return it
      if (allTodos.some((t) => t.id === dep)) {
        return dep;
      }
      // If it's a title reference (e.g., "Step 1"), find the matching todo
      const matchingTodo = allTodos.find((t) => t.title === dep || t.id === dep);
      return matchingTodo?.id;
    })
    .filter((id): id is string => Boolean(id));
}

/**
 * Convert todos to graph nodes and edges
 */
export function todosToGraphData(todos: Todo[], executingTodoId?: string | null): TodoGraphData {
  // Normalize todos - convert step references to actual IDs
  const normalizedTodos = todos.map((todo) => ({
    ...todo,
    dependencies: normalizeDependencies(todo, todos),
  }));

  // Create nodes from todos
  const nodes: GraphNodeData[] = normalizedTodos.map((todo) => {
    // Check if this todo is currently executing (even if status hasn't been updated yet)
    const isExecuting = executingTodoId === todo.id || todo.status === 'in_progress';
    const effectiveStatus = isExecuting ? 'in_progress' : todo.status;
    
    const statusColor = getStatusColor(effectiveStatus);
    const statusIcon = getStatusIcon(effectiveStatus);
    
    // Map status to nodeType ID for proper styling
    // Use nodeTypeId as schemaId so graph viewer can style it correctly
    let nodeTypeId = 'todo-pending';
    switch (effectiveStatus) {
      case 'completed':
        nodeTypeId = 'todo-completed';
        break;
      case 'in_progress':
        nodeTypeId = 'todo-in-progress';
        break;
      case 'failed':
        nodeTypeId = 'todo-failed';
        break;
      default:
        nodeTypeId = 'todo-pending';
    }

    return {
      id: todo.id,
      schemaId: nodeTypeId, // Use nodeTypeId as schemaId for proper styling
      title: todo.title,
      incomplete: effectiveStatus !== 'completed',
      parentId: null,
      payload: {
        status: effectiveStatus,
        originalStatus: todo.status, // Keep original status for reference
        description: todo.description,
        agentId: todo.agentId,
        agentType: todo.agentType,
        duration: todo.duration,
        statusColor,
        statusIcon,
        nodeTypeId, // Add nodeTypeId to payload for reference
        createdAt: todo.createdAt,
        completedAt: todo.completedAt,
        isExecuting, // Flag to indicate if currently executing
      },
    };
  });

  // Create edges from dependencies
  const edges: GraphEdgeData[] = [];
  const edgeIdSet = new Set<string>();

  normalizedTodos.forEach((todo) => {
    if (todo.dependencies && todo.dependencies.length > 0) {
      todo.dependencies.forEach((depId) => {
        // Ensure the dependency exists in the todos list
        const depTodo = normalizedTodos.find((t) => t.id === depId);
        if (depTodo) {
          const edgeId = `${depId}-${todo.id}`;
          // Avoid duplicate edges
          if (!edgeIdSet.has(edgeId)) {
            edgeIdSet.add(edgeId);
            edges.push({
              id: edgeId,
              source: depId,
              target: todo.id,
              sourceSchema: 'todo-node',
              sourceId: depId,
              targetSchema: 'todo-node',
              targetId: todo.id,
              relationTypeId: 'depends-on',
            });
          }
        }
      });
    }
  });

  // Define node types for different statuses with Tailwind color names
  // Using sharp pastel colors with good contrast
  const nodeTypes = [
    {
      id: 'todo-pending',
      label: 'Pending',
      color: 'slate', // Sharp pastel gray
      icon: 'clock',
    },
    {
      id: 'todo-in-progress',
      label: 'In Progress',
      color: 'sky', // Sharp pastel blue
      icon: 'loader-2',
    },
    {
      id: 'todo-completed',
      label: 'Completed',
      color: 'emerald', // Sharp pastel green
      icon: 'check-circle',
    },
    {
      id: 'todo-failed',
      label: 'Failed',
      color: 'rose', // Sharp pastel red
      icon: 'x-circle',
    },
  ];

  // Define relation type for dependencies
  const relationTypes = [
    {
      id: 'depends-on',
      label: 'Depends On',
      color: 'slate', // Sharp pastel gray
      icon: 'arrow-right',
    },
  ];

  // Define schemas for todos - include all node types as schemas for proper styling
  const schemas = [
    {
      id: 'todo-pending',
      label: 'Todo (Pending)',
      color: 'slate',
      icon: 'clock',
    },
    {
      id: 'todo-in-progress',
      label: 'Todo (In Progress)',
      color: 'sky',
      icon: 'loader-2',
    },
    {
      id: 'todo-completed',
      label: 'Todo (Completed)',
      color: 'emerald',
      icon: 'check-circle',
    },
    {
      id: 'todo-failed',
      label: 'Todo (Failed)',
      color: 'rose',
      icon: 'x-circle',
    },
  ];

  return {
    nodes,
    edges,
    nodeTypes,
    relationTypes,
    schemas,
  };
}

