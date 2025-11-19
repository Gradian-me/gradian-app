// Hook to manage business rule state

import { useState, useCallback, useRef } from 'react';
import {
  BusinessRule,
  Condition,
  ConditionGroup,
  RuleValidationError,
} from '../types';
import {
  createEmptyCondition,
  createEmptyGroup,
  validateRule,
  findConditionById,
  findGroupById,
  removeCondition,
  removeGroup,
  cloneCondition,
  cloneGroup,
  generateRulePreview,
} from '../utils/rule-operations';

export function useBusinessRule(initialRule?: BusinessRule) {
  const [rule, setRule] = useState<BusinessRule>(
    initialRule || {
      rootGroup: createEmptyGroup('and'),
    }
  );
  const [validationErrors, setValidationErrors] = useState<RuleValidationError[]>([]);
  const lastAddTimeRef = useRef<{ [groupId: string]: number }>({});

  // Validate rule
  const validate = useCallback(() => {
    const errors = validateRule(rule);
    setValidationErrors(errors);
    return errors.length === 0;
  }, [rule]);

  // Update rule
  const updateRule = useCallback((updates: Partial<BusinessRule>) => {
    setRule((prev) => ({ ...prev, ...updates }));
  }, []);

  // Update root group
  const updateRootGroup = useCallback((updates: Partial<ConditionGroup>) => {
    setRule((prev) => ({
      ...prev,
      rootGroup: { ...prev.rootGroup, ...updates },
    }));
  }, []);

  // Add condition to group
  const addCondition = useCallback((groupId: string, condition?: Condition) => {
    // Prevent rapid duplicate additions to the same group (debounce)
    const now = Date.now();
    const lastAddTime = lastAddTimeRef.current[groupId] || 0;
    if (now - lastAddTime < 300) {
      // Too soon after last add, return null to prevent duplicate
      return null;
    }
    lastAddTimeRef.current[groupId] = now;

    let newConditionId: string | null = null;
    setRule((prev) => {
      const newRule = { ...prev };
      const group = findGroupById(newRule.rootGroup, groupId);
      if (group) {
        const newCondition = condition || createEmptyCondition();
        newConditionId = newCondition.id;
        // Prevent duplicate conditions with the same ID
        const existingIndex = group.conditions.findIndex(c => c.id === newCondition.id);
        if (existingIndex === -1) {
          group.conditions.push(newCondition);
        } else {
          // Condition already exists, return existing ID
          newConditionId = group.conditions[existingIndex].id;
        }
      }
      return newRule;
    });
    return newConditionId;
  }, []);

  // Update condition
  const updateCondition = useCallback(
    (conditionId: string, updates: Partial<Condition>) => {
      setRule((prev) => {
        const newRule = { ...prev };
        const result = findConditionById(newRule.rootGroup, conditionId);
        if (result) {
          Object.assign(result.condition, updates);
        }
        return newRule;
      });
    },
    []
  );

  // Remove condition
  const deleteCondition = useCallback((conditionId: string) => {
    setRule((prev) => {
      const newRule = { ...prev };
      removeCondition(newRule.rootGroup, conditionId);
      return newRule;
    });
  }, []);

  // Duplicate condition
  const duplicateCondition = useCallback((conditionId: string) => {
    setRule((prev) => {
      const newRule = { ...prev };
      const result = findConditionById(newRule.rootGroup, conditionId);
      if (result) {
        const cloned = cloneCondition(result.condition);
        result.group.conditions.push(cloned);
      }
      return newRule;
    });
  }, []);

  // Add nested group
  const addGroup = useCallback(
    (parentGroupId: string, logicalOperator: 'and' | 'or' = 'and') => {
      setRule((prev) => {
        const newRule = { ...prev };
        const parentGroup = findGroupById(newRule.rootGroup, parentGroupId);
        if (parentGroup) {
          parentGroup.groups.push(createEmptyGroup(logicalOperator));
        }
        return newRule;
      });
    },
    []
  );

  // Update group
  const updateGroup = useCallback(
    (groupId: string, updates: Partial<ConditionGroup>) => {
      setRule((prev) => {
        const newRule = { ...prev };
        const group = findGroupById(newRule.rootGroup, groupId);
        if (group) {
          Object.assign(group, updates);
        }
        return newRule;
      });
    },
    []
  );

  // Remove group
  const deleteGroup = useCallback((groupId: string) => {
    setRule((prev) => {
      const newRule = { ...prev };
      // If removing root group, reset it
      if (newRule.rootGroup.id === groupId) {
        newRule.rootGroup = createEmptyGroup('and');
      } else {
        removeGroup(newRule.rootGroup, groupId);
      }
      return newRule;
    });
  }, []);

  // Duplicate group
  const duplicateGroup = useCallback((groupId: string) => {
    setRule((prev) => {
      const newRule = { ...prev };
      const group = findGroupById(newRule.rootGroup, groupId);
      if (group) {
        const cloned = cloneGroup(group);
        // Find parent and add cloned group
        const findParent = (g: ConditionGroup): ConditionGroup | null => {
          if (g.groups.some((gr) => gr.id === groupId)) {
            return g;
          }
          for (const nestedGroup of g.groups) {
            const parent = findParent(nestedGroup);
            if (parent) return parent;
          }
          return null;
        };

        const parent = findParent(newRule.rootGroup);
        if (parent) {
          parent.groups.push(cloned);
        }
      }
      return newRule;
    });
  }, []);

  // Get rule preview
  const getPreview = useCallback(() => {
    return generateRulePreview(rule.rootGroup);
  }, [rule]);

  // Reset rule
  const resetRule = useCallback(() => {
    setRule({
      rootGroup: createEmptyGroup('and'),
    });
    setValidationErrors([]);
  }, []);

  return {
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
  };
}

