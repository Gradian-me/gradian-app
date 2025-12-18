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

export interface DynamicQuickActionsProps {
  actions: QuickAction[];
  schema: FormSchema;
  data: any; // Current item data
  className?: string;
  disableAnimation?: boolean;
  schemaCache?: Record<string, FormSchema>;
}

export const DynamicQuickActions: React.FC<DynamicQuickActionsProps> = ({
  actions,
  schema,
  data,
  className,
  disableAnimation = false,
  schemaCache,
}) => {
  const router = useRouter();
  
  // Track loading state per action (not globally)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [targetSchemaId, setTargetSchemaId] = useState<string | null>(null);
  const [schemaCacheState, setSchemaCacheState] = useState<Record<string, FormSchema>>(() => schemaCache || {});
  const [aiAgentAction, setAiAgentAction] = useState<QuickAction | null>(null);
  const [agentForDialog, setAgentForDialog] = useState<any | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [formAction, setFormAction] = useState<QuickAction | null>(null);

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
    if (action.action === 'goToUrl' && action.targetUrl) {
      let url = action.targetUrl;
      if (action.passItemAsReference && data?.id) {
        url = `${action.targetUrl}${action.targetUrl.endsWith('/') ? '' : '/'}${data.id}`;
      }
      router.push(url);
      
    } else if (action.action === 'openUrl' && action.targetUrl) {
      let url = action.targetUrl;
      if (action.passItemAsReference && data?.id) {
        url = `${action.targetUrl}${action.targetUrl.endsWith('/') ? '' : '/'}${data.id}`;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      
    } else if ((action.action === 'openFormDialog' || action.action === 'openActionForm') && action.targetSchema) {
      setLoadingActionId(action.id);
      
      try {
        if (!schemaCacheState?.[action.targetSchema]) {
          const response = await apiRequest<FormSchema[]>(`/api/schemas?schemaIds=${action.targetSchema}`);
          const schemaResponse = response.data?.[0];
          if (!response.success || !Array.isArray(response.data) || !schemaResponse) {
            throw new Error(response.error || `Schema ${action.targetSchema} not found`);
          }

          setSchemaCacheState((prev) => ({
            ...prev,
            [schemaResponse.id]: schemaResponse,
          }));
        }

        setTargetSchemaId(action.targetSchema);
        setFormAction(action);
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to load schema for action ${action.id}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setTimeout(() => {
          setLoadingActionId(null);
        }, 100);
      }
    } else if (action.action === 'runAiAgent' && action.agentId) {
      // Fetch the specific agent and open dialog
      setLoadingActionId(action.id);
      setLoadingAgent(true);
      
      fetch(`/api/ai-agents/${action.agentId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setAgentForDialog(data.data);
            setAiAgentAction(action);
          } else {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to load agent: ${data.error}`);
          }
        })
        .catch(err => {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading agent: ${err instanceof Error ? err.message : String(err)}`);
        })
        .finally(() => {
          setLoadingAgent(false);
          setLoadingActionId(null);
        });
    } else if (action.action === 'callApi' && action.submitRoute) {
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
  }, [router, data, schemaCacheState]);

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
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {buttonActions.map((action) => {
              const isLoading = loadingActionId === action.id;
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
                  {isLoading ? 'Loading...' : action.label}
                </Button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Create Modal - using unified FormModal */}
      {targetSchemaId && (
        <FormModal
          schemaId={targetSchemaId}
          mode="create"
          title={formAction?.label}
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
    </>
  );
};

DynamicQuickActions.displayName = 'DynamicQuickActions';

