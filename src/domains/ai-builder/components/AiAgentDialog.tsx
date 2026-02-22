/**
 * AI Agent Dialog Component
 * Dialog wrapper for running AI agents from quick actions with preloaded context
 */

'use client';

import { Button } from '@/components/ui/button';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { replaceDynamicContextInObject } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import type { FormSchema, QuickAction } from '@/gradian-ui/schema-manager/types/form-schema';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { formatJsonForMarkdown } from '@/gradian-ui/shared/utils/text-utils';
import { Eye } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import type { AiAgent } from '../types';
import { AiBuilderWrapper } from './AiBuilderWrapper';

export interface AiAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action: QuickAction;
  schema: FormSchema;
  data: any; // Current item data
  agent: AiAgent | null;
  /** Modal options: default maximized, close on outside click, etc. */
  defaultMaximized?: boolean;
  onMaximizeChange?: (value: boolean) => void;
  closeOnOutsideClick?: boolean;
  /** Optional actions in header (right side) or between header and content */
  headerActions?: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional badges in header */
  headerBadges?: Array<{ id: string; label: string; color?: string; icon?: string }>;
  /** Optional copy button in header */
  enableCopy?: boolean;
  copyContent?: string | number;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function AiAgentDialog({
  isOpen,
  onClose,
  action,
  schema,
  data,
  agent,
  defaultMaximized = false,
  onMaximizeChange,
  closeOnOutsideClick = false,
  headerActions,
  actions,
  headerBadges = [],
  enableCopy = false,
  copyContent,
  size = 'xl',
  className,
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
  const [processedBody, setProcessedBody] = useState<Record<string, any> | undefined>(undefined);
  const [processedExtraBody, setProcessedExtraBody] = useState<Record<string, any> | undefined>(undefined);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Process preset body and extra_body with dynamic context replacement
  useEffect(() => {
    if (!isOpen || !data || !schema) {
      setProcessedBody(undefined);
      setProcessedExtraBody(undefined);
      return;
    }

    // Process body if provided
    if (action.body) {
      const processed = replaceDynamicContextInObject(action.body, {
        formSchema: schema,
        formData: data,
      });
      setProcessedBody(processed);
    } else {
      setProcessedBody(undefined);
    }

    // Process extra_body if provided
    if (action.extra_body) {
      const processed = replaceDynamicContextInObject(action.extra_body, {
        formSchema: schema,
        formData: data,
      });
      setProcessedExtraBody(processed);
    } else {
      setProcessedExtraBody(undefined);
    }
  }, [isOpen, data, schema, action.body, action.extra_body]);

  // Build preload routes from action-defined routes only.
  // Skip the current-record API route: userPrompt already embeds the same data from selectedFields/selectedSections.
  // Adding it would duplicate record data in both user message and system prompt, wasting tokens.
  useEffect(() => {
    if (!isOpen || !data || !schema) return;

    const routes: typeof preloadRoutes = [];

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
          loggingCustom(LogType.CLIENT_LOG, 'warn', `Some dynamic context variables may not have been replaced in preload route: ${JSON.stringify(processed)}`);
        }
        
        return processed;
      });
      routes.push(...processedRoutes);
    }

    setPreloadRoutes(routes);
  }, [isOpen, data, schema, action.preloadRoutes]);

  // Build user prompt from selected fields/sections
  useEffect(() => {
    if (!isOpen || !data || !schema) {
      setUserPrompt('');
      return;
    }

    const promptParts: string[] = [];

    // Add context about what we're working on
    promptParts.push(`Working on ${schema.singular_name || schema.name} data:`);

    // Extract data based on selected fields
    if (action.selectedFields && action.selectedFields.length > 0) {
      const selectedData: Record<string, any> = {};
      action.selectedFields.forEach((fieldId) => {
        const field = schema.fields?.find(f => f.id === fieldId);
        if (field && field.name) {
          // Field found in schema, use its name to access data
          if (data[field.name] !== undefined) {
            selectedData[field.name] = data[field.name];
          }
        } else {
          // Field not found in schema (might be a computed field, dataPath, component renderer field, or data-only field)
          // Use the fieldId directly as the field name to access data
          if (data[fieldId] !== undefined) {
            selectedData[fieldId] = data[fieldId];
          }
        }
      });

      if (Object.keys(selectedData).length > 0) {
        // Format JSON with proper indentation
        const formattedJson = formatJsonForMarkdown(selectedData);
        promptParts.push(`\nSelected fields data:\n\`\`\`json\n${formattedJson}\n\`\`\``);
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
            // Format JSON with proper indentation
            const formattedJson = formatJsonForMarkdown(sectionData);
            promptParts.push(`\n${section.title || sectionId} section data:\n\`\`\`json\n${formattedJson}\n\`\`\``);
          }
        }
      });
    }

    // If no specific fields/sections selected, include all data
    if ((!action.selectedFields || action.selectedFields.length === 0) &&
        (!action.selectedSections || action.selectedSections.length === 0)) {
      // Format JSON with proper indentation
      const formattedJson = formatJsonForMarkdown(data);
      promptParts.push(`\nFull item data:\n\`\`\`json\n${formattedJson}\n\`\`\``);
    }

    // Concatenate additionalSystemPrompt if provided
    if (action.additionalSystemPrompt) {
      promptParts.push(`\n\n${action.additionalSystemPrompt}`);
    }

    setUserPrompt(promptParts.join('\n'));
  }, [isOpen, data, schema, action.selectedFields, action.selectedSections, action.additionalSystemPrompt]);

  // Open preview dialog (controlled state so footer button works reliably)
  const handlePreviewClick = useCallback(() => setIsPreviewOpen(true), []);

  if (!agent) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI Agent: ${agent.label}`}
      description={agent.description}
      size={size}
      showCloseButton={true}
      enableMaximize={true}
      defaultMaximized={defaultMaximized}
      onMaximizeChange={onMaximizeChange}
      closeOnOutsideClick={closeOnOutsideClick}
      headerActions={headerActions}
      actions={actions}
      headerBadges={headerBadges}
      enableCopy={enableCopy}
      copyContent={copyContent}
      className={className}
      footerLeftActions={
        DEMO_MODE ? (
          <Button
            variant="outline"
            size="default"
            onClick={handlePreviewClick}
            className="h-10"
          >
            <Eye className="h-4 w-4 me-2" />
            Preview
          </Button>
        ) : undefined
      }
    >
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
        initialBody={processedBody}
        initialExtraBody={processedExtraBody}
        previewOpen={isPreviewOpen}
        onPreviewOpenChange={setIsPreviewOpen}
        initialSelectedLanguage={
          action.language || 
          (agent.agentType === 'image-generation' ? 'en' : 'fa')
        } // Use language from action if provided, otherwise set to English for image-generation agents, default to Persian for others
      />
    </Modal>
  );
}

