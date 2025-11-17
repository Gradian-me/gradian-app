'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SyncButton } from '@/gradian-ui/form-builder/form-elements';
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Activity,
  Mail
} from 'lucide-react';
import { motion } from 'framer-motion';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import type { LucideIconLibraryItem } from '@/gradian-ui/shared/constants/lucide-icon-library';

interface ERPIntegration {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: Date;
  recordsSynced: number;
  errors: number;
  description: string;
  type?: 'erp' | 'email-template';
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
  const [integrations, setIntegrations] = useState<ERPIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [iconLibrary, setIconLibrary] = useState<LucideIconLibraryItem[]>([]);
  const [iconLoading, setIconLoading] = useState<boolean>(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [syncResponse, setSyncResponse] = useState<Record<string, EmailTemplateSyncResponse | string | null>>({});

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        // Mock data for now
        const mockIntegrations: ERPIntegration[] = [
          {
            id: '1',
            name: 'RAHKARAN ERP',
            status: 'syncing',
            lastSync: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
            recordsSynced: 1247,
            errors: 0,
            description: 'Main ERP system for financial and inventory management',
            type: 'erp',
          },
          {
            id: '2',
            name: 'SharePoint',
            status: 'connected',
            lastSync: new Date('2024-01-23T09:15:00'),
            recordsSynced: 892,
            errors: 2,
            description: 'Cloud-based ERP for procurement and vendor management',
            type: 'erp',
          },
          {
            id: '3',
            name: 'Microsoft Teams',
            status: 'connected',
            lastSync: new Date('2024-01-23T08:45:00'),
            recordsSynced: 156,
            errors: 0,
            description: 'Customer relationship and sales management system',
            type: 'erp',
          },
          {
            id: '4',
            name: 'Email Templates',
            status: 'connected',
            lastSync: new Date('2024-01-23T10:00:00'),
            recordsSynced: 0,
            errors: 0,
            description: 'Email template cache synchronization and management',
            type: 'email-template',
          }
        ];
        
        console.log('Setting integrations:', mockIntegrations.length);
        setIntegrations(mockIntegrations);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching integrations:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'disconnected': return 'destructive';
      case 'error': return 'destructive';
      case 'syncing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />;
      case 'disconnected': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const handleSync = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    setSyncing(integrationId);
    setSyncResponse(prev => ({ ...prev, [integrationId]: null }));

    try {
      if (integration.type === 'email-template') {
        // Call email template sync API
        const syncUrl = process.env.NEXT_PUBLIC_URL_SYNC_MAIL_TEMPLATE;
        if (!syncUrl) {
          throw new Error('Email template sync URL is not configured');
        }

        const response = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        const data: EmailTemplateSyncResponse = await response.json();
        setSyncResponse(prev => ({ ...prev, [integrationId]: data }));
        
        // Update integration status
        setIntegrations(prev => prev.map(integration => 
          integration.id === integrationId 
            ? { 
                ...integration, 
                status: 'connected', 
                lastSync: new Date(),
                recordsSynced: data.totalRefreshed || 0
              }
            : integration
        ));
      } else {
        // Simulate sync process for other integrations
        await new Promise(resolve => setTimeout(resolve, 3000));
        setIntegrations(prev => prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, status: 'connected', lastSync: new Date() }
            : integration
        ));
      }
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncResponse(prev => ({ ...prev, [integrationId]: errorMessage }));
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'error' }
          : integration
      ));
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
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button>
              <Database className="h-4 w-4 mr-2" />
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
                      {integrations.filter(i => i.status === 'connected').length}
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
                      {integrations.filter(i => i.status === 'error').length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
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
                      {integrations.reduce((sum, i) => sum + i.recordsSynced, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Records Synced</div>
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
                      {integrations.filter(i => i.status === 'syncing').length}
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
                <p className="text-gray-500 dark:text-gray-400">No integrations found.</p>
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {integration.type === 'email-template' ? (
                          <Mail className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Database className="h-6 w-6 text-blue-600" />
                        )}
                        <h3 className="text-lg font-semibold">{integration.name}</h3>
                        <Badge variant={getStatusColor(integration.status)} className="flex items-center space-x-1">
                          {getStatusIcon(integration.status)}
                          <span>{integration.status}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{integration.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Last Sync:</span>
                          <div className="font-medium">{formatDate(integration.lastSync)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            {integration.type === 'email-template' ? 'Templates Refreshed:' : 'Records Synced:'}
                          </span>
                          <div className="font-medium">{integration.recordsSynced.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Errors:</span>
                          <div className={`font-medium ${integration.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {integration.errors}
                          </div>
                        </div>
                      </div>

                      {/* Sync Response Display */}
                      {syncResponse[integration.id] && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          {typeof syncResponse[integration.id] === 'string' ? (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              <strong>Error:</strong> {syncResponse[integration.id]}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ✓ Sync successful - {syncResponse[integration.id]?.totalRefreshed || 0} template(s) refreshed
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-48 overflow-y-auto">
                                {syncResponse[integration.id]?.results?.map((result, idx) => (
                                  <div key={idx} className="flex items-center space-x-2">
                                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
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
                    
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <div className="flex space-x-2">
                        <SyncButton
                          onClick={() => handleSync(integration.id)}
                          syncing={syncing === integration.id}
                          label="Sync"
                        />
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      
                      {integration.status === 'error' && (
                        <div className="text-xs text-red-600 text-right">
                          Check configuration
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
      </div>
    </MainLayout>
  );
}


