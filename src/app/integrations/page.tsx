'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SyncButton } from '@/gradian-ui/form-builder/form-elements';
import { FormModal } from '@/gradian-ui/form-builder/components/FormModal';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { MessageBoxContainer } from '@/gradian-ui/layout/message-box';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Settings,
  Download,
  Upload,
  Activity,
  Plus,
  RefreshCw,
  HeartPulse
} from 'lucide-react';
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

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [syncResponse, setSyncResponse] = useState<Record<string, EmailTemplateSyncResponse | string | null>>({});
  const [syncMessages, setSyncMessages] = useState<Record<string, any>>({});
  const [syncResponseStatus, setSyncResponseStatus] = useState<Record<string, boolean | null>>({});
  const [formModalSchemaId, setFormModalSchemaId] = useState<string | undefined>(undefined);
  const [formModalEntityId, setFormModalEntityId] = useState<string | undefined>(undefined);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await apiRequest<Integration[] | { data?: Integration[]; items?: Integration[] }>('/api/data/integrations', {
          method: 'GET',
        });
        
        if (response.success && response.data) {
          // Handle both array response and wrapped response
          const data = Array.isArray(response.data) 
            ? response.data 
            : ((response.data as any)?.data || (response.data as any)?.items || []);
          setIntegrations(data);
        } else {
          console.error('Failed to fetch integrations:', response.error);
        }
      } catch (error) {
        console.error('Error fetching integrations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);


  const getStatusColor = (lastSynced: string) => {
    if (!lastSynced) return 'default';
    const lastSyncDate = new Date(lastSynced);
    const daysSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSync < 1) return 'success';
    if (daysSinceSync < 7) return 'warning';
    return 'destructive';
  };

  const getStatusIcon = (lastSynced: string) => {
    if (!lastSynced) return <Clock className="h-4 w-4" />;
    const lastSyncDate = new Date(lastSynced);
    const daysSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSync < 1) return <CheckCircle className="h-4 w-4" />;
    if (daysSinceSync < 7) return <AlertCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getStatusText = (lastSynced: string) => {
    if (!lastSynced) return 'Never';
    const lastSyncDate = new Date(lastSynced);
    const daysSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSync < 1) return 'Connected';
    if (daysSinceSync < 7) return 'Stale';
    return 'Disconnected';
  };

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

  const handleSync = async (integration: Integration) => {
    // Add to syncing set
    setSyncing(prev => new Set(prev).add(integration.id));
    setSyncResponse(prev => ({ ...prev, [integration.id]: null }));
    setSyncMessages(prev => ({ ...prev, [integration.id]: null }));
    setSyncResponseStatus(prev => ({ ...prev, [integration.id]: null }));

    try {
      const response = await apiRequest<EmailTemplateSyncResponse>('/api/integrations/sync', {
        method: 'POST',
        body: {
          id: integration.id,
        },
      });

      // Check if response has success: false
      if (response.success === false) {
        // Mark this response as failed
        setSyncResponseStatus(prev => ({ ...prev, [integration.id]: false }));
        // Build error message with summary if available
        let errorMessage = response.error || 'Sync failed';
        const summaryMessages: Array<{ path?: string; message: string }> = [];
        
        // Check for summary in response.summary or response.data?.summary
        const summary = (response as any).summary || ((response as any).data?.summary);
        
        if (summary) {
          const summaryParts: string[] = [];
          
          if (summary.nodesCreated !== undefined) summaryParts.push(`Nodes Created: ${summary.nodesCreated}`);
          if (summary.nodesFailed !== undefined) summaryParts.push(`Nodes Failed: ${summary.nodesFailed}`);
          if (summary.edgesCreated !== undefined) summaryParts.push(`Edges Created: ${summary.edgesCreated}`);
          if (summary.edgesFailed !== undefined) summaryParts.push(`Edges Failed: ${summary.edgesFailed}`);
          
          if (summaryParts.length > 0) {
            summaryMessages.push({
              path: 'Summary',
              message: summaryParts.join(', ')
            });
          }
          
          // Add errors from summary if available
          if (summary.errors && Array.isArray(summary.errors) && summary.errors.length > 0) {
            summary.errors.forEach((error: string, index: number) => {
              summaryMessages.push({
                path: `Error ${index + 1}`,
                message: error
              });
            });
          }
        }
        
        // Check if response.data exists and has error information
        if ((response as any).data) {
          const responseData = (response as any).data;
          // If data has nodes/edges but success is false, it's a partial failure
          if (responseData.nodes || responseData.edges) {
            if (!errorMessage || errorMessage === 'Sync failed') {
              errorMessage = 'Sync completed with errors';
            }
            // Add information about the data that was returned
            if (responseData.nodes && Array.isArray(responseData.nodes)) {
              summaryMessages.push({
                path: 'Data Returned',
                message: `${responseData.nodes.length} node(s) in response`
              });
            }
          }
        }
        
        // Combine response.messages with summaryMessages if both exist
        const allMessages = [
          ...(response.messages || []),
          ...summaryMessages
        ];
        
        // Always set error message to ensure error box is shown
        // If no error message is provided, use a default one
        if (!errorMessage || errorMessage === 'Sync failed') {
          errorMessage = 'Sync operation failed';
        }
        
        setSyncMessages(prev => ({ 
          ...prev, 
          [integration.id]: {
            messages: allMessages.length > 0 ? allMessages : undefined,
            message: errorMessage
          }
        }));
        
        // Also set syncResponse for backward compatibility (as string for error)
        setSyncResponse(prev => ({ ...prev, [integration.id]: errorMessage }));
        return;
      }

      // Store messages if present (both success and error responses can have messages)
      if (response.messages || response.message) {
        setSyncMessages(prev => ({ 
          ...prev, 
          [integration.id]: {
            messages: response.messages,
            message: response.message
          }
        }));
      }

      if (response.success) {
        // Mark this response as successful
        setSyncResponseStatus(prev => ({ ...prev, [integration.id]: true }));
        if (response.data) {
          setSyncResponse(prev => ({ ...prev, [integration.id]: response.data as EmailTemplateSyncResponse }));
        }
        // Refresh integrations to get updated lastSynced
        const refreshResponse = await apiRequest<Integration[] | { data?: Integration[]; items?: Integration[] }>('/api/data/integrations', {
          method: 'GET',
        });
        if (refreshResponse.success && refreshResponse.data) {
          // Handle both array response and wrapped response
          const data = Array.isArray(refreshResponse.data) 
            ? refreshResponse.data 
            : ((refreshResponse.data as any)?.data || (refreshResponse.data as any)?.items || []);
          setIntegrations(data);
        }
      } else {
        const errorMessage = response.error || 'Sync failed';
        setSyncResponse(prev => ({ ...prev, [integration.id]: errorMessage }));
        // If there are no messages, show the error message
        if (!response.messages && !response.message) {
          setSyncMessages(prev => ({ 
            ...prev, 
            [integration.id]: {
              message: errorMessage
            }
          }));
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncResponse(prev => ({ ...prev, [integration.id]: errorMessage }));
    } finally {
      // Remove from syncing set
      setSyncing(prev => {
        const next = new Set(prev);
        next.delete(integration.id);
        return next;
      });
    }
  };

  const handleSyncAll = async () => {
    // Sync all integrations in parallel
    const syncPromises = integrations.map(integration => handleSync(integration));
    await Promise.all(syncPromises);
  };

  // Skeleton component for integration cards
  const IntegrationCardSkeleton = () => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <Skeleton className="h-10 w-10 rounded shrink-0" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end space-y-2 w-full sm:w-auto shrink-0">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Skeleton component for stats cards
  const StatsCardSkeleton = () => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const connectedCount = integrations.filter(i => i.lastSynced && new Date(i.lastSynced).getTime() > Date.now() - 24 * 60 * 60 * 1000).length;
  const errorCount = integrations.filter(i => i.lastSynced && (Date.now() - new Date(i.lastSynced).getTime()) / (1000 * 60 * 60 * 24) > 7).length;

  return (
    <MainLayout title="Integrations">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage connections to external systems and icon libraries</p>
          </div>
          <div className="flex space-x-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleSyncAll}
              disabled={loading || integrations.length === 0 || syncing.size > 0}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing.size > 0 ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync All</span>
              <span className="sm:hidden">Sync All</span>
            </Button>
            <Button
              onClick={() => {
                setFormModalEntityId(undefined);
                setFormModalMode('create');
                setFormModalSchemaId('integrations');
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Integration</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </motion.div>

        {/* Integration Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-2xl font-bold text-green-500">
                          {connectedCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Connected</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-2xl font-bold text-red-500">
                          {errorCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Disconnected</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-2xl font-bold text-blue-500">
                          {integrations.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Total Integrations</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
                      <div className="min-w-0">
                    <div className="text-2xl font-bold text-yellow-500">
                      {syncing.size}
                    </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Syncing</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </div>

        {/* Integration List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="space-y-4"
        >
          {loading ? (
            <>
              <IntegrationCardSkeleton />
              <IntegrationCardSkeleton />
            </>
          ) : integrations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No integrations found.</p>
                <Button onClick={() => router.push('/integrations/configure')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            integrations.map((integration, index) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <div 
                          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${integration.color}20`, color: integration.color }}
                        >
                          <IconRenderer iconName={integration.icon} className="h-6 w-6" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold truncate min-w-0 flex-1">{integration.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                            {integration.id}
                          </Badge>
                          <Badge variant={getStatusColor(integration.lastSynced)} className="flex items-center space-x-1 shrink-0 whitespace-nowrap">
                            {getStatusIcon(integration.lastSynced)}
                            <span>{getStatusText(integration.lastSynced)}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-2">{integration.description}</p>
                      
                      <div className="text-xs sm:text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Last Sync: <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(integration.lastSynced)}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row items-end space-x-2 w-full sm:w-auto shrink-0">
                      <SyncButton
                        onClick={() => handleSync(integration)}
                        syncing={syncing.has(integration.id)}
                        label="Sync"
                        className="flex-1 sm:flex-none"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setFormModalEntityId(integration.id);
                          setFormModalMode('edit');
                          setFormModalSchemaId('integrations');
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Configure</span>
                        <span className="sm:hidden">Config</span>
                      </Button>
                    </div>
                  </div>

                  {/* Messages Display - Full Width */}
                  {syncMessages[integration.id] && (
                    <div className="mt-4 w-full">
                      <MessageBoxContainer
                        response={syncMessages[integration.id]}
                        variant={
                          syncResponseStatus[integration.id] === false || typeof syncResponse[integration.id] === 'string'
                            ? 'error' 
                            : 'success'
                        }
                        dismissible
                        onDismiss={() => {
                          setSyncMessages(prev => ({ ...prev, [integration.id]: null }));
                          setSyncResponse(prev => ({ ...prev, [integration.id]: null }));
                          setSyncResponseStatus(prev => ({ ...prev, [integration.id]: null }));
                        }}
                      />
                    </div>
                  )}

                  {/* Sync Response Display - Full Width */}
                  {syncResponse[integration.id] && !syncMessages[integration.id] && (
                    <div className="mt-4 w-full p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {typeof syncResponse[integration.id] === 'string' ? (
                            <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                              <strong>Error:</strong> {syncResponse[integration.id] as string}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                                ✓ Sync successful - {(syncResponse[integration.id] as EmailTemplateSyncResponse)?.totalRefreshed || 0} template(s) refreshed
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-48 overflow-y-auto">
                                {(syncResponse[integration.id] as EmailTemplateSyncResponse)?.results?.map((result: { cacheKey: string; refreshed: boolean; templateId: string }, idx: number) => (
                                  <div key={idx} className="flex items-start space-x-2">
                                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                                    <span className="wrap-break-word">
                                      <strong>{result.cacheKey}</strong> - Template ID: {result.templateId}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setSyncResponse(prev => ({ ...prev, [integration.id]: null }))}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                          aria-label="Dismiss"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            ))
          )}
        </motion.div>

        {/* Integration Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-gray-200">Integration Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                  <Download className="h-6 w-6" />
                  <span>Export Data</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                  <Upload className="h-6 w-6" />
                  <span>Import Data</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                  <Activity className="h-6 w-6" />
                  <span>View Logs</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => router.push('/builder/health')}
                >
                  <HeartPulse className="h-6 w-6" />
                  <span>Health Monitor</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>


        {/* Schema-based Form Modal */}
        <FormModal
          schemaId={formModalSchemaId}
          entityId={formModalEntityId}
          mode={formModalMode}
          onSuccess={async () => {
            // Refresh integrations after successful create/update
            const response = await apiRequest<Integration[] | { data?: Integration[]; items?: Integration[] }>('/api/data/integrations', {
              method: 'GET',
            });
            if (response.success && response.data) {
              // Handle both array response and wrapped response
              const data = Array.isArray(response.data) 
                ? response.data 
                : ((response.data as any)?.data || (response.data as any)?.items || []);
              setIntegrations(data);
            }
            // Reset form modal state
            setFormModalSchemaId(undefined);
            setFormModalEntityId(undefined);
          }}
          onClose={() => {
            // Reset form modal state when closed
            setFormModalSchemaId(undefined);
            setFormModalEntityId(undefined);
          }}
          size="xl"
        />
      </div>
    </MainLayout>
  );
}
