'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import type { LucideIconLibraryItem } from '@/gradian-ui/shared/constants/lucide-icon-library';

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
  const [syncing, setSyncing] = useState<string | null>(null);
  const [iconLibrary, setIconLibrary] = useState<LucideIconLibraryItem[]>([]);
  const [iconLoading, setIconLoading] = useState<boolean>(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [syncResponse, setSyncResponse] = useState<Record<string, EmailTemplateSyncResponse | string | null>>({});
  const [syncMessages, setSyncMessages] = useState<Record<string, any>>({});
  const [formModalSchemaId, setFormModalSchemaId] = useState<string | undefined>(undefined);
  const [formModalEntityId, setFormModalEntityId] = useState<string | undefined>(undefined);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await apiRequest<Integration[]>('/api/data/integrations', {
          method: 'GET',
        });
        
        if (response.success && response.data) {
          // Handle both array response and wrapped response
          const data = Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.items || []);
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

    const fetchIcons = async () => {
      setIconLoading(true);
      setIconError(null);
      try {
        const response = await fetch('/api/integrations/lucide-icons');
        if (!response.ok) {
          throw new Error(`Failed to load icons (${response.status})`);
        }
        const payload = await response.json();
        const data = Array.isArray(payload) ? payload : payload?.data;
        if (Array.isArray(data)) {
          setIconLibrary(data as LucideIconLibraryItem[]);
        } else {
          throw new Error('Unexpected icon payload');
        }
      } catch (error) {
        console.error('Error fetching lucide icons:', error);
        setIconError(error instanceof Error ? error.message : 'Failed to load icons');
      } finally {
        setIconLoading(false);
      }
    };

    fetchIntegrations();
    fetchIcons();
  }, []);

  const displayedIcons = useMemo(() => iconLibrary.slice(0, 24), [iconLibrary]);

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
    setSyncing(integration.id);
    setSyncResponse(prev => ({ ...prev, [integration.id]: null }));
    setSyncMessages(prev => ({ ...prev, [integration.id]: null }));

    try {
      const response = await apiRequest<EmailTemplateSyncResponse>('/api/integrations/sync', {
        method: 'POST',
        body: {
          id: integration.id,
        },
      });

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
        if (response.data) {
          setSyncResponse(prev => ({ ...prev, [integration.id]: response.data as EmailTemplateSyncResponse }));
        }
        // Refresh integrations to get updated lastSynced
        const refreshResponse = await apiRequest<Integration[]>('/api/data/integrations', {
          method: 'GET',
        });
        if (refreshResponse.success && refreshResponse.data) {
          // Handle both array response and wrapped response
          const data = Array.isArray(refreshResponse.data) ? refreshResponse.data : (refreshResponse.data?.data || refreshResponse.data?.items || []);
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
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Integrations">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

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
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage connections to external systems and icon libraries</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                setFormModalEntityId(undefined);
                setFormModalMode('create');
                setFormModalSchemaId('integrations');
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </motion.div>

        {/* Integration Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {connectedCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Connected</div>
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
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold text-red-500">
                      {errorCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Disconnected</div>
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
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold text-blue-500">
                      {integrations.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Integrations</div>
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
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-500">
                      {syncing ? 1 : 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Syncing</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Integration List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="space-y-4"
        >
          {integrations.length === 0 ? (
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
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div 
                          className="h-10 w-10 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${integration.color}20`, color: integration.color }}
                        >
                          <IconRenderer iconName={integration.icon} className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold">{integration.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {integration.id}
                        </Badge>
                        <Badge variant={getStatusColor(integration.lastSynced)} className="flex items-center space-x-1">
                          {getStatusIcon(integration.lastSynced)}
                          <span>{getStatusText(integration.lastSynced)}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{integration.description}</p>
                      
                      <div className="text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Last Sync:</span>
                          <div className="font-medium">{formatDate(integration.lastSynced)}</div>
                        </div>
                      </div>

                      {/* Messages Display */}
                      {syncMessages[integration.id] && (
                        <div className="mt-4">
                          <MessageBoxContainer
                            response={syncMessages[integration.id]}
                            variant={typeof syncResponse[integration.id] === 'string' ? 'error' : 'success'}
                            dismissible
                            onDismiss={() => setSyncMessages(prev => ({ ...prev, [integration.id]: null }))}
                          />
                        </div>
                      )}

                      {/* Sync Response Display */}
                      {syncResponse[integration.id] && !syncMessages[integration.id] && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          {typeof syncResponse[integration.id] === 'string' ? (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              <strong>Error:</strong> {syncResponse[integration.id] as string}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ✓ Sync successful - {(syncResponse[integration.id] as EmailTemplateSyncResponse)?.totalRefreshed || 0} template(s) refreshed
                        </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-48 overflow-y-auto">
                                {(syncResponse[integration.id] as EmailTemplateSyncResponse)?.results?.map((result: { cacheKey: string; refreshed: boolean; templateId: string }, idx: number) => (
                                  <div key={idx} className="flex items-center space-x-2">
                                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                    <span>
                                      <strong>{result.cacheKey}</strong> - Template ID: {result.templateId}
                                    </span>
                        </div>
                                ))}
                          </div>
                        </div>
                          )}
                      </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 shrink-0">
                      <div className="flex flex-col space-y-2">
                        <SyncButton
                          onClick={() => handleSync(integration)}
                          syncing={syncing === integration.id}
                          label="Sync"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setFormModalEntityId(integration.id);
                            setFormModalMode('edit');
                            setFormModalSchemaId('integrations');
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      
                      {!integration.lastSynced && (
                        <div className="text-xs text-yellow-600 text-right">
                          Never synced
                        </div>
                      )}
                    </div>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lucide Icon Library */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1.1 }}
        >
          <Card>
            <CardHeader className="flex items-center justify-between flex-col md:flex-row gap-3">
              <div>
                <CardTitle className="text-gray-800 dark:text-gray-200">Lucide Icon Library</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {iconLibrary.length.toLocaleString()} icons available for form builders and pickers
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <SyncButton
                  onClick={async () => {
                    setIconLoading(true);
                    setIconError(null);
                    try {
                      const res = await fetch('/api/integrations/lucide-icons/sync', { method: 'POST' });
                      if (!res.ok) throw new Error('Failed to sync icons');
                      await fetch('/api/integrations/lucide-icons')
                        .then((response) => response.json())
                        .then((data) => {
                          if (Array.isArray(data)) {
                            setIconLibrary(data);
                          } else if (Array.isArray(data?.data)) {
                            setIconLibrary(data.data);
                          }
                        });
                    } catch (error) {
                      console.error(error);
                      setIconError(error instanceof Error ? error.message : 'Sync failed');
                    } finally {
                      setIconLoading(false);
                    }
                  }}
                  syncing={iconLoading}
                  label="Sync Now"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open('https://lucide.dev/icons', '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  Browse All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {iconError && (
                <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                  {iconError}
                </div>
              )}
              {iconLoading && iconLibrary.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                  Loading icons…
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {displayedIcons.map((icon) => (
                    <div
                      key={icon.id}
                      className="border rounded-lg p-3 flex flex-col items-center text-center hover:border-violet-400 hover:shadow-sm transition"
                    >
                      <div className="rounded-full bg-violet-50 text-violet-600 h-10 w-10 flex items-center justify-center mb-2">
                        <IconRenderer iconName={icon.icon} className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium truncate w-full">{icon.label}</div>
                      <div className="text-[10px] text-gray-500 mt-1">{icon.icon}</div>
                    </div>
                  ))}
                </div>
              )}
              {iconLibrary.length > displayedIcons.length && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Showing {displayedIcons.length} of {iconLibrary.length.toLocaleString()} icons
                </p>
              )}
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
            const response = await apiRequest<Integration[]>('/api/data/integrations', {
              method: 'GET',
            });
            if (response.success && response.data) {
              // Handle both array response and wrapped response
              const data = Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.items || []);
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
