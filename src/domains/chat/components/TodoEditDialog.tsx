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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { FormElementFactory } from '@/gradian-ui/form-builder/form-elements';
import { useAiAgents } from '@/domains/ai-builder';
import type { Todo } from '../types';
import { Plus, Trash2, X } from 'lucide-react';
import { extractTodoParameters, createDependencyOutputValue, isDependencyOutputValue } from '../utils/todo-parameter-utils';
import { Switch } from '@/components/ui/switch';

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
  const [parameters, setParameters] = useState<Array<{ id: string; fieldName: string; value: any; section: 'body' | 'extra'; useDependencyOutput?: boolean }>>([]);
  const { agents: aiAgents, loading: isLoadingAgents } = useAiAgents({ summary: true });

  // Heuristic: fields that are typically the main prompt and can default to previous output
  const isMainPromptField = React.useCallback((fieldName: string) => {
    const name = fieldName?.toLowerCase?.() || '';
    return [
      'prompt',
      'userprompt',
      'processdescription',
      'processsteps',
      'processchallenges',
      'pointstoimprove',
      'presentationtopic',
      'incidentdescription',
      'codeinput',
    ].includes(name);
  }, []);

  // Get selected agent's renderComponents
  const selectedAgent = React.useMemo(() => {
    if (!agentId) return null;
    if (!aiAgents || aiAgents.length === 0) return null; // Wait for agents to load
    const agent = aiAgents.find(a => a.id === agentId);
    if (process.env.NODE_ENV === 'development' && agentId && !agent) {
      console.warn('[TodoEditDialog] Agent not found:', agentId, 'Available agents:', aiAgents.map(a => a.id));
    }
    return agent || null;
  }, [agentId, aiAgents]);

  // Get available renderComponents for parameter selection
  const availableRenderComponents = React.useMemo(() => {
    if (!selectedAgent || !selectedAgent.renderComponents) return [];
    // Ensure renderComponents is an array
    if (!Array.isArray(selectedAgent.renderComponents)) {
      console.warn('[TodoEditDialog] renderComponents is not an array:', selectedAgent.renderComponents);
      return [];
    }
    // Filter for form field components (not preload route references) with sectionId 'body' or 'extra'
    const components = selectedAgent.renderComponents.filter((comp: any) => {
      // Must be a form field component (has 'name' property, not a preload route reference with 'route' property)
      const isFormField = comp.name && !comp.route;
      // Must have sectionId 'body' or 'extra'
      const hasValidSectionId = comp.sectionId === 'body' || comp.sectionId === 'extra';
      return isFormField && hasValidSectionId;
    });
    // Debug: Log to help diagnose issues
    if (process.env.NODE_ENV === 'development' && selectedAgent) {
      console.log('[TodoEditDialog] Agent:', selectedAgent.id, 
        'RenderComponents:', selectedAgent.renderComponents?.length, 
        'Available:', components.length,
        'Components:', selectedAgent.renderComponents?.map((c: any) => ({ 
          name: c.name, 
          sectionId: c.sectionId, 
          hasRoute: !!c.route 
        })));
    }
    return components;
  }, [selectedAgent]);

  // Get available renderComponents that haven't been selected yet (for uniqueness)
  const getAvailableComponentsForSelection = React.useCallback((currentParamId: string) => {
    if (!availableRenderComponents || !Array.isArray(availableRenderComponents)) return [];
    const selectedFieldNames = parameters
      .filter(p => p.id !== currentParamId && p.fieldName)
      .map(p => p.fieldName);
    return availableRenderComponents.filter((comp: any) => {
      const fieldName = comp.name || comp.id;
      return !selectedFieldNames.includes(fieldName);
    });
  }, [availableRenderComponents, parameters]);

  // Update form when todo changes
  useEffect(() => {
    if (todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      const todoAgentId = todo.agentId || '';
      setAgentId(todoAgentId);
      
      // Extract existing parameters - filter based on selected agent's renderComponents
      const currentAgent = todoAgentId ? aiAgents.find(a => a.id === todoAgentId) : null;
      const existingParams = extractTodoParameters(todo, currentAgent);
      if (existingParams.length > 0) {
        setParameters(existingParams.map((param, idx) => ({
          id: `param-${idx}-${Date.now()}`,
          fieldName: param.key,
          value: param.value,
          section: param.section,
          useDependencyOutput: param.useDependencyOutput
            || isDependencyOutputValue(param.value)
            || (!param.value && isMainPromptField(param.key)),
        })));
      } else {
        // If no parameters exist but agent is selected, initialize empty array
        // This allows users to add parameters even if none exist
        setParameters([]);
      }
    } else {
      // Reset when todo is null
      setTitle('');
      setDescription('');
      setAgentId('');
      setParameters([]);
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

  const handleAddParameter = () => {
    setParameters([...parameters, {
      id: `param-${Date.now()}`,
      fieldName: '',
      value: '',
      section: 'body',
      useDependencyOutput: false,
    }]);
  };

  const handleRemoveParameter = (id: string) => {
    setParameters(parameters.filter(p => p.id !== id));
  };

  const handleParameterChange = (id: string, field: 'fieldName' | 'value' | 'section' | 'useDependencyOutput', newValue: any) => {
    setParameters((prev) => prev.map(p => {
      if (p.id !== id) return p;
      
      const updated = { ...p, [field]: newValue };
      
      // When enabling dependency output, clear manual value in the same update
      if (field === 'useDependencyOutput' && newValue === true) {
        updated.value = '';
      }

      // When fieldName changes, reset value and update section based on component
      if (field === 'fieldName' && newValue) {
        const comp = Array.isArray(availableRenderComponents) 
          ? availableRenderComponents.find((c: any) => (c.name || c.id) === newValue)
          : null;
        if (comp) {
          // For select components, use the first option's id as default if no defaultValue
          if (comp.component === 'select' && comp.options && comp.options.length > 0) {
            updated.value = comp.defaultValue || comp.options[0].id || '';
          } else {
            updated.value = comp.defaultValue || '';
          }
          updated.section = comp.sectionId === 'extra' ? 'extra' : 'body';
          updated.useDependencyOutput = false;
        } else {
          // If component not found, clear value
          updated.value = '';
        }
      }
      
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      // Title is required
      return;
    }
    
    // Build input object from parameters
    const input: any = { body: {}, extra_body: {} };
    parameters.forEach(param => {
      if (!param.fieldName) return;

      const valueToStore = param.useDependencyOutput ? createDependencyOutputValue() : param.value;
      const hasValue = param.useDependencyOutput || (valueToStore !== null && valueToStore !== undefined && valueToStore !== '');

      if (hasValue) {
        if (param.section === 'body') {
          input.body[param.fieldName] = valueToStore;
        } else {
          input.extra_body[param.fieldName] = valueToStore;
        }
      }
    });

    // Only include input if there are parameters
    const finalInput = (Object.keys(input.body).length > 0 || Object.keys(input.extra_body).length > 0) 
      ? input 
      : undefined;
    
    // If creating a new todo (todo is null), generate ID and createdAt
    if (!todo) {
      const { ulid } = await import('ulid');
      const newTodo: Todo = {
        id: ulid(),
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'pending',
        agentId: agentId || 'orchestrator',
        agentType: agentId ? aiAgents.find(a => a.id === agentId)?.agentType : undefined,
        dependencies: [], // Will be set by parent based on order
        input: finalInput,
        createdAt: new Date().toISOString(),
      };
      onSave(newTodo);
    } else {
      // Updating existing todo
      const updatedTodo: Todo = {
        ...todo,
        title: title.trim(),
        description: description.trim() || undefined,
        agentId: agentId || 'orchestrator',
        agentType: agentId ? aiAgents.find(a => a.id === agentId)?.agentType : todo.agentType,
        input: finalInput,
      };
      onSave(updatedTodo);
    }
    
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    if (todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      setAgentId(todo.agentId || '');
    } else {
      // Reset to empty for new todo
      setTitle('');
      setDescription('');
      setAgentId('');
      setParameters([]);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl max-w-[95vw] h-[90vh] max-h-[90vh] !flex !flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{todo ? 'Edit Todo' : 'Add Todo'}</DialogTitle>
          <DialogDescription>
            {todo ? 'Update the todo details and select an agent to handle it.' : 'Create a new todo and select an agent to handle it.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 py-4 px-1">
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
              onValueChange={(value: string) => {
                setAgentId(value);
                // Clear parameters when agent changes
                setParameters([]);
              }}
              options={agentOptions}
              placeholder="Select an agent"
              disabled={isLoadingAgents}
            />
          </div>
          
          {/* Parameters Section - Show if agent is selected and has renderComponents */}
          {selectedAgent && Array.isArray(availableRenderComponents) && availableRenderComponents.length > 0 ? (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agent Parameters
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddParameter}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Parameter
                </Button>
              </div>
              <div className="space-y-2">
                {parameters.map((param) => {
                  const selectedComponent = Array.isArray(availableRenderComponents) 
                    ? availableRenderComponents.find(
                        (comp: any) => (comp.name || comp.id) === param.fieldName
                      )
                    : null;
                  const availableComponents = getAvailableComponentsForSelection(param.id);
                  // Ensure availableComponents is always an array
                  const safeAvailableComponents = Array.isArray(availableComponents) ? availableComponents : [];
                  
                  return (
                    <div key={param.id} className="flex items-start gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex-1 space-y-2">
                        {/* Field Select */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Parameter Field
                          </label>
                          <Select
                            value={param.fieldName}
                            onValueChange={(value: string) => {
                              handleParameterChange(param.id, 'fieldName', value);
                            }}
                            options={[
                              { id: '', label: 'Select a field...', icon: 'Plus' },
                              ...safeAvailableComponents.map((comp: any) => ({
                                id: comp.name || comp.id,
                                label: comp.label || comp.name || comp.id,
                                icon: comp.icon,
                              })),
                              // Show current selection even if it's already selected (for editing)
                              ...(param.fieldName && !safeAvailableComponents.find((c: any) => (c.name || c.id) === param.fieldName) ? [{
                                id: param.fieldName,
                                label: selectedComponent?.label || param.fieldName,
                                icon: selectedComponent?.icon,
                              }] : []),
                            ]}
                            placeholder="Select field"
                          />
                        </div>
                        
                        {/* Dependency output toggle */}
                        {selectedComponent && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={Boolean(param.useDependencyOutput)}
                              onCheckedChange={(checked: boolean) => {
                                handleParameterChange(param.id, 'useDependencyOutput', checked);
                              }}
                              id={`dep-switch-${param.id}`}
                            />
                            <label htmlFor={`dep-switch-${param.id}`} className="text-xs text-gray-700 dark:text-gray-300">
                              Use previous todo output for this parameter
                            </label>
                          </div>
                        )}

                        {/* Value Input - using FormElementFactory (hidden when using dependency output) */}
                        {selectedComponent && param.fieldName && !param.useDependencyOutput && (
                          <div className="text-sm">
                            <FormElementFactory
                              config={selectedComponent}
                              value={param.value}
                              onChange={(value: any) => handleParameterChange(param.id, 'value', value)}
                              disabled={false}
                            />
                          </div>
                        )}

                        {/* Info when using dependency output */}
                        {selectedComponent && param.useDependencyOutput && (
                          <div className="text-xs text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-md px-2 py-1">
                            This parameter will be auto-filled from the previous todo’s output during execution.
                          </div>
                        )}
                        
                        {/* Section is automatically determined by renderComponent's sectionId - not editable */}
                        {selectedComponent && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Section: {param.section === 'extra' ? 'Extra' : 'Body'}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParameter(param.id)}
                        className="h-7 w-7 p-0 shrink-0 mt-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
                {parameters.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                    No parameters added. Click "Add Parameter" to add one.
                  </p>
                )}
              </div>
            </div>
          ) : selectedAgent && Array.isArray(availableRenderComponents) && availableRenderComponents.length === 0 ? (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                Selected agent "{selectedAgent.label}" has no configurable parameters (no renderComponents with sectionId 'body' or 'extra').
              </p>
            </div>
          ) : agentId && !selectedAgent ? (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                Agent not found. Please select a valid agent.
              </p>
            </div>
          ) : null}
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {todo ? 'Save Changes' : 'Add Todo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

TodoEditDialog.displayName = 'TodoEditDialog';

