/**
 * Dialog component to display todos as a graph visualization
 */

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import { todosToGraphData } from '../utils/todo-to-graph-utils';
import type { Todo } from '../types';

export interface TodoGraphViewerDialogProps {
  todos: Todo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TodoGraphViewerDialog({
  todos,
  open,
  onOpenChange,
}: TodoGraphViewerDialogProps) {
  const graphData = React.useMemo(() => {
    if (todos.length === 0) {
      return {
        nodes: [],
        edges: [],
        nodeTypes: [],
        relationTypes: [],
        schemas: [],
      };
    }
    return todosToGraphData(todos);
  }, [todos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-lg font-semibold">
            Todo Execution Graph
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            Visual representation of todos and their dependencies. Nodes show status with color coding.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
          {graphData.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No todos to display
            </div>
          ) : (
            <GraphViewer
              data={graphData}
              height="100%"
              layout="dagre-lr"
              allowSelection={true}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

