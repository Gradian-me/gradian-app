'use client';

import { ConditionGroup as ConditionGroupType, Condition } from '../types';
import { LogicalOperatorSelector } from './LogicalOperatorSelector';
import { ConditionForm } from './ConditionForm';
import { SchemaFieldSelector } from './SchemaFieldSelector';
import { ConditionItem } from './ConditionItem';
import { createEmptyCondition } from '../utils/rule-operations';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { ButtonMinimal } from '@/gradian-ui/form-builder/form-elements/components/ButtonMinimal';

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
}: ConditionGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);

  // Handle adding condition - auto-enter edit mode
  const handleAddCondition = () => {
    const newConditionId = onAddCondition();
    if (newConditionId) {
      setEditingConditionId(newConditionId);
    }
  };

  const totalItems = group.conditions.length + group.groups.length;
  const indentClass = level > 0 ? `ml-${level * 4}` : '';

  const handleEditCondition = (conditionId: string) => {
    setEditingConditionId(conditionId);
  };

  const handleSaveCondition = () => {
    setEditingConditionId(null);
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
            {!isRoot && (onDeleteGroup || onDuplicateGroup) && (
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
            )}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddCondition();
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Condition
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

