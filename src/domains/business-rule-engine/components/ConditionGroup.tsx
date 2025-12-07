'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConditionGroup as ConditionGroupType, Condition } from '../types';
import { LogicalOperatorSelector } from './LogicalOperatorSelector';
import { ConditionForm } from './ConditionForm';
import { SchemaFieldSelector } from './SchemaFieldSelector';
import { ConditionItem } from './ConditionItem';
import { createEmptyCondition, validateCondition } from '../utils/rule-operations';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Save, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonMinimal } from '@/gradian-ui/form-builder/form-elements/components/ButtonMinimal';
import { toast } from 'sonner';

interface RootGroupActions {
  onReset: () => void;
  onTest: () => void;
  onSave: () => void;
  isSaving: boolean;
  isTesting: boolean;
  testResult?: 'success' | 'error' | null;
  hasValidationErrors: boolean;
}

interface ConditionGroupProps {
  group: ConditionGroupType;
  properties: any[];
  operators: any[];
  onUpdateGroup: (updates: Partial<ConditionGroupType>) => void;
  onAddCondition: () => string | null; // Returns the new condition ID
  onUpdateCondition: (conditionId: string, updates: Partial<Condition>) => void;
  onDeleteCondition: (conditionId: string) => void;
  onDuplicateCondition: (conditionId: string) => void;
  onAddNestedGroup: () => void;
  onDeleteGroup?: () => void;
  onDuplicateGroup?: () => void;
  errors?: any[];
  level?: number;
  isRoot?: boolean;
  rootGroupActions?: RootGroupActions;
}

export function ConditionGroup({
  group,
  properties,
  operators,
  onUpdateGroup,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition,
  onDuplicateCondition,
  onAddNestedGroup,
  onDeleteGroup,
  onDuplicateGroup,
  errors = [],
  level = 0,
  isRoot = false,
  rootGroupActions,
}: ConditionGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = useRef(false);
  const lastAddedTimeRef = useRef<number>(0);
  const previousConditionCountRef = useRef<number>(group.conditions.length);

  // Clear editingConditionId if the condition no longer exists
  useEffect(() => {
    if (editingConditionId) {
      const conditionExists = group.conditions.some(c => c.id === editingConditionId);
      if (!conditionExists) {
        setEditingConditionId(null);
      }
    }
    // Update previous count
    previousConditionCountRef.current = group.conditions.length;
  }, [group.conditions, editingConditionId]);

  // Handle adding condition - auto-enter edit mode
  const handleAddCondition = useCallback((e?: React.MouseEvent) => {
    // Prevent event propagation and default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Synchronous check - must happen before any async operations
    if (isAddingRef.current) {
      return;
    }
    
    // Set ref immediately to prevent any duplicate calls
    isAddingRef.current = true;
    const now = Date.now();
    lastAddedTimeRef.current = now;
    
    // Update state for UI feedback
    setIsAdding(true);
    
    try {
      const newConditionId = onAddCondition();
      if (newConditionId) {
        setEditingConditionId(newConditionId);
      }
    } finally {
      // Reset after a delay to prevent rapid clicks
      setTimeout(() => {
        isAddingRef.current = false;
        setIsAdding(false);
      }, 1500);
    }
  }, [onAddCondition]);

  const totalItems = group.conditions.length + group.groups.length;
  const indentClass = level > 0 ? `ms-${level * 4}` : '';

  const handleEditCondition = (conditionId: string) => {
    setEditingConditionId(conditionId);
  };

  const handleSaveCondition = (conditionId: string) => {
    // Find the condition being saved
    const condition = group.conditions.find(c => c.id === conditionId);
    if (!condition) {
      return;
    }

    // Validate the condition
    const validationErrors = validateCondition(condition);
    
    // If there are validation errors, don't save (errors will be displayed in the form)
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(e => e.message).join(', ');
      toast.error('Please fix validation errors', {
        description: errorMessages,
      });
      return;
    }

    // Validation passed, exit edit mode
    setEditingConditionId(null);
    toast.success('Condition saved');
  };

  return (
    <div className={`space-y-4 ${indentClass}`}>
      <Card
        className={`border-gray-200 dark:border-gray-800 ${
          level > 0 ? 'bg-gray-50 dark:bg-gray-900' : ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {totalItems > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-6 w-6 p-0"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
              <CardTitle className="text-base">
                {isRoot ? 'Root Group' : `Group (${group.logicalOperator.toUpperCase()})`}
              </CardTitle>
            </div>
            {isRoot && rootGroupActions ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rootGroupActions.onReset}
                >
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rootGroupActions.onTest}
                  disabled={rootGroupActions.isTesting || rootGroupActions.hasValidationErrors}
                  className="gap-2"
                >
                  {rootGroupActions.isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : rootGroupActions.testResult === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {rootGroupActions.isTesting ? 'Validating...' : 'Validate'}
                </Button>
                <Button
                  size="sm"
                  onClick={rootGroupActions.onSave}
                  disabled={rootGroupActions.isSaving || rootGroupActions.hasValidationErrors}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {rootGroupActions.isSaving ? 'Saving...' : 'Save Rule'}
                </Button>
              </div>
            ) : !isRoot && (onDeleteGroup || onDuplicateGroup) ? (
              <div className="flex items-center gap-1">
                {onDuplicateGroup && (
                  <ButtonMinimal
                    icon={Copy}
                    title="Duplicate group"
                    color="gray"
                    size="sm"
                    onClick={onDuplicateGroup}
                  />
                )}
                {onDeleteGroup && (
                  <ButtonMinimal
                    icon={Trash2}
                    title="Delete group"
                    color="red"
                    size="sm"
                    onClick={onDeleteGroup}
                  />
                )}
              </div>
            ) : null}
          </div>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <LogicalOperatorSelector
                value={group.logicalOperator}
                onChange={(op) => onUpdateGroup({ logicalOperator: op })}
                conditionCount={totalItems}
                compact={true}
              />
              {totalItems > 0 && (
                <span className="text-xs text-gray-500">
                  ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </span>
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              {group.conditions.map((condition) => {
                const conditionErrors = errors.filter(
                  (e) => e.conditionId === condition.id
                );
                const isEditing = editingConditionId === condition.id;

                return isEditing ? (
                  <ConditionForm
                    key={condition.id}
                    condition={condition}
                    properties={properties}
                    operators={operators}
                    onChange={(updates) => onUpdateCondition(condition.id, updates)}
                    onDelete={() => {
                      onDeleteCondition(condition.id);
                      setEditingConditionId(null);
                    }}
                    onSave={() => handleSaveCondition(condition.id)}
                    errors={conditionErrors}
                    showDelete={false}
                    compact={true}
                  />
                ) : (
                  <div key={condition.id} className="relative">
                    <ConditionItem
                      condition={condition}
                      onEdit={() => handleEditCondition(condition.id)}
                      onDelete={() => onDeleteCondition(condition.id)}
                      onDuplicate={() => onDuplicateCondition(condition.id)}
                    />
                    {conditionErrors.length > 0 && (
                      <div className="mt-1 text-sm text-red-500">
                        {conditionErrors.map((e, i) => (
                          <div key={i}>{e.message}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nested Groups */}
            {group.groups.map((nestedGroup) => {
              const updatedNestedGroup = { ...nestedGroup };
              return (
                <ConditionGroup
                  key={nestedGroup.id}
                  group={updatedNestedGroup}
                  properties={properties}
                  operators={operators}
                  onUpdateGroup={(updates) => {
                    const updatedGroups = group.groups.map((g) =>
                      g.id === nestedGroup.id ? { ...g, ...updates } : g
                    );
                    onUpdateGroup({ groups: updatedGroups });
                  }}
                  onAddCondition={() => {
                    const newCondition = createEmptyCondition();
                    const updatedGroups = group.groups.map((g) =>
                      g.id === nestedGroup.id
                        ? { ...g, conditions: [...g.conditions, newCondition] }
                        : g
                    );
                    onUpdateGroup({ groups: updatedGroups });
                    return newCondition.id;
                  }}
                  onUpdateCondition={(conditionId, updates) => {
                    const updatedGroups = group.groups.map((g) =>
                      g.id === nestedGroup.id
                        ? {
                            ...g,
                            conditions: g.conditions.map((c) =>
                              c.id === conditionId ? { ...c, ...updates } : c
                            ),
                          }
                        : g
                    );
                    onUpdateGroup({ groups: updatedGroups });
                  }}
                  onDeleteCondition={(conditionId) => {
                    const updatedGroups = group.groups.map((g) =>
                      g.id === nestedGroup.id
                        ? {
                            ...g,
                            conditions: g.conditions.filter((c) => c.id !== conditionId),
                          }
                        : g
                    );
                    onUpdateGroup({ groups: updatedGroups });
                  }}
                  onDuplicateCondition={(conditionId) => {
                    const updatedGroups = group.groups.map((g) => {
                      if (g.id === nestedGroup.id) {
                        const condition = g.conditions.find((c) => c.id === conditionId);
                        if (condition) {
                          return {
                            ...g,
                            conditions: [
                              ...g.conditions,
                              {
                                ...condition,
                                id: `condition-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                              },
                            ],
                          };
                        }
                      }
                      return g;
                    });
                    onUpdateGroup({ groups: updatedGroups });
                  }}
                  onAddNestedGroup={() => {
                    const newGroup = {
                      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                      logicalOperator: 'and' as const,
                      conditions: [],
                      groups: [],
                    };
                    const updatedGroups = group.groups.map((g) =>
                      g.id === nestedGroup.id ? { ...g, groups: [...g.groups, newGroup] } : g
                    );
                    onUpdateGroup({ groups: updatedGroups });
                  }}
                  onDeleteGroup={() => {
                    const updatedGroups = group.groups.filter((g) => g.id !== nestedGroup.id);
                    onUpdateGroup({ groups: updatedGroups });
                  }}
                  onDuplicateGroup={() => {
                    const updatedGroups = [
                      ...group.groups,
                      {
                        ...nestedGroup,
                        id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                      },
                    ];
                    onUpdateGroup({ groups: updatedGroups });
                  }}
                  errors={errors}
                  level={level + 1}
                />
              );
            })}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
                disabled={isAdding}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {isAdding ? 'Adding...' : 'Add Condition'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNestedGroup();
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Group
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

