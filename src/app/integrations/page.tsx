'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExpandCollapseControls } from '@/gradian-ui/data-display/components/HierarchyExpandCollapseControls';
import { FormModal } from '@/gradian-ui/form-builder/components/FormModal';
import { PopupPicker, SearchInput, Select } from '@/gradian-ui/form-builder/form-elements';
import { MessageBoxContainer } from '@/gradian-ui/layout/message-box';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { formatRelativeTime } from '@/gradian-ui/shared/utils/date-utils';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { extractDomainFromRoute } from '@/gradian-ui/shared/utils/url-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  HeartPulse,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings,
  Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Card-specific Tenant Selector Component (uses local state, not global store)
interface CardTenantSelectorProps {
  integrationId: string;
  selectedTenant: { id: string | number; name: string; domain?: string; [key: string]: any } | null;
  onTenantChange: (tenant: { id: string | number; name: string; domain?: string; [key: string]: any } | null) => void;
}

interface Tenant {
  id: string | number;
  name: string;
  title?: string;
  domain?: string;
  [key: string]: any;
}

interface IntegrationCompaniesPickerProps {
  integrationId: string;
  selectedCompanies: Array<{ id: string; label: string }>;
  onCompaniesChange: (companies: Array<{ id: string; label: string }>) => void;
}

const IntegrationCompaniesPicker: React.FC<IntegrationCompaniesPickerProps> = ({
  integrationId,
  selectedCompanies,
  onCompaniesChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleSelect = async (selections: Array<{ id: string; label: string }>) => {
    onCompaniesChange(selections);
  };

  const label =
    selectedCompanies.length === 0
      ? 'All companies'
      : selectedCompanies.length === 1
        ? selectedCompanies[0].label
        : `${selectedCompanies.length} companies selected`;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Companies (optional)
      </label>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className="truncate text-left">{label}</span>
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Change</span>
      </button>

      <PopupPicker
        isOpen={isOpen}
        onClose={handleClose}
        schemaId="companies"
        onSelect={async (selections, _raw) => {
          await handleSelect(
            selections.map((s) => ({
              id: String(s.id),
              // Ensure label is always a string to satisfy type requirements
              label: s.label ?? String(s.id),
            }))
          );
          handleClose();
        }}
        title="Select companies"
        description="Select one or more companies to scope this integration."
        allowMultiselect
        selectedIds={selectedCompanies.map((c) => c.id)}
        showAddButton={false}
      />
    </div>
  );
};

const CardTenantSelector: React.FC<CardTenantSelectorProps> = ({ integrationId, selectedTenant, onTenantChange }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiRequest<Tenant[] | { data?: Tenant[]; items?: Tenant[] }>(
          '/api/data/tenants',
          { method: 'GET', callerName: 'IntegrationsCardTenantSelector' }
        );

        if (response.success && response.data) {
          const data = Array.isArray(response.data)
            ? response.data
            : ((response.data as any)?.data || (response.data as any)?.items || []);
          setTenants(data);
        } else {
          setError(response.error || 'Failed to load tenants');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load tenants';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTenants();
  }, []);

  const options = useMemo(
    () =>
      tenants.map((tenant) => ({
        id: String(tenant.id),
        label: tenant.title || tenant.name || String(tenant.id),
      })),
    [tenants]
  );

  const currentValue = selectedTenant ? String(selectedTenant.id) : undefined;

  const handleChange = (value: string) => {
    const tenant = tenants.find((t) => String(t.id) === value) || null;
    if (tenant) {
      // Ensure domain is included in the tenant object
      const fullTenant = {
        ...tenant,
        domain: tenant.domain || '',
      };
      onTenantChange(fullTenant);
    } else {
      onTenantChange(null);
    }
  };

  return (
    <div>
      <Select
        options={options}
        value={currentValue}
        onValueChange={handleChange}
        placeholder="Select tenant"
        config={{ name: `tenant-${integrationId}`, label: 'Tenant' }}
        error={error || undefined}
      />
    </div>
  );
};

// Helper to get icon background and text color classes from Tailwind color name
const getIconColorClasses = (color?: string | null): { bg: string; text: string } => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-500/15',
      text: 'text-violet-700 dark:text-violet-100',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-100',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/15',
      text: 'text-indigo-700 dark:text-indigo-100',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-500/15',
      text: 'text-blue-700 dark:text-blue-100',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-500/15',
      text: 'text-green-700 dark:text-green-100',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-500/15',
      text: 'text-red-700 dark:text-red-100',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-500/15',
      text: 'text-orange-700 dark:text-orange-100',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/15',
      text: 'text-amber-700 dark:text-amber-100',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/15',
      text: 'text-yellow-700 dark:text-yellow-100',
    },
    pink: {
      bg: 'bg-pink-50 dark:bg-pink-500/15',
      text: 'text-pink-700 dark:text-pink-100',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-500/15',
      text: 'text-purple-700 dark:text-purple-100',
    },
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-500/15',
      text: 'text-teal-700 dark:text-teal-100',
    },
    cyan: {
      bg: 'bg-cyan-50 dark:bg-cyan-500/15',
      text: 'text-cyan-700 dark:text-cyan-100',
    },
  };
  
  if (!color || typeof color !== 'string') {
    return colorMap.violet;
  }
  
  return colorMap[color.toLowerCase()] || colorMap.violet;
};

interface Integration {
  id: string;
  title: string;
  description: string;
  icon: string;
  // Optional explicit ordering index from /api/data/integrations
  index?: number;
  color?: string;
  lastSynced: string;
  lastSyncMessage?: string;
  targetRoute: string;
  targetMethod?: 'GET' | 'POST';
  sourceRoute?: string;
  sourceMethod?: 'GET' | 'POST';
  sourceDataPath?: string;
  // Optional: whether integration supports scoping by related companies
  isCompanyScoped?: boolean;
  category?: string | { label?: string; value?: string; id?: string; icon?: string; color?: string } | Array<{ label?: string; value?: string; id?: string; icon?: string; color?: string }>;
  isTenantBased?: boolean;
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
  // Store selected tenant per integration card (keyed by integration ID)
  const [cardTenants, setCardTenants] = useState<Record<string, { id: string | number; name: string; domain?: string; [key: string]: any } | null>>({});
  const [cardCompanies, setCardCompanies] = useState<Record<string, Array<{ id: string; label: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [syncResponse, setSyncResponse] = useState<Record<string, EmailTemplateSyncResponse | string | null>>({});
  const [syncMessages, setSyncMessages] = useState<Record<string, any>>({});
  const [syncResponseStatus, setSyncResponseStatus] = useState<Record<string, boolean | null>>({});
  const [syncStatusCode, setSyncStatusCode] = useState<Record<string, number | undefined>>({});
  const [formModalSchemaId, setFormModalSchemaId] = useState<string | undefined>(undefined);
  const [formModalEntityId, setFormModalEntityId] = useState<string | undefined>(undefined);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);


  const fetchIntegrations = async () => {
    try {
      const response = await apiRequest<Integration[] | { data?: Integration[]; items?: Integration[] }>(
        '/api/data/integrations',
        {
          method: 'GET',
        }
      );

      if (response.success && response.data) {
        // Handle both array response and wrapped response
        const data = Array.isArray(response.data)
          ? response.data
          : ((response.data as any)?.data || (response.data as any)?.items || []);

        // Preserve original order from the first load by assigning a stable index per integration ID.
        // This prevents items from jumping position when the backend changes sort order (e.g., by updatedAt/lastSynced).
        setIntegrations((prev) => {
          // If no previous data, assign index based on initial array order
          if (!prev || prev.length === 0) {
            return data.map((item: Integration, idx: number) => ({
              ...item,
              index: idx,
            }));
          }

          // Reuse existing index when possible; assign new indices at the end for new items
          const existingIndexById = new Map<string, number>();
          prev.forEach((item: Integration & { index?: number }) => {
            if (typeof item.index === 'number') {
              existingIndexById.set(item.id, item.index);
            }
          });

          let nextIndex =
            prev.reduce(
              (max, item) => (typeof item.index === 'number' && item.index > max ? item.index : max),
              -1
            ) + 1;

          return data.map((item: Integration) => {
            const existingIndex = existingIndexById.get(item.id);
            if (typeof existingIndex === 'number') {
              return { ...item, index: existingIndex };
            }
            const assignedIndex = nextIndex++;
            return { ...item, index: assignedIndex };
          });
        });
      } else {
        const errorMessage = response.error || 'Failed to fetch integrations';
        loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to fetch integrations: ${errorMessage}`);
        
        // Show user-friendly error message for rate limiting
        if (response.statusCode === 429) {
          toast.error(errorMessage || 'Too many requests. Please wait a moment and try again.');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching integrations';
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching integrations: ${errorMessage}`);
      
      // Show user-friendly error message
      if (errorMessage.includes('Too many requests') || errorMessage.includes('429')) {
        toast.error('Too many requests. Please wait a moment and try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleClearCache = async () => {
    setIsClearingCache(true);

    const toastId = toast.loading('Clearing cache...');

    try {
      const response = await fetch('/api/schemas/clear-cache', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        const reactQueryKeys: string[] = Array.isArray(data.reactQueryKeys) && data.reactQueryKeys.length > 0
          ? data.reactQueryKeys
          : ['schemas', 'companies'];
        // Clear React Query caches client-side
        if (typeof window !== 'undefined' && data.clearReactQueryCache) {
          // Dispatch event to clear React Query caches
          window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
            detail: { queryKeys: reactQueryKeys } 
          }));
          
          // Also trigger storage event for other tabs
          window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(reactQueryKeys));
          window.localStorage.removeItem('react-query-cache-cleared');
        }
        
        toast.success('Cache cleared successfully!', { id: toastId });
      } else {
        toast.error(data.error || 'Failed to clear cache', { id: toastId });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to clear cache',
        { id: toastId }
      );
    } finally {
      setIsClearingCache(false);
    }
  };

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

  // Format lastSyncMessage for display in tooltip
  const formatSyncMessage = (message: string | undefined): string => {
    if (!message) return '';
    
    try {
      // Try to parse as JSON (could be array of messages or object)
      const parsed = JSON.parse(message);
      
      // If it's an array of message objects
      if (Array.isArray(parsed)) {
        return parsed.map((msg: any) => {
          if (typeof msg === 'string') return msg;
          if (msg.message) {
            // Handle nested message object
            if (typeof msg.message === 'object') {
              return msg.message.en || msg.message.message || JSON.stringify(msg.message);
            }
            return msg.message;
          }
          if (msg.en) return msg.en;
          if (msg.path && msg.message) return `${msg.path}: ${msg.message}`;
          return JSON.stringify(msg);
        }).join('\n');
      }
      
      // If it's an object with message field
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.message) return parsed.message;
        if (parsed.en) return parsed.en;
        return JSON.stringify(parsed);
      }
      
      return String(parsed);
    } catch {
      // If not JSON, return as-is
      return message;
    }
  };

  const handleSync = async (integration: Integration) => {
    const cardTenant = cardTenants[integration.id];
    const companiesForCard = cardCompanies[integration.id] || [];
    if (integration.isTenantBased && !cardTenant) {
      toast.error('Please select a tenant before syncing this integration.');
      return;
    }

    // Add to syncing set
    setSyncing(prev => new Set(prev).add(integration.id));
    setSyncResponse(prev => ({ ...prev, [integration.id]: null }));
    setSyncMessages(prev => ({ ...prev, [integration.id]: null }));
    setSyncResponseStatus(prev => ({ ...prev, [integration.id]: null }));
    setSyncStatusCode(prev => ({ ...prev, [integration.id]: undefined }));

    try {
      const response = await apiRequest<EmailTemplateSyncResponse>('/api/integrations/sync', {
        method: 'POST',
        body: {
          id: integration.id,
          tenantId: cardTenant ? cardTenant.id : undefined,
          tenantIds: cardTenant ? String(cardTenant.id) : undefined,
          companyIds: companiesForCard.length > 0 ? companiesForCard.map((c) => c.id).join(',') : undefined,
        },
      });

      // Store status code
      if (response.statusCode !== undefined) {
        setSyncStatusCode(prev => ({ ...prev, [integration.id]: response.statusCode }));
      }

      // Check if response has success: false
      if (response.success === false) {
        // Mark this response as failed
        setSyncResponseStatus(prev => ({ ...prev, [integration.id]: false }));
        
        // Check if it's a connection error (502 Bad Gateway or connection-related error message)
        const isConnectionErr = response.statusCode === 502 || 
          (response.error && (
            response.error.toLowerCase().includes('fetch failed') ||
            response.error.toLowerCase().includes('connection') ||
            response.error.toLowerCase().includes('timeout') ||
            response.error.toLowerCase().includes('failed to fetch')
          ));
        
        if (isConnectionErr) {
          // Extract domain from targetRoute or sourceRoute
          const domain = extractDomainFromRoute(integration.targetRoute) || extractDomainFromRoute(integration.sourceRoute);
          const serverName = domain || integration.title || integration.id;
          
          toast.error('Connection is out', {
            description: `Unable to connect to the server "${serverName}". Please check your connection and try again.`,
            duration: 5000,
          });
        }
        
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
            message: errorMessage,
            statusCode: response.statusCode
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
            message: response.message,
            statusCode: response.statusCode
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
              message: errorMessage,
              statusCode: response.statusCode
            }
          }));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      loggingCustom(LogType.CLIENT_LOG, 'error', `Sync error: ${errorMessage}`);
      
      // Check if it's a connection error
      const isConnectionErr = error instanceof Error && (
        error.message.toLowerCase().includes('fetch failed') ||
        error.message.toLowerCase().includes('connection') ||
        error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('failed to fetch') ||
        error.name === 'TypeError'
      );
      
      if (isConnectionErr) {
        // Extract domain from targetRoute or sourceRoute
        const domain = extractDomainFromRoute(integration.targetRoute) || extractDomainFromRoute(integration.sourceRoute);
        const serverName = domain || integration.title || integration.id;
        
        toast.error('Connection is out', {
          description: `Unable to connect to the server "${serverName}". Please check your connection and try again.`,
          duration: 5000,
        });
      }
      
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
    <Card className="bg-gray-100 dark:bg-gray-800 hover:shadow-lg transition-shadow duration-200">
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

  // Filter integrations based on search query
  const filteredIntegrations = useMemo(() => {
    if (!searchQuery.trim()) {
      return integrations;
    }
    
    const query = searchQuery.toLowerCase();
    return integrations.filter(integration => 
      integration.title?.toLowerCase().includes(query) ||
      integration.description?.toLowerCase().includes(query) ||
      integration.id?.toLowerCase().includes(query) ||
      (integration as any).name?.toLowerCase().includes(query)
    );
  }, [integrations, searchQuery]);

  // Group integrations by category
  const groupedIntegrations = useMemo(() => {
    const groups: Record<string, Integration[]> = {};
    
    filteredIntegrations.forEach(integration => {
      // Handle category as array, object (from picker), or string
      let categoryKey = 'other-integration';
      if (integration.category) {
        if (Array.isArray(integration.category)) {
          // Category is an array - get first item
          const firstItem = integration.category[0];
          if (firstItem) {
            categoryKey = firstItem.value || firstItem.id || 'other-integration';
          }
        } else if (typeof integration.category === 'object' && integration.category !== null) {
          // Category is a single object
          categoryKey = (integration.category as any).value || (integration.category as any).id || 'other-integration';
        } else {
          // Category is a string
          categoryKey = integration.category;
        }
      }
      
      if (!groups[categoryKey]) {
        groups[categoryKey] = [];
      }
      groups[categoryKey].push(integration);
    });
    
    // Ensure items in each group are ordered by their explicit index from /api/data/integrations (if provided)
    const orderedGroups: Record<string, Integration[]> = {};
    Object.keys(groups).forEach((key) => {
      const items = groups[key];
      // If no item has an index, keep original API order
      if (!items.some((item) => typeof item.index === 'number')) {
        orderedGroups[key] = items;
        return;
      }

      orderedGroups[key] = [...items].sort((a, b) => {
        const ai = typeof a.index === 'number' ? a.index : Number.MAX_SAFE_INTEGER;
        const bi = typeof b.index === 'number' ? b.index : Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
    });

    return orderedGroups;
  }, [filteredIntegrations]);

  // Get category display name
  const getCategoryDisplayName = (categoryKey: string, integration?: Integration): string => {
    // If we have an integration, try to get the label from its category
    if (integration?.category) {
      if (Array.isArray(integration.category)) {
        // Category is an array - get label from first item
        const firstItem = integration.category[0];
        if (firstItem?.label) {
          return firstItem.label;
        }
      } else if (typeof integration.category === 'object' && integration.category !== null) {
        // Category is a single object
        const categoryObj = integration.category as any;
        if (categoryObj.label) {
          return categoryObj.label;
        }
      }
    }
    
    // Fallback to mapping
    const categoryMap: Record<string, string> = {
      'development-integration': 'Development Integration',
      'production-integration': 'Production Integration',
      'infrastructure-integration': 'Infrastructure Integration',
      'other-integration': 'Other Integration',
    };
    return categoryMap[categoryKey] || categoryKey;
  };

  // Get category icon and color
  const getCategoryIconAndColor = (categoryKey: string, integration?: Integration): { icon?: string; color?: string } => {
    // If we have an integration, try to get icon and color from its category
    if (integration?.category) {
      if (Array.isArray(integration.category)) {
        // Category is an array - get icon and color from first item
        const firstItem = integration.category[0];
        if (firstItem) {
          return {
            icon: firstItem.icon,
            color: firstItem.color,
          };
        }
      } else if (typeof integration.category === 'object' && integration.category !== null) {
        // Category is a single object
        const categoryObj = integration.category as any;
        return {
          icon: categoryObj.icon,
          color: categoryObj.color,
        };
      }
    }
    
    // Fallback to mapping based on category key
    const categoryMap: Record<string, { icon: string; color: string }> = {
      'development-integration': { icon: 'Code', color: 'blue' },
      'production-integration': { icon: 'Rocket', color: 'emerald' },
      'infrastructure-integration': { icon: 'Server', color: 'purple' },
      'other-integration': { icon: 'MoreHorizontal', color: 'gray' },
    };
    return categoryMap[categoryKey] || {};
  };

  // Sort categories in a specific order
  const sortedCategories = useMemo(() => {
    const order = ['development-integration', 'production-integration', 'infrastructure-integration', 'other-integration'];
    const categories = Object.keys(groupedIntegrations);
    
    // Sort: first by predefined order, then alphabetically for any extras
    return categories.sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [groupedIntegrations]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLoading(true);
    await fetchIntegrations();
  };

  // Initialize expanded categories to all categories only once on initial load
  useEffect(() => {
    if (!hasInitializedExpanded && sortedCategories.length > 0) {
      setExpandedCategories([...sortedCategories]);
      setHasInitializedExpanded(true);
    }
  }, [sortedCategories, hasInitializedExpanded]);

  const handleExpandAll = useCallback(() => {
    if (sortedCategories.length > 0) {
      // Create a new array to ensure state update
      const allCategories = [...sortedCategories];
      loggingCustom(LogType.CLIENT_LOG, 'info', `[Integrations] Expanding all categories: ${JSON.stringify(allCategories)}`);
      setExpandedCategories(allCategories);
    }
  }, [sortedCategories]);

  const handleCollapseAll = useCallback(() => {
    // Create a new empty array to ensure state update
    loggingCustom(LogType.CLIENT_LOG, 'info', '[Integrations] Collapsing all categories');
    setExpandedCategories([]);
  }, []);

  const connectedCount = integrations.filter(i => i.lastSynced && new Date(i.lastSynced).getTime() > Date.now() - 24 * 60 * 60 * 1000).length;
  const errorCount = integrations.filter(i => i.lastSynced && (Date.now() - new Date(i.lastSynced).getTime()) / (1000 * 60 * 60 * 24) > 7).length;

  return (
    <MainLayout title="Integrations" icon="Plug">
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
              <RefreshCw className={`h-4 w-4 me-2 ${syncing.size > 0 ? 'animate-spin' : ''}`} />
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
              <Plus className="h-4 w-4 me-2" />
              <span className="hidden sm:inline">Add Integration</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </motion.div>

        {/* Integration Tools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-gray-200">Integration Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                  <Activity className="h-6 w-6" />
                  <span>View Logs</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window !== 'undefined') {
                      router.push('/builder/health');
                    }
                  }}
                >
                  <HeartPulse className="h-6 w-6" />
                  <span>Health Monitor</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                >
                  {isClearingCache ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : (
                    <Trash2 className="h-6 w-6" />
                  )}
                  <span>Clear Cache</span>
                </Button>
              </div>
            </CardContent>
          </Card>
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
                <Card className={syncing.size > 0 ? "relative overflow-visible" : ""}>
                  {syncing.size > 0 && (
                    <div className="absolute -inset-1 rounded-xl bg-yellow-300 opacity-20"></div>
                  )}
                  <CardContent className="p-4 relative">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Clock className={`h-5 w-5 text-yellow-500 shrink-0 ${syncing.size > 0 ? 'animate-pulse' : ''}`} />
                        {syncing.size > 0 && (
                          <span className="absolute top-0 right-0 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                          </span>
                        )}
                      </div>
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


        {/* Search and Refresh */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
        >
          <div className="flex-1">
            <SearchInput
              config={{ name: 'search-integrations', placeholder: 'Search integrations by name, description, or ID...' } as any}
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />
          </div>
          <div className="flex items-center gap-2">
            <ExpandCollapseControls
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              variant="outline"
              size="icon"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="h-10 w-10"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* Integration List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <IntegrationCardSkeleton />
              <IntegrationCardSkeleton />
            </div>
          ) : filteredIntegrations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? `No integrations found matching "${searchQuery}".` : 'No integrations found.'}
                </p>
                <Button onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof window !== 'undefined') {
                    router.push('/integrations/configure');
                  }
                }}>
                  <Plus className="h-4 w-4 me-2" />
                  Add Your First Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion 
              type="multiple" 
              value={expandedCategories}
              onValueChange={(value) => {
                loggingCustom(LogType.CLIENT_LOG, 'info', `[Integrations] Accordion value changed: ${JSON.stringify(value)}`);
                setExpandedCategories(value);
              }}
              className="space-y-4"
            >
              {sortedCategories.map((category) => {
                const categoryIntegrations = groupedIntegrations[category];
                // Get display name from first integration in the group (they should all have the same category)
                const displayName = categoryIntegrations.length > 0 
                  ? getCategoryDisplayName(category, categoryIntegrations[0])
                  : getCategoryDisplayName(category);
                // Get icon and color from first integration in the group
                const { icon: categoryIcon, color: categoryColor } = categoryIntegrations.length > 0
                  ? getCategoryIconAndColor(category, categoryIntegrations[0])
                  : getCategoryIconAndColor(category);
                
                // Get icon color classes
                const iconColors = categoryColor ? getIconColorClasses(categoryColor) : getIconColorClasses('violet');
                
                return (
                  <AccordionItem key={category} value={category} className="border border-gray-200 dark:border-gray-800 rounded-xl px-4 bg-white dark:bg-gray-900/50">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3">
                        {categoryIcon && (
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconColors.bg}`}>
                            <IconRenderer iconName={categoryIcon} className={`h-4 w-4 ${iconColors.text}`} />
                          </div>
                        )}
                        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {displayName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {categoryIntegrations.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        {categoryIntegrations.map((integration, index) => (
                          <motion.div
                            key={integration.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                          >
              <Card className={`hover:shadow-lg transition-shadow duration-200 ${syncing.has(integration.id) ? 'relative overflow-visible' : ''}`}>
                {syncing.has(integration.id) && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
                    </span>
                  </div>
                )}
                <CardContent className="p-4 h-full">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        {(() => {
                          const iconColors = getIconColorClasses(integration.color);
                          return (
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 relative ${iconColors.bg}`}>
                              <IconRenderer iconName={integration.icon} className={`h-6 w-6 ${iconColors.text}`} />
                              {syncing.has(integration.id) && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <h3 className="text-base sm:text-lg font-semibold truncate min-w-0 flex-1">
                          {renderHighlightedText(integration.title || '', searchQuery)}
                        </h3>
                      </div>
                      
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-2">
                        {renderHighlightedText(integration.description || '', searchQuery)}
                      </p>
                      
                      {/* Tenant Selector for tenant-based integrations */}
                      {integration.isTenantBased && (
                        <div className="mb-3 space-y-3">
                          <CardTenantSelector
                            integrationId={integration.id}
                            selectedTenant={cardTenants[integration.id]}
                            onTenantChange={(tenant) => {
                              setCardTenants(prev => ({
                                ...prev,
                                [integration.id]: tenant,
                              }));
                            }}
                          />

                          {/* Optional related companies picker after tenant */}
                          <IntegrationCompaniesPicker
                            integrationId={integration.id}
                            selectedCompanies={cardCompanies[integration.id] || []}
                            onCompaniesChange={(companies) => {
                              setCardCompanies((prev) => ({
                                ...prev,
                                [integration.id]: companies,
                              }));
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-900 dark:text-gray-100">{integration.lastSynced ? formatRelativeTime(integration.lastSynced) : 'Never'}</span></span>
                          {integration.lastSyncMessage && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <MessageCircle className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={8}
                                  className="z-100 max-w-md"
                                  avoidCollisions={true}
                                  collisionPadding={8}
                                >
                                  <div className="whitespace-pre-wrap text-xs">
                                    {formatSyncMessage(integration.lastSyncMessage)}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 w-full sm:w-auto shrink-0">
                      <Badge variant={getStatusColor(integration.lastSynced)} className="flex items-center space-x-1 shrink-0 whitespace-nowrap">
                        {getStatusIcon(integration.lastSynced)}
                        <span>{getStatusText(integration.lastSynced)}</span>
                      </Badge>
                      <div className="flex flex-row items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleSync(integration)}
                          disabled={syncing.has(integration.id)}
                          className="h-9 w-9"
                          title="Sync"
                        >
                          <RefreshCw className={`h-4 w-4 ${syncing.has(integration.id) ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            setFormModalEntityId(integration.id);
                            setFormModalMode('edit');
                            setFormModalSchemaId('integrations');
                          }}
                          className="h-9 w-9"
                          title="Configure"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
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
                          setSyncStatusCode(prev => ({ ...prev, [integration.id]: undefined }));
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
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
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
