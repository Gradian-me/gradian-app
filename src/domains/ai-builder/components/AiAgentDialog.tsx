/**
 * AI Agent Dialog Component
 * Dialog wrapper for running AI agents from quick actions with preloaded context
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { AiBuilderWrapper } from './AiBuilderWrapper';
import type { QuickAction } from '@/gradian-ui/schema-manager/types/form-schema';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import type { AiAgent } from '../types';
import { replaceDynamicContextInObject } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';

export interface AiAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action: QuickAction;
  schema: FormSchema;
  data: any; // Current item data
  agent: AiAgent | null;
}

export function AiAgentDialog({
  isOpen,
  onClose,
  action,
  schema,
  data,
  agent,
}: AiAgentDialogProps) {
  const [preloadRoutes, setPreloadRoutes] = useState<Array<{
    route: string;
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>;
    outputFormat?: 'json' | 'string' | 'toon';
    includedFields?: string[];
  }>>([]);
  const [userPrompt, setUserPrompt] = useState<string>('');

  // Build preload routes from current item, selected sections, and action-defined routes
  useEffect(() => {
    if (!isOpen || !data || !schema) return;

    const routes: typeof preloadRoutes = [];

    // Collect all field names from selectedFields and selectedSections
    const allSelectedFieldNames = new Set<string>();

    // Add fields from selectedFields
    if (action.selectedFields && action.selectedFields.length > 0) {
      action.selectedFields.forEach((fieldId) => {
        const field = schema.fields?.find(f => f.id === fieldId);
        if (field && field.name) {
          // Field found in schema, use its name
          allSelectedFieldNames.add(field.name);
        } else {
          // Field not found in schema (might be a computed field, dataPath, or component renderer field)
          // Use the fieldId directly as the field name
          allSelectedFieldNames.add(fieldId);
        }
      });
    }

    // Add fields from selectedSections
    if (action.selectedSections && action.selectedSections.length > 0) {
      action.selectedSections.forEach((sectionId) => {
        const section = schema.sections?.find(s => s.id === sectionId);
        if (section) {
          const sectionFields = schema.fields?.filter(f => f.sectionId === sectionId) || [];
          sectionFields.forEach(field => {
            if (field.name) {
              allSelectedFieldNames.add(field.name);
            }
          });
        }
      });
    }

    // Single route: current item API endpoint with all selected fields
    if (data.id && allSelectedFieldNames.size > 0) {
      routes.push({
        route: `/api/data/${schema.id}/${data.id}`,
        title: `${schema.singular_name || schema.name} Data`,
        description: `Current ${schema.singular_name || schema.name} item data with selected fields and sections`,
        method: 'GET',
        jsonPath: 'data',
        outputFormat: 'json',
        includedFields: Array.from(allSelectedFieldNames), // Filter API response to only include selected fields
      });
    }

    // Add preload routes from action configuration (with dynamic context replacement)
    if (action.preloadRoutes && action.preloadRoutes.length > 0) {
      // Replace dynamic context variables in preload routes
      const processedRoutes = action.preloadRoutes.map(route => {
        const processed = replaceDynamicContextInObject(route, {
          formSchema: schema,
          formData: data,
        });
        
        // Log if dynamic replacement might have failed (for debugging)
        if (JSON.stringify(processed).includes('{{')) {
          console.warn('Some dynamic context variables may not have been replaced in preload route:', processed);
        }
        
        return processed;
      });
      routes.push(...processedRoutes);
    }

    setPreloadRoutes(routes);
  }, [isOpen, data, schema, action.selectedFields, action.selectedSections, action.preloadRoutes]);

  // Build user prompt from selected fields/sections
  useEffect(() => {
    if (!isOpen || !data || !schema) {
      setUserPrompt('');
      return;
    }

    const promptParts: string[] = [];

    // Add context about what we're working with
    promptParts.push(`Working with ${schema.singular_name || schema.name} data:`);

    // Extract data based on selected fields
    if (action.selectedFields && action.selectedFields.length > 0) {
      const selectedData: Record<string, any> = {};
      action.selectedFields.forEach((fieldId) => {
        const field = schema.fields?.find(f => f.id === fieldId);
        if (field && field.name && data[field.name] !== undefined) {
          selectedData[field.name] = data[field.name];
        }
      });

      if (Object.keys(selectedData).length > 0) {
        promptParts.push(`\nSelected fields data:\n\`\`\`json\n${JSON.stringify(selectedData, null, 2)}\n\`\`\``);
      }
    }

    // Extract data based on selected sections
    if (action.selectedSections && action.selectedSections.length > 0) {
      action.selectedSections.forEach((sectionId) => {
        const section = schema.sections?.find(s => s.id === sectionId);
        if (section) {
          const sectionFields = schema.fields?.filter(f => f.sectionId === sectionId) || [];
          const sectionData: Record<string, any> = {};

          sectionFields.forEach((field) => {
            if (field.name && data[field.name] !== undefined) {
              sectionData[field.name] = data[field.name];
            }
          });

          if (Object.keys(sectionData).length > 0) {
            promptParts.push(`\n${section.title || sectionId} section data:\n\`\`\`json\n${JSON.stringify(sectionData, null, 2)}\n\`\`\``);
          }
        }
      });
    }

    // If no specific fields/sections selected, include all data
    if ((!action.selectedFields || action.selectedFields.length === 0) &&
        (!action.selectedSections || action.selectedSections.length === 0)) {
      promptParts.push(`\nFull item data:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
    }

    setUserPrompt(promptParts.join('\n'));
  }, [isOpen, data, schema, action.selectedFields, action.selectedSections]);

  if (!agent) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI Agent: ${agent.label}`}
      description={agent.description}
      size="xl"
      showCloseButton={true}
    >
      <div className="max-h-[80vh] overflow-y-auto">
        <AiBuilderWrapper
          initialAgentId={action.agentId || agent.id}
          initialUserPrompt={userPrompt}
          mode="dialog"
          additionalSystemPrompt={action.additionalSystemPrompt}
          customPreloadRoutes={preloadRoutes}
          showResetButton={false}
          displayType={action.displayType || 'default'}
          runType={action.runType || 'manual'}
          agent={agent}
        />
      </div>
    </Modal>
  );
}

