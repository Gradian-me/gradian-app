import { useState, useEffect, useCallback, useRef } from 'react';
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
  testUnhealthyServices: Set<string>;
  isDemoMode: boolean;
  
  // Actions
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshIntervalSeconds: (seconds: number) => void;
  checkHealth: (service: HealthService) => Promise<void>;
  checkAllHealth: () => Promise<void>;
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
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  const checkHealth = useCallback(async (service: HealthService) => {
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
      },
    }));

    try {
      // Fetch from the health API
      const response = await fetch(service.healthApi, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: HealthCheckResponse = await response.json();
      
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
    } catch (error) {
      console.error(`Error checking health for ${service.id}:`, error);
      setHealthStatuses(prev => ({
        ...prev,
        [service.id]: {
          ...prev[service.id],
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to check health',
          lastChecked: new Date().toISOString(),
        },
      }));
    } finally {
      setRefreshing(prev => {
        const next = new Set(prev);
        next.delete(service.id);
        return next;
      });
    }
  }, []);

  // Check all services (only active ones)
  const checkAllHealth = useCallback(async () => {
    const activeServices = services.filter(service => service.monitoringEnabled !== false);
    const promises = activeServices.map(service => checkHealth(service));
    await Promise.all(promises);
    // Reset timer after check completes
    if (autoRefresh && refreshIntervalSeconds > 0) {
      setTimerKey(prev => prev + 1);
    }
  }, [services, checkHealth, autoRefresh, refreshIntervalSeconds]);

  // Auto-refresh effect
  useEffect(() => {
    const activeServices = services.filter(service => service.monitoringEnabled !== false);

    const shouldAutoRefresh =
      autoRefresh && activeServices.length > 0 && refreshIntervalSeconds > 0;

    if (!shouldAutoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Reset timer when starting auto refresh
    setTimerKey(prev => prev + 1);

    // Initial check
    checkAllHealth();

    // Set up interval with user-defined seconds
    const interval = setInterval(() => {
      checkAllHealth();
    }, refreshIntervalSeconds * 1000);

    refreshIntervalRef.current = interval;

    return () => {
      if (interval) {
        clearInterval(interval);
        if (refreshIntervalRef.current === interval) {
          refreshIntervalRef.current = null;
        }
      }
    };
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
          await checkHealth(updatedService);
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
    testUnhealthyServices,
    isDemoMode,
    
    // Actions
    setAutoRefresh,
    setRefreshIntervalSeconds,
    checkHealth,
    checkAllHealth,
    toggleTestUnhealthy,
    toggleMonitoring,
    refreshServices,
  };
};

