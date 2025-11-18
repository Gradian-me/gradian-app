'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SyncButton } from '@/gradian-ui/form-builder/form-elements';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { MessageBoxContainer } from '@/gradian-ui/layout/message-box';
import { motion } from 'framer-motion';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

interface Integration {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lastSynced: string;
  targetRoute: string;
  targetMethod?: 'GET' | 'POST';
  sourceRoute?: string;
  sourceMethod?: 'GET' | 'POST';
  sourceDataPath?: string;
}

interface EmailTemplateSyncResponse {
  results: Array<{
    cacheKey: string;
    refreshed: boolean;
    templateId: string;
  }>;
  totalRefreshed: number;
}

function SyncIntegrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const integrationId = searchParams.get('id');

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResponse, setSyncResponse] = useState<EmailTemplateSyncResponse | string | null>(null);
  const [syncMessages, setSyncMessages] = useState<any>(null);

  useEffect(() => {
    if (!integrationId) {
      router.push('/integrations');
      return;
    }

    const fetchIntegration = async () => {
      try {
        // Try to fetch by ID first
        let found: Integration | null = null;
        try {
          const byIdResponse = await apiRequest<Integration | Integration[] | { data?: Integration }>(`/api/data/integrations/${integrationId}`, {
            method: 'GET',
          });
          if (byIdResponse.success && byIdResponse.data) {
            const data = byIdResponse.data;
            if (Array.isArray(data)) {
              found = data[0] || null;
            } else if (data && typeof data === 'object' && 'data' in data) {
              found = (data as { data?: Integration }).data || null;
            } else {
              found = data as Integration;
            }
          }
        } catch (error) {
          // If fetching by ID fails, try fetching all and filtering
          console.warn('Failed to fetch integration by ID, trying list:', error);
        }
        
        // If not found by ID, fetch all and filter
        if (!found) {
          const response = await apiRequest<Integration[] | { data?: Integration[]; items?: Integration[] }>('/api/data/integrations', {
            method: 'GET',
          });
          
          if (response.success && response.data) {
            const responseData = response.data;
            let data: Integration[] = [];
            if (Array.isArray(responseData)) {
              data = responseData;
            } else if (responseData && typeof responseData === 'object') {
              if ('data' in responseData && Array.isArray((responseData as any).data)) {
                data = (responseData as any).data;
              } else if ('items' in responseData && Array.isArray((responseData as any).items)) {
                data = (responseData as any).items;
              }
            }
            found = data.find(i => i.id === integrationId) || null;
          }
        }
        
        if (found) {
          setIntegration(found);
        } else {
          router.push('/integrations');
        }
      } catch (error) {
        console.error('Error fetching integration:', error);
        router.push('/integrations');
      } finally {
        setLoading(false);
      }
    };

    fetchIntegration();
  }, [integrationId, router]);

  const handleSync = async () => {
    if (!integration) return;

    setSyncing(true);
    setSyncResponse(null);
    setSyncMessages(null);

    try {
      const response = await apiRequest<EmailTemplateSyncResponse>('/api/integrations/sync', {
        method: 'POST',
        body: {
          id: integration.id,
        },
      });

      // Store messages if present (both success and error responses can have messages)
      if (response.messages || response.message) {
        setSyncMessages({
          messages: response.messages,
          message: response.message
        });
      }

      if (response.success) {
        setSyncResponse(response.data || 'Sync completed successfully');
        // Refresh integration to get updated lastSynced
        try {
          const refreshResponse = await apiRequest<Integration>(`/api/data/integrations/${integration.id}`, {
            method: 'GET',
          });
          if (refreshResponse.success && refreshResponse.data) {
            const responseData = refreshResponse.data;
            let updated: Integration | null = null;
            if (Array.isArray(responseData)) {
              updated = responseData[0] || null;
            } else if (responseData && typeof responseData === 'object') {
              if ('data' in responseData && (responseData as any).data) {
                updated = Array.isArray((responseData as any).data) ? (responseData as any).data[0] : (responseData as any).data;
              } else {
                updated = responseData as Integration;
              }
            }
            if (updated) {
              setIntegration(updated);
            }
          }
        } catch (error) {
          // If fetching by ID fails, try fetching all and filtering
          const refreshResponse = await apiRequest<Integration[] | { data?: Integration[]; items?: Integration[] }>('/api/data/integrations', {
            method: 'GET',
          });
          if (refreshResponse.success && refreshResponse.data) {
            const responseData = refreshResponse.data;
            let data: Integration[] = [];
            if (Array.isArray(responseData)) {
              data = responseData;
            } else if (responseData && typeof responseData === 'object') {
              if ('data' in responseData && Array.isArray((responseData as any).data)) {
                data = (responseData as any).data;
              } else if ('items' in responseData && Array.isArray((responseData as any).items)) {
                data = (responseData as any).items;
              }
            }
            const updated = data.find((i: Integration) => i.id === integration.id);
            if (updated) {
              setIntegration(updated);
            }
          }
        }
      } else {
        setSyncResponse(response.error || 'Sync failed');
        // If there are no messages, show the error message
        if (!response.messages && !response.message) {
          setSyncMessages({
            message: response.error || 'Sync failed'
          });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResponse(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Sync Integration">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!integration) {
    return (
      <MainLayout title="Sync Integration">
        <div className="text-center py-12">
          <p className="text-gray-500">Integration not found</p>
          <Button onClick={() => router.push('/integrations')} className="mt-4">
            Back to Integrations
          </Button>
        </div>
      </MainLayout>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <MainLayout title={`Sync: ${integration.title}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${integration.color}20`, color: integration.color }}
                >
                  <IconRenderer iconName={integration.icon} className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{integration.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Integration ID</p>
                  <p className="font-medium">{integration.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target Method</p>
                  <p className="font-medium">{integration.targetMethod || 'GET'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Synced</p>
                  <p className="font-medium">{formatDate(integration.lastSynced)}</p>
                </div>
              </div>
              {integration.sourceRoute && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Source Route</p>
                    <p className="font-medium text-sm break-all">{integration.sourceRoute}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Source Method</p>
                    <p className="font-medium">{integration.sourceMethod || 'GET'}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Synchronization</h3>
                    <p className="text-sm text-gray-500">Sync this integration with the external service</p>
                  </div>
                  <SyncButton
                    onClick={handleSync}
                    syncing={syncing}
                    label="Sync Now"
                    size="default"
                  />
                </div>

                {/* Messages Display */}
                {syncMessages && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <MessageBoxContainer
                      response={syncMessages}
                      variant={typeof syncResponse === 'string' ? 'error' : 'success'}
                      dismissible
                      onDismiss={() => setSyncMessages(null)}
                    />
                  </motion.div>
                )}

                {/* Sync Response Display (fallback if no messages) */}
                {syncResponse && !syncMessages && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${
                      typeof syncResponse === 'string' 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    }`}
                  >
                    {typeof syncResponse === 'string' ? (
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{syncResponse}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-900 dark:text-green-100">
                              Sync Successful
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              {syncResponse.totalRefreshed} template(s) refreshed successfully
                            </p>
                          </div>
                        </div>
                        {syncResponse.results && syncResponse.results.length > 0 && (
                          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                            {syncResponse.results.map((result, idx) => (
                              <div key={idx} className="flex items-center space-x-2 text-sm bg-white dark:bg-gray-800 p-2 rounded">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium">{result.cacheKey}</p>
                                  <p className="text-xs text-gray-500">Template ID: {result.templateId}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default function SyncIntegrationPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Sync Integration">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    }>
      <SyncIntegrationPageContent />
    </Suspense>
  );
}

