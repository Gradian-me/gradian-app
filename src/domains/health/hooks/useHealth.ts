import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { toast } from 'sonner';
import { HealthService, ServiceHealthStatus, HealthCheckResponse } from '../types';

export interface UseHealthOptions {
  autoRefresh?: boolean;
  refreshIntervalSeconds?: number;
}

export interface UseHealthReturn {
  // State
  services: HealthService[];
  healthStatuses: Record<string, ServiceHealthStatus>;
  loading: boolean;
  refreshing: Set<string>;
  autoRefresh: boolean;
  refreshIntervalSeconds: number;
  timerKey: number;
  testUnhealthyServices: Set<string>;
  isDemoMode: boolean;
  
  // Actions
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshIntervalSeconds: (seconds: number) => void;
  checkHealth: (service: HealthService, showToast?: boolean) => Promise<void>;
  checkAllHealth: (showToast?: boolean) => Promise<void>;
  handleTimerComplete: () => Promise<void>;
  toggleTestUnhealthy: (serviceId: string, enabled: boolean) => void;
  toggleMonitoring: (serviceId: string, enabled: boolean) => Promise<void>;
  refreshServices: () => Promise<void>;
}

export const useHealth = (options: UseHealthOptions = {}): UseHealthReturn => {
  const [services, setServices] = useState<HealthService[]>([]);
  const [healthStatuses, setHealthStatuses] = useState<Record<string, ServiceHealthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(options.autoRefresh ?? true);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState<number>(options.refreshIntervalSeconds ?? 30);
  const [timerKey, setTimerKey] = useState(0);
  const [testUnhealthyServices, setTestUnhealthyServices] = useState<Set<string>>(new Set());
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Fetch demo mode from API
  useEffect(() => {
    const fetchDemoMode = async () => {
      try {
        const response = await fetch('/api/application-variables');
        const result = await response.json();
        
        if (result.success && result.data?.DEMO_MODE !== undefined) {
          setIsDemoMode(result.data.DEMO_MODE);
        }
      } catch (error) {
        console.error('Error fetching demo mode:', error);
      }
    };

    fetchDemoMode();
  }, []);

  // Fetch services from API
  const refreshServices = useCallback(async () => {
    try {
      const response = await apiRequest<HealthService[] | { data?: HealthService[]; items?: HealthService[] }>('/api/data/health', {
        method: 'GET',
      });
      
      if (response.success && response.data) {
        const data = Array.isArray(response.data) 
          ? response.data 
          : ((response.data as any)?.data || (response.data as any)?.items || []);
        setServices(data);
        
        // Initialize health statuses
        const initialStatuses: Record<string, ServiceHealthStatus> = {};
        data.forEach((service: HealthService) => {
          if (!healthStatuses[service.id]) {
            initialStatuses[service.id] = {
              service,
              data: null,
              loading: false,
              error: null,
              lastChecked: null,
            };
          }
        });
        setHealthStatuses(prev => ({ ...prev, ...initialStatuses }));
      } else {
        console.error('Failed to fetch health services:', response.error);
      }
    } catch (error) {
      console.error('Error fetching health services:', error);
    } finally {
      setLoading(false);
    }
  }, [healthStatuses]);

  useEffect(() => {
    refreshServices();
  }, []);

  // Fetch health status for a service
  const checkHealth = useCallback(async (service: HealthService, showToast = false) => {
    // Skip if monitoring is disabled
    if (service.monitoringEnabled === false) {
      return;
    }

    setRefreshing(prev => new Set(prev).add(service.id));
    setHealthStatuses(prev => ({
      ...prev,
      [service.id]: {
        ...prev[service.id],
        loading: true,
        error: null,
        // Preserve existing data during refresh
        data: prev[service.id]?.data || null,
      },
    }));

    try {
      // Determine if this is an external URL (not relative path)
      const isExternalUrl = !service.healthApi.startsWith('/');
      
      // For external URLs, use the proxy to bypass CORS
      // For relative URLs, fetch directly
      let fetchUrl: string;
      if (isExternalUrl) {
        // Use proxy for external services
        fetchUrl = `/api/health/proxy?url=${encodeURIComponent(service.healthApi)}`;
      } else {
        // Relative path - make it absolute using current origin
        fetchUrl = `${window.location.origin}${service.healthApi}`;
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (longer for proxy)

      try {
        // Fetch from the health API (or proxy)
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          setHealthStatuses(prev => ({
            ...prev,
            [service.id]: {
              ...prev[service.id],
              data: null,
              loading: false,
              error: errorMsg,
              lastChecked: new Date().toISOString(),
            },
          }));
          if (showToast) {
            toast.error(`Health check failed for ${service.serviceTitle}: ${errorMsg}`);
          }
          return;
        }

        const result = await response.json();
        
        // Handle proxy response format
        let data: HealthCheckResponse;
        if (isExternalUrl && result.success === false) {
          // Proxy returned an error - handle gracefully
          const errorMsg = result.error || 'Failed to check health';
          setHealthStatuses(prev => ({
            ...prev,
            [service.id]: {
              ...prev[service.id],
              data: null,
              loading: false,
              error: errorMsg,
              lastChecked: new Date().toISOString(),
            },
          }));
          if (showToast) {
            toast.error(`Health check failed for ${service.serviceTitle}: ${errorMsg}`);
          }
          return;
        } else if (isExternalUrl && result.success === true) {
          // Proxy returned success
          data = result.data;
        } else {
          // Direct response (relative URL)
          data = result;
        }
        
        setHealthStatuses(prev => ({
          ...prev,
          [service.id]: {
            ...prev[service.id],
            data,
            loading: false,
            error: null,
            lastChecked: new Date().toISOString(),
          },
        }));
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Handle specific error types gracefully (don't throw)
        let errorMessage = 'Failed to check health';
        
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            errorMessage = 'Request timeout: Health check took too long';
          } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
            // CORS or network errors - handle gracefully
            errorMessage = isExternalUrl
              ? `Unable to reach ${service.healthApi}. The service may be down or unreachable.`
              : `Unable to reach ${service.healthApi}. Check network connectivity.`;
          } else {
            errorMessage = fetchError.message;
          }
        }
        
        // Set error state (don't throw)
        setHealthStatuses(prev => ({
          ...prev,
          [service.id]: {
            ...prev[service.id],
            data: null,
            loading: false,
            error: errorMessage,
            lastChecked: new Date().toISOString(),
          },
        }));
        
        // Only show toast on manual refresh, not auto-refresh
        if (showToast) {
          toast.error(`Health check failed for ${service.serviceTitle}: ${errorMessage}`);
        }
      }
    } catch (error) {
      // Catch any unexpected errors and handle gracefully
      console.error(`Error checking health for ${service.id}:`, error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to check health';
      
      setHealthStatuses(prev => ({
        ...prev,
        [service.id]: {
          ...prev[service.id],
          data: null,
          loading: false,
          error: errorMessage,
          lastChecked: new Date().toISOString(),
        },
      }));
      
      if (showToast) {
        toast.error(`Health check failed for ${service.serviceTitle}: ${errorMessage}`);
      }
    } finally {
      setRefreshing(prev => {
        const next = new Set(prev);
        next.delete(service.id);
        return next;
      });
    }
  }, []);

  // Check all services (only active ones)
  const checkAllHealth = useCallback(async (showToast = false) => {
    const activeServices = services.filter(service => service.monitoringEnabled !== false);
    const promises = activeServices.map(service => checkHealth(service, showToast));
    await Promise.all(promises);
  }, [services, checkHealth]);

  // Handle timer completion - triggers health check
  const handleTimerComplete = useCallback(async () => {
    if (autoRefresh) {
      await checkAllHealth(false); // Don't show toast on auto-refresh
    }
    // Reset timer
    setTimerKey(prev => prev + 1);
  }, [autoRefresh, checkAllHealth]);

  // Auto-refresh effect - initialize timer and do initial check
  useEffect(() => {
    const activeServices = services.filter(service => service.monitoringEnabled !== false);

    const shouldAutoRefresh =
      autoRefresh && activeServices.length > 0 && refreshIntervalSeconds > 0;

    if (!shouldAutoRefresh) {
      return;
    }

    // Reset timer when starting auto refresh or when interval changes
    // This restarts the timer with the new duration
    setTimerKey(prev => prev + 1);

    // Initial check
    checkAllHealth();
  }, [autoRefresh, services, refreshIntervalSeconds, checkAllHealth]);

  // Toggle test unhealthy
  const toggleTestUnhealthy = useCallback((serviceId: string, enabled: boolean) => {
    setTestUnhealthyServices(prev => {
      const next = new Set(prev);
      if (enabled) {
        next.add(serviceId);
      } else {
        next.delete(serviceId);
      }
      return next;
    });
  }, []);

  // Toggle monitoring for a service
  const toggleMonitoring = useCallback(async (serviceId: string, enabled: boolean) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const response = await apiRequest(`/api/data/health`, {
        method: 'PUT',
        body: {
          ...service,
          monitoringEnabled: enabled,
        },
      });

      if (response.success) {
        // Update local state
        setServices(prev => prev.map(s => 
          s.id === serviceId ? { ...s, monitoringEnabled: enabled } : s
        ));
        
        // If disabling, clear health status
        if (!enabled) {
          setHealthStatuses(prev => ({
            ...prev,
            [serviceId]: {
              ...prev[serviceId],
              data: null,
              error: null,
            },
          }));
        } else {
          // If enabling, check health immediately
          const updatedService = { ...service, monitoringEnabled: enabled };
          await checkHealth(updatedService, false); // Don't show toast when toggling monitoring
        }
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  }, [services, checkHealth]);

  return {
    // State
    services,
    healthStatuses,
    loading,
    refreshing,
    autoRefresh,
    refreshIntervalSeconds,
    timerKey,
    testUnhealthyServices,
    isDemoMode,
    
    // Actions
    setAutoRefresh,
    setRefreshIntervalSeconds,
    checkHealth,
    checkAllHealth,
    handleTimerComplete,
    toggleTestUnhealthy,
    toggleMonitoring,
    refreshServices,
  };
};

