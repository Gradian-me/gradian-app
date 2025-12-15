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
 */
function getStatusColor(status: Todo['status']): string {
  switch (status) {
    case 'completed':
      return '#10b981'; // emerald-500
    case 'in_progress':
      return '#3b82f6'; // blue-500
    case 'cancelled':
      return '#ef4444'; // red-500
    case 'pending':
    default:
      return '#6b7280'; // gray-500
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
    case 'cancelled':
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
export function todosToGraphData(todos: Todo[]): TodoGraphData {
  // Normalize todos - convert step references to actual IDs
  const normalizedTodos = todos.map((todo) => ({
    ...todo,
    dependencies: normalizeDependencies(todo, todos),
  }));

  // Create nodes from todos
  const nodes: GraphNodeData[] = normalizedTodos.map((todo) => {
    const statusColor = getStatusColor(todo.status);
    const statusIcon = getStatusIcon(todo.status);
    
    // Map status to nodeType ID for proper styling
    let nodeTypeId = 'todo-pending';
    switch (todo.status) {
      case 'completed':
        nodeTypeId = 'todo-completed';
        break;
      case 'in_progress':
        nodeTypeId = 'todo-in-progress';
        break;
      case 'cancelled':
        nodeTypeId = 'todo-cancelled';
        break;
      default:
        nodeTypeId = 'todo-pending';
    }

    return {
      id: todo.id,
      schemaId: 'todo-node', // We'll create a custom schema for todos
      title: todo.title,
      incomplete: todo.status !== 'completed',
      parentId: null,
      payload: {
        status: todo.status,
        description: todo.description,
        agentId: todo.agentId,
        agentType: todo.agentType,
        duration: todo.duration,
        statusColor,
        statusIcon,
        nodeTypeId, // Add nodeTypeId to payload for reference
        createdAt: todo.createdAt,
        completedAt: todo.completedAt,
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

  // Define node types for different statuses
  const nodeTypes = [
    {
      id: 'todo-pending',
      label: 'Pending',
      color: '#6b7280', // gray-500
      icon: 'clock',
    },
    {
      id: 'todo-in-progress',
      label: 'In Progress',
      color: '#3b82f6', // blue-500
      icon: 'loader-2',
    },
    {
      id: 'todo-completed',
      label: 'Completed',
      color: '#10b981', // emerald-500
      icon: 'check-circle',
    },
    {
      id: 'todo-cancelled',
      label: 'Cancelled',
      color: '#ef4444', // red-500
      icon: 'x-circle',
    },
  ];

  // Define relation type for dependencies
  const relationTypes = [
    {
      id: 'depends-on',
      label: 'Depends On',
      color: '#6b7280', // gray-500
      icon: 'arrow-right',
    },
  ];

  // Define schema for todos
  const schemas = [
    {
      id: 'todo-node',
      label: 'Todo',
      color: '#6b7280', // gray-500 (default, will be overridden by nodeType)
      icon: 'list-todo',
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

