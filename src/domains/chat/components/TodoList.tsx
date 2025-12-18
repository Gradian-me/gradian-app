// Todo List Component
// Displays todos with approval flow, one-by-one execution, and MetricCard styling

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Play, Loader2, Eye, Timer, AlertCircle, GripVertical, Edit2, Trash2, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';
import { CardWrapper, CardHeader, CardTitle, CardContent } from '@/gradian-ui/data-display/card/components/CardWrapper';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card';
import { TodoResponseDialog } from './TodoResponseDialog';
import { TodoEditDialog } from './TodoEditDialog';
import { TodoGraphViewerDialog } from './TodoGraphViewerDialog';
import { extractTodoParameters, formatParameterValue, getParameterLabel } from '../utils/todo-parameter-utils';
import { useAiAgents } from '@/domains/ai-builder';
import { truncateText } from '../utils/text-utils';
import { ButtonMinimal } from '@/gradian-ui/form-builder/form-elements';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  useDndMonitor,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from '../types';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export interface TodoListProps {
  todos: Todo[];
  chatId: string;
  initialInput: string;
  onApprove?: (todos: Todo[]) => void;
  onReject?: () => void;
  onExecute?: (todos: Todo[]) => Promise<void>;
  onTodosUpdate?: (todos: Todo[]) => void; // Callback to update todos in parent
  onTodoExecuted?: (todo: Todo, result: any) => Promise<void>; // Callback to add message after todo execution
  isExecuting?: boolean;
  isExpanded?: boolean; // Whether the accordion is expanded
  showExecuteButton?: boolean; // Whether to show the Execute Plan button (only for latest plan)
  onExpandedChange?: (expanded: boolean) => void; // Callback when user manually expands/collapses
  className?: string;
}

// Format duration in milliseconds to human-readable string
const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  chatId,
  initialInput,
  onApprove,
  onReject,
  onExecute,
  onTodosUpdate,
  onTodoExecuted,
  isExecuting = false,
  isExpanded = true,
  showExecuteButton = true,
  onExpandedChange,
  className,
}) => {
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos);
  const [executingTodoId, setExecutingTodoId] = useState<string | null>(null);
  const [selectedTodoForDialog, setSelectedTodoForDialog] = useState<Todo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isGraphViewerOpen, setIsGraphViewerOpen] = useState(false);
  const { agents: aiAgents } = useAiAgents({ summary: true });
  const cancelExecutionRef = React.useRef(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Normalize dependencies: convert step references (Step 1, Step 2, etc.) to actual todo IDs
  const normalizedTodos = React.useMemo(() => {
    return localTodos.map((todo, index) => {
      if (!todo.dependencies || todo.dependencies.length === 0) {
        return todo;
      }

      const normalizedDeps = todo.dependencies.map((dep: string) => {
        // Check if dependency is a step reference (Step 1, Step 2, etc.)
        const stepMatch = dep.match(/^Step\s*(\d+)$/i);
        if (stepMatch) {
          const stepIndex = parseInt(stepMatch[1], 10) - 1;
          if (stepIndex >= 0 && stepIndex < localTodos.length && stepIndex !== index) {
            return localTodos[stepIndex].id;
          }
        }

        // Check if dependency is a numeric index (1, 2, 3, etc.)
        const numMatch = dep.match(/^(\d+)$/);
        if (numMatch) {
          const depIndex = parseInt(numMatch[1], 10) - 1;
          if (depIndex >= 0 && depIndex < localTodos.length && depIndex !== index) {
            return localTodos[depIndex].id;
          }
        }

        // Check if dependency matches a todo title
        const matchingTodo = localTodos.find((t) => t.title === dep);
        if (matchingTodo && matchingTodo.id !== todo.id) {
          return matchingTodo.id;
        }

        // Check if dependency is already a valid todo ID
        const existingTodo = localTodos.find((t) => t.id === dep);
        if (existingTodo && existingTodo.id !== todo.id) {
          return dep;
        }

        return dep;
      });

      return {
        ...todo,
        dependencies: normalizedDeps,
      };
    });
  }, [localTodos]);

  // Handle drag start
  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  }, []);

  // Helper function to update dependencies for all todos based on current order
  const updateDependenciesBasedOnOrder = useCallback((todos: Todo[]): Todo[] => {
    return todos.map((todo, index) => {
      // First todo has no dependencies
      if (index === 0) {
        return {
          ...todo,
          dependencies: [],
        };
      }
      
      // Each todo depends on the previous todo in the current order
      const previousTodo = todos[index - 1];
      return {
        ...todo,
        dependencies: previousTodo ? [previousTodo.id] : [],
      };
    });
  }, []);

  // Update local todos when props change and ensure dependencies are initialized sequentially
  React.useEffect(() => {
    if (!todos || todos.length === 0) {
      setLocalTodos(todos);
      return;
    }

    // Build the expected dependency chain based on current order
    const expectedTodos = updateDependenciesBasedOnOrder(todos);

    // Check if incoming todos already match the expected dependency chain
    const depsMatch = todos.every((todo, idx) => {
      const expectedDeps = expectedTodos[idx]?.dependencies || [];
      const currentDeps = todo.dependencies || [];
      if (expectedDeps.length !== currentDeps.length) return false;
      return expectedDeps.every((depId, depIdx) => currentDeps[depIdx] === depId);
    });

    if (depsMatch) {
      setLocalTodos(todos);
      return;
    }

    // If not aligned, normalize dependencies based on order and notify parent
    setLocalTodos(expectedTodos);
    if (onTodosUpdate) {
      onTodosUpdate(expectedTodos);
    }
  }, [todos, updateDependenciesBasedOnOrder, onTodosUpdate]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset drag state
    setActiveId(null);
    setOverId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = localTodos.findIndex(t => t.id === active.id);
      const newIndex = localTodos.findIndex(t => t.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTodos = arrayMove(localTodos, oldIndex, newIndex);
        
        // Update dependencies for ALL todos based on the new order
        const updatedTodos = updateDependenciesBasedOnOrder(reorderedTodos);
        
        setLocalTodos(updatedTodos);
        
        // Update parent
        if (onTodosUpdate) {
          onTodosUpdate(updatedTodos);
        }
      }
    }
  }, [localTodos, onTodosUpdate, updateDependenciesBasedOnOrder]);

  // Handle todo edit
  const handleEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setIsEditDialogOpen(true);
  }, []);

  // Handle save edited todo
  const handleSaveEditedTodo = useCallback((updatedTodo: Todo) => {
    const updatedTodos = localTodos.map(t => t.id === updatedTodo.id ? updatedTodo : t);
    setLocalTodos(updatedTodos);
    
    // Update parent
    if (onTodosUpdate) {
      onTodosUpdate(updatedTodos);
    }
  }, [localTodos, onTodosUpdate]);

  // Handle todo delete
  const handleDeleteTodo = useCallback((todo: Todo) => {
    setTodoToDelete(todo);
    setIsDeleteDialogOpen(true);
  }, []);

  // Confirm delete
  const handleConfirmDelete = useCallback(() => {
    if (!todoToDelete) return;
    
    // Remove the deleted todo
    const todosAfterDelete = localTodos.filter(t => t.id !== todoToDelete.id);
    
    // Update dependencies for ALL remaining todos based on the new order
    const updatedTodos = updateDependenciesBasedOnOrder(todosAfterDelete);
    
    setLocalTodos(updatedTodos);
    
    // Update parent
    if (onTodosUpdate) {
      onTodosUpdate(updatedTodos);
    }
    
    setIsDeleteDialogOpen(false);
    setTodoToDelete(null);
  }, [todoToDelete, localTodos, onTodosUpdate, updateDependenciesBasedOnOrder]);

  // Topological sort todos by dependencies (only for execution, not for display)
  const sortedTodos = React.useMemo(() => {
    const sorted = [...normalizedTodos];
    sorted.sort((a, b) => {
      // If a depends on b, b comes first
      if (a.dependencies?.some(dep => dep === b.id || dep === b.title)) return 1;
      // If b depends on a, a comes first
      if (b.dependencies?.some(dep => dep === a.id || dep === a.title)) return -1;
      return 0;
    });
    return sorted;
  }, [normalizedTodos]);

  // Execute todos one by one
  const executeTodosOneByOne = useCallback(async () => {
    if (!chatId || !initialInput) {
      console.error('Chat ID and initial input are required');
      return;
    }

    let currentInput = initialInput;
    const completedTodoIds = new Set<string>();

    // Start with current local todos
    let workingTodos = [...localTodos];
    cancelExecutionRef.current = false;

    for (const todo of sortedTodos) {
      if (cancelExecutionRef.current) {
        break;
      }
      // Check if dependencies are met
      if (todo.dependencies && todo.dependencies.length > 0) {
        const unmetDeps = todo.dependencies.filter(depId => !completedTodoIds.has(depId));
        if (unmetDeps.length > 0) {
          console.warn(`Todo ${todo.id} has unmet dependencies: ${unmetDeps.join(', ')}`);
          continue;
        }
      }

      // Find the current state of this todo
      const currentTodo = workingTodos.find(t => t.id === todo.id);
      if (!currentTodo) continue;

      // Skip if already completed
      if (currentTodo.status === 'completed') {
        completedTodoIds.add(currentTodo.id);
        // Use output from completed todo as input for next
        if (currentTodo.output) {
          currentInput = typeof currentTodo.output === 'string' 
            ? currentTodo.output 
            : JSON.stringify(currentTodo.output);
        }
        continue;
      }

      // Set executing state
      setExecutingTodoId(currentTodo.id);
      const inProgressTodo = { ...currentTodo, status: 'in_progress' as const };
      workingTodos = workingTodos.map(t => t.id === currentTodo.id ? inProgressTodo : t);
      setLocalTodos(workingTodos);

      try {
        // Execute single todo
        const response = await fetch(`/api/chat/${chatId}/execute-todo/${currentTodo.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialInput: currentInput }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          const updatedTodo = result.data.todo;
          
          // Update working todos
          workingTodos = workingTodos.map(t => t.id === currentTodo.id ? updatedTodo : t);
          
          // Update local state
          setLocalTodos(workingTodos);

          // Update parent todos
          if (onTodosUpdate) {
            onTodosUpdate(workingTodos);
          }

          completedTodoIds.add(updatedTodo.id);
          
          // Add message to chat after todo execution
          if (onTodoExecuted && updatedTodo.status === 'completed') {
            await onTodoExecuted(updatedTodo, result.data);
          }
          
          // Use output as input for next todo
          if (updatedTodo.output) {
            currentInput = typeof updatedTodo.output === 'string' 
              ? updatedTodo.output 
              : JSON.stringify(updatedTodo.output);
          }
        } else {
          console.error('Failed to execute todo:', result.error);
          // Mark as failed and save error
          const errorMessage = result.error || 'Failed to execute todo';
          const failedTodo = { 
            ...currentTodo, 
            status: 'failed' as const,
            output: errorMessage, // Save error as output for tooltip
            chainMetadata: {
              ...currentTodo.chainMetadata,
              input: currentInput,
              executedAt: new Date().toISOString(),
              error: errorMessage,
            },
          };
          workingTodos = workingTodos.map(t => t.id === currentTodo.id ? failedTodo : t);
          setLocalTodos(workingTodos);
          break; // Stop execution on error
        }
      } catch (error) {
        console.error('Error executing todo:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const failedTodo = { 
          ...currentTodo, 
          status: 'failed' as const,
          output: errorMessage, // Save error as output for tooltip
          chainMetadata: {
            ...currentTodo.chainMetadata,
            input: currentInput,
            executedAt: new Date().toISOString(),
            error: errorMessage,
          },
        };
        workingTodos = workingTodos.map(t => t.id === currentTodo.id ? failedTodo : t);
        setLocalTodos(workingTodos);
        break; // Stop execution on error
      } finally {
        setExecutingTodoId(null);
      }
    }

    // After all todos are executed, call onExecute if provided
    if (onExecute) {
      await onExecute(workingTodos);
    }
  }, [chatId, initialInput, sortedTodos, onExecute, onTodosUpdate, onTodoExecuted, localTodos]);

  const handleApprove = () => {
    if (onApprove) {
      onApprove(normalizedTodos);
    } else {
      // Execute todos one by one
      executeTodosOneByOne();
    }
  };

  const handleStopExecution = () => {
    cancelExecutionRef.current = true;
    setExecutingTodoId(null);
  };

  const handleShowResponse = (todo: Todo) => {
    setSelectedTodoForDialog(todo);
    setIsDialogOpen(true);
  };

  // Calculate overall execution plan status
  const executionPlanStatus = React.useMemo(() => {
    if (localTodos.length === 0) return 'pending';
    
    // Check if any todo is executing
    const hasExecuting = localTodos.some(t => t.status === 'in_progress' || executingTodoId === t.id);
    if (hasExecuting) return 'in_progress';
    
    // Check if all todos are completed
    const allCompleted = localTodos.every(t => t.status === 'completed');
    if (allCompleted) return 'completed';
    
    // Check if any todo is failed
    const hasFailed = localTodos.some(t => t.status === 'failed');
    if (hasFailed) return 'failed';
    
    // Default to pending
    return 'pending';
  }, [localTodos, executingTodoId]);

  // Get status icon for execution plan header
  const getExecutionPlanStatusIcon = () => {
    switch (executionPlanStatus) {
      case 'completed':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="shrink-0"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </motion.div>
        );
      case 'in_progress':
        return (
          <div className="shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          </div>
        );
      case 'failed':
        return (
          <div className="shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </div>
        );
      default: // pending
        return (
          <div className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <Clock className="w-3 h-3 text-gray-400" />
          </div>
        );
    }
  };

  const getStatusIcon = (todo: Todo) => {
    if (todo.status === 'completed') {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="shrink-0"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        </motion.div>
      );
    }
    
    if (todo.status === 'failed') {
      // Get error message from chainMetadata.error first, then output, then default
      // If output is a string and looks like an error message, use it
      const errorFromOutput = typeof todo.output === 'string' 
        ? todo.output 
        : null;
      const errorMessage = todo.chainMetadata?.error || errorFromOutput || 'Execution failed';
      
      const iconElement = (
        <div className="shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center cursor-help">
          <X className="w-3 h-3 text-white" />
        </div>
      );

      // Always show tooltip for failed todos (even if message is generic)
      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              {iconElement}
            </TooltipTrigger>
            <TooltipContent 
              side="right" 
              sideOffset={8}
              className="z-50 max-w-xs"
            >
              <div className="space-y-1">
                <p className="font-semibold text-xs">Error</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap wrap-break-word">
                  {errorMessage}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (todo.status === 'in_progress' || executingTodoId === todo.id) {
      return (
        <div className="shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        </div>
      );
    }

    return (
      <div className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
        <Clock className="w-2.5 h-2.5 text-gray-400" />
      </div>
    );
  };

  // Calculate total duration
  const totalDuration = React.useMemo(() => {
    return localTodos
      .filter(t => t.status === 'completed' && t.duration !== undefined && t.duration !== null)
      .reduce((sum, t) => sum + (t.duration || 0), 0);
  }, [localTodos]);

  // Can execute if all todos are either:
  // 1. Have no dependencies, OR
  // 2. All their dependencies exist in the list
  const canExecute = React.useMemo(() => {
    if (normalizedTodos.length === 0) return false;
    
    return normalizedTodos.every((todo) => {
      if (!todo.dependencies || todo.dependencies.length === 0) {
        return true;
      }
      const allDepsMet = todo.dependencies.every((depRef) => {
        const depTodo = normalizedTodos.find((t) => 
          t.id === depRef || t.title === depRef
        );
        return depTodo !== undefined;
      });
      return allDepsMet;
    });
  }, [normalizedTodos]);

  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const executingTodoTitle = React.useMemo(() => {
    if (!executingTodoId) return null;
    const t = localTodos.find((todo) => todo.id === executingTodoId);
    return t?.title || null;
  }, [executingTodoId, localTodos]);
  
  // Sync with prop changes
  React.useEffect(() => {
    setLocalExpanded(isExpanded);
  }, [isExpanded]);

  if (localTodos.length === 0) {
    return null;
  }

  const accordionValue = localExpanded ? 'execution-plan' : '';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('mb-4', className)}
      >
        <Accordion 
          type="single" 
          collapsible 
          value={accordionValue}
          onValueChange={(value) => {
            const expanded = value === 'execution-plan';
            setLocalExpanded(expanded);
            onExpandedChange?.(expanded);
          }}
          className="w-full"
        >
          <AccordionItem value="execution-plan" className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-3 py-2 hover:no-underline bg-gray-50 dark:bg-gray-900/50 rounded-t-lg">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  {/* Execution Plan Status Icon */}
                  {getExecutionPlanStatusIcon()}
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 text-left">
                      Execution Plan
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0 text-left">
                      {localTodos.length} step{localTodos.length !== 1 ? 's' : ''} to execute
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {totalDuration > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1 shrink-0 text-[10px] px-1.5 py-0 h-4">
                      <Timer className="w-2.5 h-2.5" />
                      {formatDuration(totalDuration)}
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="p-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={normalizedTodos.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={cn(
                  "space-y-1.5",
                  activeId && "cursor-grabbing"
                )}>
                  <AnimatePresence>
                    {normalizedTodos.map((todo, index) => {
                  const isCompleted = todo.status === 'completed';
                  const isExecuting = todo.status === 'in_progress' || executingTodoId === todo.id;
                  const isBlocked = todo.dependencies && todo.dependencies.some(
                    (depId) => {
                      const depTodo = localTodos.find((t) => t.id === depId);
                      return depTodo && depTodo.status !== 'completed';
                    }
                  );

                  return (
                    <React.Fragment key={todo.id}>
                      {/* Drop indicator line above the item when dragging over it */}
                      {activeId && overId === todo.id && activeId !== todo.id && (
                        <div className="h-0.5 bg-violet-500 dark:bg-violet-400 rounded-full mx-2 my-1 animate-pulse cursor-move" />
                      )}
                      <SortableTodoItem
                        todo={todo}
                        index={index}
                        isCompleted={isCompleted}
                        isBlocked={isBlocked || false}
                        getStatusIcon={getStatusIcon}
                        onEdit={handleEditTodo}
                        onDelete={handleDeleteTodo}
                        onShowResponse={handleShowResponse}
                        formatDuration={formatDuration}
                        isOver={overId === todo.id && activeId !== todo.id}
                        aiAgents={aiAgents}
                        executingTodoId={executingTodoId}
                      />
                    </React.Fragment>
                  );
                    })}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>

                {/* Action Buttons - Only show for latest execution plan */}
                {showExecuteButton && (
                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsGraphViewerOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Network className="w-4 h-4" />
                      View Graph
                    </Button>
                    <div className="flex items-center gap-2">
                    {onReject && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onReject}
                        disabled={isExecuting || executingTodoId !== null}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    )}
                    {(onApprove || onExecute) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleApprove}
                        disabled={isExecuting || executingTodoId !== null || !canExecute}
                        className="flex items-center gap-2"
                      >
                        {(isExecuting || executingTodoId !== null) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <TextShimmerWave as="span" duration={1.5} className="text-sm">
                              Executing...
                            </TextShimmerWave>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Execute Plan
                          </>
                        )}
                      </Button>
                    )}
                    {(isExecuting || executingTodoId) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStopExecution}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Stop
                      </Button>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>

      {/* Floating executing badge near chat input area */}
      {(isExecuting || executingTodoId) && executingTodoTitle && (
        <div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg border border-violet-200 dark:border-violet-800 px-3 py-1.5">
            <div className="w-6 h-6 rounded-full border-2 border-violet-200 dark:border-violet-700 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-300 animate-spin" />
            </div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-100 flex items-center gap-1">
              <TextShimmerWave as="span" duration={1.5} className="text-sm">
                Executing:
              </TextShimmerWave>
              <span className="font-semibold text-violet-700 dark:text-violet-300">{executingTodoTitle}</span>
            </div>
          </div>
        </div>
      )}

      {/* Response Dialog */}
      <TodoResponseDialog
        todo={selectedTodoForDialog}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {/* Edit Dialog */}
      <TodoEditDialog
        todo={editingTodo}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEditedTodo}
      />

      {/* Graph Viewer Dialog */}
      <TodoGraphViewerDialog
        todos={localTodos}
        open={isGraphViewerOpen}
        onOpenChange={setIsGraphViewerOpen}
        executingTodoId={executingTodoId}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationMessage
        isOpen={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setTodoToDelete(null);
          }
        }}
        title="Delete Todo"
        message={`Are you sure you want to delete "${todoToDelete?.title}"? This action cannot be undone.`}
        variant="destructive"
        size="md"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => {
              setIsDeleteDialogOpen(false);
              setTodoToDelete(null);
            },
          },
          {
            label: 'Delete',
            variant: 'destructive',
            icon: 'Trash2',
            action: handleConfirmDelete,
          },
        ]}
      />
    </>
  );
};

// Sortable Todo Item Component
interface SortableTodoItemProps {
  todo: Todo;
  index: number;
  isCompleted: boolean;
  isBlocked: boolean;
  getStatusIcon: (todo: Todo) => React.ReactNode;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onShowResponse: (todo: Todo) => void;
  formatDuration: (ms: number) => string;
  isOver?: boolean; // Whether this item is being dragged over
  aiAgents?: any[]; // AI agents for parameter label resolution
  executingTodoId?: string | null; // ID of currently executing todo
}

const SortableTodoItem: React.FC<SortableTodoItemProps> = ({
  todo,
  index,
  isCompleted,
  isBlocked,
  getStatusIcon,
  onEdit,
  onDelete,
  onShowResponse,
  formatDuration,
  isOver = false,
  aiAgents = [],
  executingTodoId = null,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: todo.id,
    disabled: isCompleted || todo.status === 'in_progress' // Disable dragging for completed/executing todos
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex items-start gap-2 px-2 py-1.5 rounded-md border transition-all group',
        isCompleted
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : isBlocked
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        isDragging && 'ring-2 ring-violet-200 dark:ring-violet-800 cursor-grabbing',
        isOver && !isDragging && 'border-violet-400 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 ring-1 ring-violet-300 dark:ring-violet-700 cursor-move',
        !isCompleted && todo.status !== 'in_progress' && !isDragging && 'hover:cursor-move'
      )}
    >
      {/* Drag Handle */}
      {!isCompleted && todo.status !== 'in_progress' && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing hover:cursor-grab text-gray-400 hover:text-gray-600 transition-colors p-0 shrink-0 dark:text-gray-500 dark:hover:text-gray-400 mt-0.5 touch-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      
      {getStatusIcon(todo)}
      <div className="flex-1 min-w-0">
        {/* Agent ID Badge and Executing Badge - on top of title */}
        {(todo.agentId || (executingTodoId === todo.id || todo.status === 'in_progress')) && (
          <div className="mb-0.5 flex items-center gap-1.5 flex-wrap">
            {todo.agentId && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0 h-4',
                  'bg-violet-50 dark:bg-violet-950/30',
                  'border-violet-200 dark:border-violet-800',
                  'text-violet-700 dark:text-violet-300',
                  'hover:bg-violet-100 dark:hover:bg-violet-950/50'
                )}
              >
                {todo.agentId}
              </Badge>
            )}
            {(executingTodoId === todo.id || todo.status === 'in_progress') && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0 h-4',
                  'bg-blue-50 dark:bg-blue-950/30',
                  'border-blue-200 dark:border-blue-800',
                  'text-blue-700 dark:text-blue-300',
                  'hover:bg-blue-100 dark:hover:bg-blue-950/50'
                )}
              >
                <TextShimmerWave as="span" duration={1.5} className="text-[10px]">
                  Executing
                </TextShimmerWave>
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mb-0.5">
          <h4 className={cn(
            'text-xs font-medium leading-tight',
            isCompleted
              ? 'text-emerald-900 dark:text-emerald-100'
              : 'text-gray-900 dark:text-gray-100'
          )}>
            {todo.title}
          </h4>
          <div className="flex items-center gap-1">
            {todo.duration !== undefined && todo.duration !== null && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                <Timer className="w-2.5 h-2.5 mr-0.5" />
                {formatDuration(todo.duration)}
              </Badge>
            )}
            {/* Action Buttons - Show on hover */}
            {!isCompleted && todo.status !== 'in_progress' && (
              <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                <ButtonMinimal
                  icon={Edit2}
                  title="Edit todo"
                  color="blue"
                  size="sm"
                  onClick={() => onEdit(todo)}
                />
                <ButtonMinimal
                  icon={Trash2}
                  title="Delete todo"
                  color="red"
                  size="sm"
                  onClick={() => onDelete(todo)}
                />
              </div>
            )}
          </div>
        </div>
        {todo.description && (
          <p className={cn(
            'text-[11px] leading-tight line-clamp-2',
            isCompleted
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-gray-600 dark:text-gray-400'
          )}>
            {todo.description}
          </p>
        )}
        {/* Parameter Badges */}
        {(() => {
          // Find the agent for this todo to filter parameters based on renderComponents
          const todoAgent = todo.agentId ? aiAgents.find(a => a.id === todo.agentId) : null;
          const parameters = extractTodoParameters(todo, todoAgent);
          if (parameters.length === 0) return null;
          
          return (
            <div className="mt-1 flex flex-wrap gap-1">
              {parameters.map((param) => {
                const label = getParameterLabel(todo.agentId, param.key, aiAgents);
                const value = formatParameterValue(param.value);
                const displayText = truncateText(value, 20, '...');
                
                return (
                  <Badge
                    key={`${param.section}-${param.key}`}
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 h-4',
                      'bg-blue-50 dark:bg-blue-950/30',
                      'border-blue-200 dark:border-blue-800',
                      'text-blue-700 dark:text-blue-300'
                    )}
                    title={`${label}: ${value}`}
                  >
                    {label}: {displayText}
                  </Badge>
                );
              })}
            </div>
          );
        })()}
        {todo.dependencies && todo.dependencies.length > 0 && (
          <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-500">
            Depends on: {todo.dependencies.length} step{todo.dependencies.length !== 1 ? 's' : ''}
          </div>
        )}
        {isCompleted && todo.output && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 text-[10px] px-2"
            onClick={() => onShowResponse(todo)}
          >
            <Eye className="w-3 h-3 mr-0.5" />
            Show Response
          </Button>
        )}
      </div>
    </motion.div>
  );
};

TodoList.displayName = 'TodoList';
