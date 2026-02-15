'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { FormModal } from '@/gradian-ui/form-builder';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { replaceDynamicContext, replaceDynamicContextInObject } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { AiAgentDialog } from '@/domains/ai-builder/components/AiAgentDialog';
import { getEncryptedSkipKey } from '@/gradian-ui/shared/utils/skip-key-storage';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { DetailPageMetadataDialog } from '@/gradian-ui/schema-manager/components/DetailPageMetadataDialog';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguageStore } from '@/stores/language.store';
import { resolveDisplayLabel, getDefaultLanguage, getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface DynamicQuickActionsProps {
  actions: QuickAction[];
  schema: FormSchema;
  data: any; // Current item data
  className?: string;
  disableAnimation?: boolean;
  schemaCache?: Record<string, FormSchema>;
  // Custom action handler - if returns true, action is handled and default handler is skipped
  onActionClick?: (action: QuickAction) => boolean | void;
  /**
   * When true, renders the actions without the default Card container.
   * Useful when the parent already provides a bordered container (e.g. PopoverContent),
   * to avoid double borders.
   */
  hideContainerCard?: boolean;
  /** Optional language override for label translation (e.g. from parent that already resolved language) */
  language?: string;
}

export const DynamicQuickActions: React.FC<DynamicQuickActionsProps> = ({
  actions,
  schema,
  data,
  className,
  disableAnimation = false,
  schemaCache,
  onActionClick,
  hideContainerCard = false,
  language: languageProp,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storeLang = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const language = languageProp ?? storeLang ?? defaultLang;
  
  // Debug: Log when component receives onActionClick
  React.useEffect(() => {
    console.log('[DynamicQuickActions] Component mounted/updated, onActionClick:', !!onActionClick, typeof onActionClick);
  }, [onActionClick]);
  
  // Track loading state per action (not globally)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [targetSchemaId, setTargetSchemaId] = useState<string | null>(null);
  const [schemaCacheState, setSchemaCacheState] = useState<Record<string, FormSchema>>(() => schemaCache || {});
  const [aiAgentAction, setAiAgentAction] = useState<QuickAction | null>(null);
  const [agentForDialog, setAgentForDialog] = useState<any | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [formAction, setFormAction] = useState<QuickAction | null>(null);
  const [metadataEditorAction, setMetadataEditorAction] = useState<QuickAction | null>(null);
  const [showAgentErrorDialog, setShowAgentErrorDialog] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  
  // Get reference data from store (for action forms)
  const referenceData = useDynamicFormContextStore((s) => s.referenceData);

  useEffect(() => {
    if (!schemaCache) {
      return;
    }
    setSchemaCacheState((prev) => {
      const next = { ...prev };
      let hasChanges = false;
      Object.entries(schemaCache).forEach(([id, schema]) => {
        if (schema && !next[id]) {
          next[id] = schema;
          hasChanges = true;
        }
      });
      return hasChanges ? next : prev;
    });
  }, [schemaCache]);

  /**
   * Handle action click - simplified
   */
  const handleAction = useCallback(async (action: QuickAction) => {
    // Check if custom handler wants to handle this action FIRST, before any loading states
    console.log('[DynamicQuickActions] handleAction called, onActionClick:', !!onActionClick, 'action:', action.id);
    if (onActionClick) {
      console.log('[DynamicQuickActions] Checking custom handler for action:', action.id, action);
      try {
        const handled = onActionClick(action);
        console.log('[DynamicQuickActions] Handler returned:', handled);
        if (handled === true) {
          console.log('[DynamicQuickActions] Custom handler processed action, skipping default:', action.id);
          return; // Custom handler processed it, skip default handling
        }
      } catch (error) {
        console.error('[DynamicQuickActions] Error in custom handler:', error);
      }
    } else {
      console.log('[DynamicQuickActions] No custom handler provided, using default');
    }

    if (action.action === 'goToUrl' && action.targetUrl) {
      // Replace dynamic context variables in the URL
      let url = replaceDynamicContext(action.targetUrl, {
        formSchema: schema,
        formData: data,
        referenceData: data, // Use data as referenceData for consistency
      });
      
      // If passItemAsReference is set, append the ID (for backward compatibility)
      if (action.passItemAsReference && data?.id) {
        url = `${url}${url.endsWith('/') ? '' : '/'}${data.id}`;
      }
      router.push(url);
      
    } else if (action.action === 'openUrl' && action.targetUrl) {
      // Replace dynamic context variables in the URL
      let url = replaceDynamicContext(action.targetUrl, {
        formSchema: schema,
        formData: data,
        referenceData: data, // Use data as referenceData for consistency
      });
      
      // If passItemAsReference is set, append the ID (for backward compatibility)
      if (action.passItemAsReference && data?.id) {
        url = `${url}${url.endsWith('/') ? '' : '/'}${data.id}`;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      
    } else if ((action.action === 'openFormDialog' || action.action === 'openActionForm') && action.targetSchema) {
      setLoadingActionId(action.id);
      
      try {
        // Always fetch fresh schema from API to ensure we have the latest schema definition
        // This is especially important for nested modals where schemas might have been updated
        let targetSchema: FormSchema | null = null;
        
        // Fetch from API with cache disabled to get the latest schema
        const response = await apiRequest<FormSchema[]>(`/api/schemas?schemaIds=${action.targetSchema}`, {
          disableCache: true, // Always fetch fresh schema
        });
        const schemaResponse = response.data?.[0];
        if (!response.success || !Array.isArray(response.data) || !schemaResponse) {
          throw new Error(response.error || `Schema ${action.targetSchema} not found`);
        }

        targetSchema = schemaResponse;
        
        // Update both caches with fresh schema
        queryClient.setQueryData(['schemas', schemaResponse.id], schemaResponse);
        setSchemaCacheState((prev) => ({
          ...prev,
          [schemaResponse.id]: schemaResponse,
        }));

        setTargetSchemaId(action.targetSchema);
        setFormAction(action);
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to load schema for action ${action.id}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setTimeout(() => {
          setLoadingActionId(null);
        }, 100);
      }
    } else if (action.action === 'openMetadataEditor') {
      // Open the metadata editor dialog
      setLoadingActionId(action.id);
      setMetadataEditorAction(action);
      setTimeout(() => {
        setLoadingActionId(null);
      }, 100);
    } else if (action.action === 'runAiAgent' && action.agentId) {
      // Fetch the specific agent and open dialog
      setLoadingActionId(action.id);
      setLoadingAgent(true);
      
      fetch(`/api/ai-agents/${action.agentId}`)
        .then(async (res) => {
          const data = await res.json();
          
          // Check if response is successful and agent data exists
          if (res.ok && data.success && data.data) {
            setAgentForDialog(data.data);
            setAiAgentAction(action);
          } else {
            // Agent not found or not available
            const errorMessage = data.error || 'AI agent is not available';
            setAgentError(errorMessage);
            setShowAgentErrorDialog(true);
            loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to load agent: ${errorMessage}`);
          }
        })
        .catch(err => {
          // Network error or other fetch errors
          const errorMessage = err instanceof Error ? err.message : 'Failed to load AI agent';
          setAgentError('The AI agent is not available or you do not have access to it.');
          setShowAgentErrorDialog(true);
          loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading agent: ${errorMessage}`);
        })
        .finally(() => {
          setLoadingAgent(false);
          setLoadingActionId(null);
        });
    } else if (action.action === 'callApi' && action.submitRoute) {
      // Check if this is a special action that should be intercepted
      // This is a fallback check in case the custom handler didn't catch it
      if (action.submitRoute.includes('configure-layout') || action.id === 'configure-page-layout') {
        console.log('[DynamicQuickActions] Detected configure-layout action, checking custom handler again');
        if (onActionClick) {
          const handled = onActionClick(action);
          if (handled === true) {
            console.log('[DynamicQuickActions] Custom handler intercepted configure-layout action');
            return;
          }
        } else {
          // If no custom handler but this is a configure-layout action, dispatch an event
          // This is a fallback for when the handler isn't passed correctly
          console.warn('[DynamicQuickActions] configure-layout action detected but no custom handler provided. Dispatching event as fallback.');
          window.dispatchEvent(new CustomEvent('configure-page-layout'));
          return;
        }
      }
      
      setLoadingActionId(action.id);
      try {
        // Fetch latest reference data if possible
        let referenceData = data;
        if (schema?.id && data?.id) {
          try {
            const latest = await apiRequest(`/api/data/${schema.id}/${data.id}`, {
              method: 'GET',
              callerName: 'DynamicQuickActions.refreshReference',
            });
            if (latest.success && latest.data) {
              referenceData = latest.data;
            }
          } catch (err) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to fetch latest reference data, falling back to provided data: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        let endpoint = replaceDynamicContext(
          action.submitRoute,
          {
            formSchema: schema,
            formData: referenceData,
            referenceData,
          } as any
        );
        
        const method = action.submitMethod || 'POST';
        let body = action.payloadTemplate
          ? replaceDynamicContextInObject(action.payloadTemplate, {
              formSchema: schema,
              formData: referenceData,
              referenceData,
            } as any)
          : referenceData;
        
        // Add encrypted skip_key to body for POST requests, or query parameter for GET requests
        if (action.passSkipKey) {
          // For body, get as object; for query params, get URL-encoded string
          const isBodyMethod = method === 'POST' || method === 'PUT' || method === 'PATCH';
          const encryptedSkipKey = getEncryptedSkipKey(!isBodyMethod); // encodeForUrl = !isBodyMethod
          
          if (encryptedSkipKey) {
            if (isBodyMethod) {
              // Add to body for POST/PUT/PATCH requests (use object, not string)
              // getEncryptedSkipKey(false) returns an object {ciphertext, iv}
              // This will be properly JSON.stringify'd by apiRequest
              body = {
                ...(typeof body === 'object' && body !== null ? body : {}),
                skip_key: encryptedSkipKey,
              };
              loggingCustom(LogType.CLIENT_LOG, 'log', `[DynamicQuickActions] Added encrypted skip_key to request body: ${JSON.stringify({
                endpoint,
                method,
                hasSkipKey: !!body.skip_key,
                skipKeyType: typeof body.skip_key,
              })}`);
            } else {
              // Add to query parameter for GET/DELETE requests (use URL-encoded string)
              const url = new URL(endpoint, window.location.origin);
              url.searchParams.set('skip_key', encryptedSkipKey as string); // Type assertion: encodeForUrl=true returns string
              endpoint = url.pathname + url.search;
              loggingCustom(LogType.CLIENT_LOG, 'log', `[DynamicQuickActions] Added encrypted skip_key to query params: ${JSON.stringify({
                endpoint,
                method,
              })}`);
            }
          } else {
            loggingCustom(LogType.CLIENT_LOG, 'warn', '[DynamicQuickActions] passSkipKey is true but encrypted skip key is not available. Make sure NEXT_PUBLIC_SKIP_KEY is set and initializeSkipKeyStorage() has been called.');
          }
        }
        
        // Debug: Log final body before sending
        if (action.passSkipKey && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          loggingCustom(LogType.CLIENT_LOG, 'log', `[DynamicQuickActions] Final body before apiRequest: ${JSON.stringify({
            hasSkipKey: !!(body && typeof body === 'object' && 'skip_key' in body),
            bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
            bodyStringified: JSON.stringify(body),
          })}`);
        }
        
        await apiRequest(endpoint, {
          method,
          body,
          callerName: 'DynamicQuickActions.callApiAction',
        });
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to call API for action ${action.id}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingActionId(null);
      }
    }
  }, [router, data, schemaCacheState, queryClient]);

  if (!actions || actions.length === 0) {
    return null;
  }

  // Filter out actions with componentType === 'ai-agent-response' (these are rendered separately)
  const buttonActions = actions.filter(
    (action) => action.componentType !== 'ai-agent-response'
  );

  if (buttonActions.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={disableAnimation ? false : { opacity: 0, y: 10 }}
        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
        transition={disableAnimation ? {} : { duration: 0.3 }}
        className={cn('space-y-2', className)}
      >
        {hideContainerCard ? (
          <Card className="p-4 border-0 shadow-none bg-card">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-3">
              {getT(TRANSLATION_KEYS.SCHEMA_TITLE_QUICK_ACTIONS, language, defaultLang)}
            </h3>
            <div className="space-y-2">
              {buttonActions.map((action) => {
                const isLoading = loadingActionId === action.id;
                const label = resolveDisplayLabel(action.label, language, defaultLang);
                return (
                  <Button
                    key={action.id}
                    variant={action.variant || 'outline'}
                    onClick={() => handleAction(action)}
                    disabled={isLoading}
                    className="w-full justify-start"
                    size="sm"
                  >
                    {action.icon && (
                      <IconRenderer iconName={action.icon} className="h-4 w-4 me-2" />
                    )}
                    {isLoading ? 'Loading...' : label}
                  </Button>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-3">{getT(TRANSLATION_KEYS.SCHEMA_TITLE_QUICK_ACTIONS, language, defaultLang)}</h3>
            <div className="space-y-2">
              {buttonActions.map((action) => {
                const isLoading = loadingActionId === action.id;
                const label = resolveDisplayLabel(action.label, language, defaultLang);
                return (
                  <Button
                    key={action.id}
                    variant={action.variant || 'outline'}
                    onClick={() => handleAction(action)}
                    disabled={isLoading}
                    className="w-full justify-start"
                    size="sm"
                  >
                    {action.icon && (
                      <IconRenderer iconName={action.icon} className="h-4 w-4 me-2" />
                    )}
                    {isLoading ? 'Loading...' : label}
                  </Button>
                );
              })}
            </div>
          </Card>
        )}
      </motion.div>

      {/* Create Modal - using unified FormModal */}
      {targetSchemaId && (
        <FormModal
          schemaId={targetSchemaId}
          mode="create"
          title={
            formAction
              ? resolveDisplayLabel(formAction.label, language, defaultLang)
              : undefined
          }
          getInitialSchema={(requestedId) => schemaCacheState?.[requestedId] ?? null}
          customSubmitRoute={formAction?.submitRoute}
          customSubmitMethod={formAction?.submitMethod}
          referenceEntityData={data}
          passParentDataAs={formAction?.passParentDataAs}
          enrichData={(formData) => {
            // Enrich data with reference if needed
            return data?.id ? {
              ...formData,
              referenceId: data.id,
              referenceSchema: schema.id
            } : formData;
          }}
          onSuccess={() => {
            setTargetSchemaId(null);
            setFormAction(null);
          }}
          onClose={() => {
            setTargetSchemaId(null);
            setFormAction(null);
          }}
        />
      )}

      {/* AI Agent Dialog */}
      {aiAgentAction && aiAgentAction.agentId && agentForDialog && (
        <AiAgentDialog
          isOpen={!!aiAgentAction}
          onClose={() => {
            setAiAgentAction(null);
            setAgentForDialog(null);
          }}
          action={aiAgentAction}
          schema={schema}
          data={data}
          agent={agentForDialog}
        />
      )}

      {/* Metadata Editor Dialog */}
      {metadataEditorAction && (
        <DetailPageMetadataDialog
          isOpen={!!metadataEditorAction}
          onClose={() => {
            setMetadataEditorAction(null);
          }}
          schema={schema}
          metadata={
            // If this is the action form, use the reference data's metadata
            // Otherwise use the schema's metadata
            schema.id === 'page-metadata-editor-form' && referenceData?.detailPageMetadata
              ? (typeof referenceData.detailPageMetadata === 'string'
                  ? JSON.parse(referenceData.detailPageMetadata)
                  : referenceData.detailPageMetadata)
              : schema.detailPageMetadata
          }
          onUpdate={async (updatedMetadata) => {
            // Determine which page entity to update
            // If opened from action form, use referenceData; otherwise use data
            const pageEntity = (schema.id === 'page-metadata-editor-form' && referenceData) 
              ? referenceData 
              : (schema.id === 'pages' ? data : null);
            
            if (pageEntity?.id) {
              try {
                const response = await apiRequest(`/api/data/pages/${pageEntity.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    ...pageEntity,
                    detailPageMetadata: JSON.stringify(updatedMetadata),
                  }),
                });

                if (response.success) {
                  // Close the dialog
                  setMetadataEditorAction(null);
                  // Optionally refresh the page or trigger a reload
                  window.location.reload();
                } else {
                  loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to save page metadata: ${response.error}`);
                }
              } catch (err) {
                loggingCustom(LogType.CLIENT_LOG, 'error', `Error saving page metadata: ${err instanceof Error ? err.message : String(err)}`);
              }
            } else {
              // Just close if we can't save
              setMetadataEditorAction(null);
            }
          }}
        />
      )}

      {/* AI Agent Error Dialog */}
      <AlertDialog open={showAgentErrorDialog} onOpenChange={setShowAgentErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconRenderer iconName="AlertCircle" className="h-5 w-5 text-amber-500" />
              AI Agent Not Available
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              {agentError || 'The AI agent is not available or you do not have access to it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowAgentErrorDialog(false);
              setAgentError(null);
            }}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

DynamicQuickActions.displayName = 'DynamicQuickActions';

