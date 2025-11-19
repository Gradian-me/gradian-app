'use client';

import { useState } from 'react';
import { BusinessRule } from '../types';
import { useBusinessRule } from '../hooks/useBusinessRule';
import { useLogicalOperators } from '../hooks/useLogicalOperators';
import { useProperties } from '../hooks/useProperties';
import { ConditionGroup } from './ConditionGroup';
import { ValidationMessage } from './ValidationMessage';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, TestTube, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { validateRule } from '../utils/rule-operations';
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
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

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
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Validate the rule first - get errors directly from validation
      const errors = validateRule(rule);
      validate(); // Also update the validation errors state for the UI
      
      // Simulate a brief validation delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (errors.length > 0) {
        const errorCount = errors.length;
        setTestResult('error');
        toast.error(`Rule validation failed: ${errorCount} error${errorCount !== 1 ? 's' : ''} found`, {
          description: errors[0]?.message || 'Please check your rule configuration',
        });
        return;
      }

      // If custom test handler is provided, use it
      if (onTest) {
        await onTest(rule);
        setTestResult('success');
        toast.success('Rule test passed successfully');
      } else {
        // Default test behavior - rule is valid
        setTestResult('success');
        toast.success('Rule validation passed', {
          description: 'All conditions are properly configured',
        });
      }
    } catch (error) {
      setTestResult('error');
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
            <CardTitle>Conditions</CardTitle>
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
              rootGroupActions={{
                onReset: () => {
                  resetRule();
                  setTestResult(null);
                  toast.info('Rule reset');
                },
                onTest: handleTest,
                onSave: handleSave,
                isSaving,
                isTesting,
                testResult,
                hasValidationErrors: validationErrors.length > 0,
              }}
            />
          </CardContent>
        </Card>

        {/* Rule Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeViewer
              code={JSON.stringify(rule, null, 2)}
              programmingLanguage="json"
              title="Business Rule JSON"
              initialLineNumbers={30}
            />
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}

