'use client';

import { useState } from 'react';
import { BusinessRule } from '../types';
import { useBusinessRule } from '../hooks/useBusinessRule';
import { useLogicalOperators } from '../hooks/useLogicalOperators';
import { useProperties } from '../hooks/useProperties';
import { ConditionGroup } from './ConditionGroup';
import { RulePreview } from './RulePreview';
import { ValidationMessage } from './ValidationMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, TestTube, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/main-layout';

interface BusinessRuleWrapperProps {
  initialRule?: BusinessRule;
  onSave?: (rule: BusinessRule) => Promise<void> | void;
  onTest?: (rule: BusinessRule) => Promise<void> | void;
  title?: string;
}

export function BusinessRuleWrapper({
  initialRule,
  onSave,
  onTest,
  title = 'Business Rule Builder',
}: BusinessRuleWrapperProps) {
  const {
    rule,
    validationErrors,
    validate,
    updateRule,
    updateRootGroup,
    addCondition,
    updateCondition,
    deleteCondition,
    duplicateCondition,
    addGroup,
    updateGroup,
    deleteGroup,
    duplicateGroup,
    getPreview,
    resetRule,
  } = useBusinessRule(initialRule);

  const { operators, isLoading: operatorsLoading, error: operatorsError } = useLogicalOperators();
  const { properties, isLoading: propertiesLoading, error: propertiesError } = useProperties();

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(rule);
      } else {
        // Default save behavior - just log for now
        console.log('Saving rule:', rule);
        toast.success('Rule saved successfully');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!validate()) {
      toast.error('Please fix validation errors before testing');
      return;
    }

    setIsTesting(true);
    try {
      if (onTest) {
        await onTest(rule);
      } else {
        // Default test behavior
        console.log('Testing rule:', rule);
        toast.info('Rule test functionality not implemented');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to test rule');
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddCondition = (groupId: string) => {
    return addCondition(groupId);
  };

  const handleAddGroup = (parentGroupId: string) => {
    addGroup(parentGroupId, 'and');
  };

  const handleUpdateCondition = (conditionId: string, updates: any) => {
    updateCondition(conditionId, updates);
  };

  const handleDeleteCondition = (conditionId: string) => {
    deleteCondition(conditionId);
    toast.success('Condition deleted');
  };

  const handleDuplicateCondition = (conditionId: string) => {
    duplicateCondition(conditionId);
    toast.success('Condition duplicated');
  };

  const handleUpdateGroup = (groupId: string, updates: any) => {
    if (groupId === rule.rootGroup.id) {
      updateRootGroup(updates);
    } else {
      updateGroup(groupId, updates);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (groupId === rule.rootGroup.id) {
      toast.error('Cannot delete root group');
      return;
    }
    deleteGroup(groupId);
    toast.success('Group deleted');
  };

  const handleDuplicateGroup = (groupId: string) => {
    duplicateGroup(groupId);
    toast.success('Group duplicated');
  };

  if (operatorsLoading || propertiesLoading) {
    return (
      <MainLayout title={title}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (operatorsError || propertiesError) {
    return (
      <MainLayout title={title}>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="p-6">
            <p className="text-red-800 dark:text-red-200">
              Error: {operatorsError || propertiesError}
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={title}>
      <div className="space-y-6">
        {/* Rule Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={rule.name || ''}
                onChange={(e) => updateRule({ name: e.target.value })}
                placeholder="Enter rule name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={rule.description || ''}
                onChange={(e) => updateRule({ description: e.target.value })}
                placeholder="Enter rule description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-context">Context</Label>
              <Input
                id="rule-context"
                value={rule.context || ''}
                onChange={(e) => updateRule({ context: e.target.value })}
                placeholder="Enter rule context..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Validation */}
        {validationErrors.length > 0 && (
          <ValidationMessage errors={validationErrors} />
        )}

        {/* Condition Builder */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Conditions</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCondition}
                  disabled={operatorsLoading || propertiesLoading}
                >
                  Add Condition
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddGroup}
                  disabled={operatorsLoading || propertiesLoading}
                >
                  Add Group
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConditionGroup
              group={rule.rootGroup}
              properties={properties}
              operators={operators}
              onUpdateGroup={(updates) => updateRootGroup(updates)}
              onAddCondition={() => handleAddCondition(rule.rootGroup.id)}
              onUpdateCondition={handleUpdateCondition}
              onDeleteCondition={handleDeleteCondition}
              onDuplicateCondition={handleDuplicateCondition}
              onAddNestedGroup={() => handleAddGroup(rule.rootGroup.id)}
              onDeleteGroup={() => {
                if (rule.rootGroup.conditions.length === 0 && rule.rootGroup.groups.length === 0) {
                  resetRule();
                } else {
                  toast.error('Cannot delete root group with conditions');
                }
              }}
              onDuplicateGroup={() => handleDuplicateGroup(rule.rootGroup.id)}
              errors={validationErrors}
              level={0}
              isRoot={true}
            />
          </CardContent>
        </Card>

        {/* Rule Preview */}
        <RulePreview rootGroup={rule.rootGroup} />

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  resetRule();
                  toast.info('Rule reset');
                }}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || validationErrors.length > 0}
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                Test Rule
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || validationErrors.length > 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Rule'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

