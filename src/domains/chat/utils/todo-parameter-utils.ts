/**
 * Utility functions for extracting and formatting todo parameters
 */

import type { Todo } from '../types';

export interface TodoParameter {
  key: string;
  value: any;
  label?: string;
  section: 'body' | 'extra';
  useDependencyOutput?: boolean;
}

const DEP_OUTPUT_MARKER_KEY = '__fromDependency';

/**
 * Check if a parameter value is marked to come from a dependency output
 */
export function isDependencyOutputValue(value: any): boolean {
  return Boolean(value && typeof value === 'object' && value[DEP_OUTPUT_MARKER_KEY] === true);
}

/**
 * Create a marker object that indicates the value should come from the previous dependency output
 */
export function createDependencyOutputValue() {
  return { [DEP_OUTPUT_MARKER_KEY]: true, source: 'previous-output' };
}

/**
 * Extract parameters from todo input
 * @param todo - The todo item
 * @param agent - Optional agent object to filter parameters based on renderComponents
 */
export function extractTodoParameters(todo: Todo, agent?: any): TodoParameter[] {
  const parameters: TodoParameter[] = [];
  
  if (!todo.input) {
    return parameters;
  }
  
  // Get valid parameter names from agent's renderComponents if provided
  const validParameterNames = new Set<string>();
  if (agent && agent.renderComponents) {
    agent.renderComponents.forEach((comp: any) => {
      // Only include form field components (not preload route references)
      if (comp.name && !comp.route && (comp.sectionId === 'body' || comp.sectionId === 'extra')) {
        validParameterNames.add(comp.name);
        // Also allow matching by id
        if (comp.id && comp.id !== comp.name) {
          validParameterNames.add(comp.id);
        }
      }
    });
  }
  
  // Extract body parameters
  if (todo.input.body && typeof todo.input.body === 'object') {
    Object.entries(todo.input.body).forEach(([key, value]) => {
      if (value !== null && value !== undefined && (value !== '' || isDependencyOutputValue(value))) {
        // If agent is provided, only include parameters that match renderComponents
        if (!agent || validParameterNames.size === 0 || validParameterNames.has(key)) {
          parameters.push({
            key,
            value,
            section: 'body',
            useDependencyOutput: isDependencyOutputValue(value),
          });
        }
      }
    });
  }
  
  // Extract extra_body parameters
  if (todo.input.extra_body && typeof todo.input.extra_body === 'object') {
    Object.entries(todo.input.extra_body).forEach(([key, value]) => {
      if (value !== null && value !== undefined && (value !== '' || isDependencyOutputValue(value))) {
        // If agent is provided, only include parameters that match renderComponents
        if (!agent || validParameterNames.size === 0 || validParameterNames.has(key)) {
          parameters.push({
            key,
            value,
            section: 'extra',
            useDependencyOutput: isDependencyOutputValue(value),
          });
        }
      }
    });
  }
  
  return parameters;
}

/**
 * Format parameter value for display
 */
export function formatParameterValue(value: any): string {
  if (isDependencyOutputValue(value)) {
    return 'From previous output';
  }

  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Get parameter label from agent renderComponents
 */
export function getParameterLabel(
  agentId: string,
  parameterKey: string,
  agents: any[]
): string {
  const agent = agents.find(a => a.id === agentId);
  if (!agent || !agent.renderComponents) {
    return parameterKey;
  }
  
  const component = agent.renderComponents.find(
    (comp: any) => comp.name === parameterKey || comp.id === parameterKey
  );
  
  return component?.label || parameterKey;
}

