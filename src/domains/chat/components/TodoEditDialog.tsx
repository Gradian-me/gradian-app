// Todo Edit Dialog Component
// Dialog for editing todo title, description, and agent

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { useAiAgents } from '@/domains/ai-builder';
import type { Todo } from '../types';

export interface TodoEditDialogProps {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (todo: Todo) => void;
}

export const TodoEditDialog: React.FC<TodoEditDialogProps> = ({
  todo,
  open,
  onOpenChange,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const { agents: aiAgents, loading: isLoadingAgents } = useAiAgents({ summary: true });

  // Update form when todo changes
  useEffect(() => {
    if (todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      setAgentId(todo.agentId || '');
    }
  }, [todo]);

  // Prepare agent options
  const agentOptions = React.useMemo(() => {
    const options = [
      {
        id: '',
        label: 'Auto (Orchestrator)',
        icon: 'Sparkles',
      },
      ...(Array.isArray(aiAgents) ? aiAgents.map((agent) => ({
        id: agent.id,
        label: agent.label,
        icon: agent.icon || 'Bot',
      })) : []),
    ];
    return options;
  }, [aiAgents]);

  const handleSave = () => {
    if (!todo) return;
    
    const updatedTodo: Todo = {
      ...todo,
      title: title.trim(),
      description: description.trim() || undefined,
      agentId: agentId || 'orchestrator',
    };
    
    onSave(updatedTodo);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    if (todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      setAgentId(todo.agentId || '');
    }
    onOpenChange(false);
  };

  if (!todo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit Todo</DialogTitle>
          <DialogDescription>
            Update the todo details and select an agent to handle it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter todo title"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter todo description (optional)"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Agent
            </label>
            <Select
              value={agentId}
              onValueChange={(value: string) => setAgentId(value)}
              options={agentOptions}
              placeholder="Select an agent"
              disabled={isLoadingAgents}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

TodoEditDialog.displayName = 'TodoEditDialog';

