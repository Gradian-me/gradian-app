// Dynamic AI Agent Response Container Component
// Embeds the same logic and content as AiAgentDialog inline (prompt building + AiBuilderWrapper).
// Same config as quick actions runAiAgent — no separate dialog, everything in the card.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CardContent, CardHeader, CardTitle, CardWrapper } from '../card/components/CardWrapper';
import { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { replaceDynamicContextInObject } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { cn } from '../../shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Button } from '@/components/ui/button';
import { Sparkles, Maximize2 } from 'lucide-react';
import type { AiAgent } from '@/domains/ai-builder/types';
import { getDefaultLanguage, resolveDisplayLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { formatJsonForMarkdown } from '@/gradian-ui/shared/utils/text-utils';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { AiBuilderWrapper } from '@/domains/ai-builder/components/AiBuilderWrapper';
import { Modal } from '@/gradian-ui/data-display/components/Modal';

export interface DynamicAiAgentResponseContainerProps {
  action: QuickAction;
  schema: FormSchema;
  data: any;
  className?: string;
  disableAnimation?: boolean;
  index?: number;
}

export const DynamicAiAgentResponseContainer: React.FC<DynamicAiAgentResponseContainerProps> = ({
  action,
  schema,
  data,
  className,
  disableAnimation = false,
  index = 0,
}) => {
  const [agent, setAgent] = useState<AiAgent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
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
  const [showMaximizeModal, setShowMaximizeModal] = useState(false);
  /** Single persistent DOM node: portal always renders here; we only move this node between card and modal to preserve state (e.g. streaming). */
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();
  const actionLabel = resolveDisplayLabel(action.label, language, defaultLang);

  // Load agent on mount (same as quick actions / AiAgentDialog)
  useEffect(() => {
    if (!action.agentId) {
      setIsLoadingAgent(false);
      return;
    }
    setIsLoadingAgent(true);
    fetch(`/api/ai-agents/${action.agentId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setAgent(result.data);
        } else {
          console.error('Failed to load agent:', result.error);
        }
      })
      .catch((err) => {
        console.error('Error loading agent:', err);
      })
      .finally(() => {
        setIsLoadingAgent(false);
      });
  }, [action.agentId]);

  // Same as AiAgentDialog: process body and extra_body with dynamic context
  useEffect(() => {
    if (!data || !schema) {
      setProcessedBody(undefined);
      setProcessedExtraBody(undefined);
      return;
    }
    if (action.body) {
      const processed = replaceDynamicContextInObject(action.body, {
        formSchema: schema,
        formData: data,
      });
      setProcessedBody(processed);
    } else {
      setProcessedBody(undefined);
    }
    if (action.extra_body) {
      const processed = replaceDynamicContextInObject(action.extra_body, {
        formSchema: schema,
        formData: data,
      });
      setProcessedExtraBody(processed);
    } else {
      setProcessedExtraBody(undefined);
    }
  }, [data, schema, action.body, action.extra_body]);

  // Same as AiAgentDialog: build preload routes with dynamic context
  useEffect(() => {
    if (!data || !schema) return;
    const routes: typeof preloadRoutes = [];
    if (action.preloadRoutes && action.preloadRoutes.length > 0) {
      const processedRoutes = action.preloadRoutes.map((route) => {
        const processed = replaceDynamicContextInObject(route, {
          formSchema: schema,
          formData: data,
        });
        if (JSON.stringify(processed).includes('{{')) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `Some dynamic context variables may not have been replaced in preload route: ${JSON.stringify(processed)}`);
        }
        return processed;
      });
      routes.push(...processedRoutes);
    }
    setPreloadRoutes(routes);
  }, [data, schema, action.preloadRoutes]);

  // Same as AiAgentDialog: build user prompt from selected fields/sections
  useEffect(() => {
    if (!data || !schema) {
      setUserPrompt('');
      return;
    }
    const promptParts: string[] = [];
    promptParts.push(`Working on ${schema.singular_name || schema.name} data:`);

    if (action.selectedFields && action.selectedFields.length > 0) {
      const selectedData: Record<string, any> = {};
      action.selectedFields.forEach((fieldId) => {
        const field = schema.fields?.find((f) => f.id === fieldId);
        if (field?.name && data[field.name] !== undefined) {
          selectedData[field.name] = data[field.name];
        } else if (data[fieldId] !== undefined) {
          selectedData[fieldId] = data[fieldId];
        }
      });
      if (Object.keys(selectedData).length > 0) {
        const formattedJson = formatJsonForMarkdown(selectedData);
        promptParts.push(`\nSelected fields data:\n\`\`\`json\n${formattedJson}\n\`\`\``);
      }
    }

    if (action.selectedSections && action.selectedSections.length > 0) {
      action.selectedSections.forEach((sectionId) => {
        const section = schema.sections?.find((s) => s.id === sectionId);
        if (section) {
          const sectionFields = schema.fields?.filter((f) => f.sectionId === sectionId) || [];
          const sectionData: Record<string, any> = {};
          sectionFields.forEach((field) => {
            if (field.name && data[field.name] !== undefined) {
              sectionData[field.name] = data[field.name];
            }
          });
          if (Object.keys(sectionData).length > 0) {
            const formattedJson = formatJsonForMarkdown(sectionData);
            promptParts.push(`\n${section.title || sectionId} section data:\n\`\`\`json\n${formattedJson}\n\`\`\``);
          }
        }
      });
    }

    if (
      (!action.selectedFields || action.selectedFields.length === 0) &&
      (!action.selectedSections || action.selectedSections.length === 0)
    ) {
      const formattedJson = formatJsonForMarkdown(data);
      promptParts.push(`\nFull item data:\n\`\`\`json\n${formattedJson}\n\`\`\``);
    }

    if (action.additionalSystemPrompt) {
      promptParts.push(`\n\n${action.additionalSystemPrompt}`);
    }

    setUserPrompt(promptParts.join('\n'));
  }, [data, schema, action.selectedFields, action.selectedSections, action.additionalSystemPrompt]);

  // Create a single persistent portal host and append to card so the same React tree stays mounted when toggling maximize
  const initPortalHost = React.useCallback((cardSlot: HTMLDivElement | null) => {
    if (!cardSlot || contentHostRef.current) return;
    const host = document.createElement('div');
    host.className = 'min-h-0 flex flex-col overflow-y-auto';
    host.style.maxHeight = '100%';
    contentHostRef.current = host;
    cardSlot.appendChild(host);
    setPortalTarget(host);
  }, []);

  // When maximizing, move the portal host into the modal; state is preserved because we never unmount
  useEffect(() => {
    if (!contentHostRef.current) return;
    if (showMaximizeModal && modalContentRef.current) {
      modalContentRef.current.appendChild(contentHostRef.current);
    } else if (cardContentRef.current) {
      cardContentRef.current.appendChild(contentHostRef.current);
    }
  }, [showMaximizeModal]);

  const handleCloseMaximize = React.useCallback(() => {
    if (contentHostRef.current && cardContentRef.current) {
      cardContentRef.current.appendChild(contentHostRef.current);
    }
    setShowMaximizeModal(false);
  }, []);

  if (isLoadingAgent) {
    return (
      <motion.div
        initial={disableAnimation ? false : { opacity: 0, y: 20 }}
        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
        transition={disableAnimation ? {} : { duration: 0.3, delay: index * 0.1 }}
        className={cn(className, 'h-fit min-h-0 max-h-[65vh] flex flex-col')}
      >
        <CardWrapper
          config={{ id: action.id, name: actionLabel, styling: { variant: 'default', size: 'md' } }}
          className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm h-full min-h-0 max-h-[65vh] flex flex-col"
        >
          <CardHeader className="relative bg-linear-to-r from-violet-600 to-purple-600 rounded-t-xl py-3 px-4 shrink-0">
            <CardTitle className="text-sm font-semibold text-white">{actionLabel}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <Sparkles className="h-3 w-3" />
              <span>Powered by Gradian AI</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 min-h-0 flex items-center justify-center">
            <Button disabled size="default" variant="secondary" className="gap-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Loading agent...
            </Button>
          </CardContent>
        </CardWrapper>
      </motion.div>
    );
  }

  if (!agent) {
    return null;
  }

  const builderContent = (
    <AiBuilderWrapper
      initialAgentId={action.agentId || agent.id}
      initialUserPrompt={userPrompt}
      mode="dialog"
      additionalSystemPrompt={action.additionalSystemPrompt}
      customPreloadRoutes={preloadRoutes}
      showResetButton={false}
      displayType={action.displayType || 'hideForm'}
      runType={action.runType || 'manual'}
      agent={agent}
      initialBody={processedBody}
      initialExtraBody={processedExtraBody}
      previewOpen={isPreviewOpen}
      onPreviewOpenChange={setIsPreviewOpen}
      initialSelectedLanguage={
        action.language ?? (agent.agentType === 'image-generation' ? 'en' : 'fa')
      }
    />
  );

  const cardContentMaxHeight =
    action.maxHeight && action.maxHeight > 0 ? action.maxHeight : 480;

  return (
    <>
      <motion.div
        initial={disableAnimation ? false : { opacity: 0, y: 20 }}
        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
        transition={disableAnimation ? {} : { duration: 0.3, delay: index * 0.1 }}
        className={cn(className, 'h-fit min-h-0 flex flex-col')}
      >
        <CardWrapper
          config={{ id: action.id, name: actionLabel, styling: { variant: 'default', size: 'md' } }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm h-fit min-h-0 flex flex-col"
        >
          <CardHeader className="relative bg-linear-to-r from-violet-600 to-purple-600 rounded-t-xl py-3 px-4 shrink-0">
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  {action.icon && (
                    <IconRenderer iconName={action.icon} className="h-4 w-4 text-white" />
                  )}
                  <CardTitle className="text-sm font-semibold text-white">{actionLabel}</CardTitle>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/80">
                  <Sparkles className="h-3 w-3" />
                  <span>Powered by Gradian AI</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMaximizeModal(true)}
                className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white shrink-0"
                title="Maximize"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            <div
              ref={(el) => {
                cardContentRef.current = el;
                if (el) initPortalHost(el);
              }}
              className="min-h-0 flex flex-col overflow-y-auto"
              style={{ maxHeight: cardContentMaxHeight }}
            />
          </CardContent>
        </CardWrapper>
      </motion.div>

      <Modal
        isOpen={showMaximizeModal}
        onClose={handleCloseMaximize}
        title={
          <span className="flex items-center gap-2">
            {action.icon && (
              <IconRenderer iconName={action.icon} className="h-5 w-5" />
            )}
            <span className="text-lg font-semibold">{actionLabel}</span>
          </span>
        }
        size="xl"
        enableMaximize
        className="max-w-[95vw] max-h-[95vh] lg:max-h-[90vh] lg:max-w-[90vw]"
      >
        <div
          ref={(el) => {
            modalContentRef.current = el;
          }}
          className="min-h-0 flex-1 flex flex-col overflow-y-auto"
          style={{ maxHeight: '75vh' }}
        />
      </Modal>

      {portalTarget && createPortal(builderContent, portalTarget)}
    </>
  );
};

DynamicAiAgentResponseContainer.displayName = 'DynamicAiAgentResponseContainer';
