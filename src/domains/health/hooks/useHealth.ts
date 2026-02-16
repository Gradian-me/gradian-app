import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { toast } from 'sonner';
import { HealthService, ServiceHealthStatus, HealthCheckResponse } from '../types';
import { Email } from '@/gradian-ui/communication';

/**
 * Update lastChecked timestamp in health.json
 */
const updateLastChecked = async (serviceId: string): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    await apiRequest('/api/data/health', {
      method: 'PATCH',
      body: {
        serviceId,
        field: 'lastChecked',
        timestamp,
      },
      callerName: 'useHealth.updateLastChecked',
    });
  } catch (error) {
    // Silently fail - don't interrupt health check flow
    console.warn(`Failed to update lastChecked for ${serviceId}:`, error);
  }
};

/**
 * Update lastEmailSent timestamp in health.json
 */
export const updateLastEmailSent = async (serviceId: string): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    await apiRequest('/api/data/health', {
      method: 'PATCH',
      body: {
        serviceId,
        field: 'lastEmailSent',
        timestamp,
      },
      callerName: 'useHealth.updateLastEmailSent',
    });
  } catch (error) {
    // Silently fail - don't interrupt email sending flow
    console.warn(`Failed to update lastEmailSent for ${serviceId}:`, error);
  }
};

const FAILED_CYCLES_STORAGE_KEY = 'health-failed-cycles';

interface FailedCycleData {
  failedCycles: number;
  firstFailureTime: string | null;
}

// Helper functions to manage failed cycles in localStorage
const getFailedCyclesData = (serviceId: string): FailedCycleData => {
  if (typeof window === 'undefined') {
    return { failedCycles: 0, firstFailureTime: null };
  }
  try {
    const stored = localStorage.getItem(FAILED_CYCLES_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data[serviceId] || { failedCycles: 0, firstFailureTime: null };
    }
  } catch (error) {
    console.warn('Error reading failed cycles data:', error);
  }
  return { failedCycles: 0, firstFailureTime: null };
};

const updateFailedCyclesData = (serviceId: string, data: FailedCycleData): void => {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(FAILED_CYCLES_STORAGE_KEY);
    const allData = stored ? JSON.parse(stored) : {};
    allData[serviceId] = data;
    localStorage.setItem(FAILED_CYCLES_STORAGE_KEY, JSON.stringify(allData));
  } catch (error) {
    console.warn('Error updating failed cycles data:', error);
  }
};

const resetFailedCyclesData = (serviceId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(FAILED_CYCLES_STORAGE_KEY);
    if (stored) {
      const allData = JSON.parse(stored);
      delete allData[serviceId];
      localStorage.setItem(FAILED_CYCLES_STORAGE_KEY, JSON.stringify(allData));
    }
  } catch (error) {
    console.warn('Error resetting failed cycles data:', error);
  }
};

// Helper function to update failed cycles based on health status
const updateFailedCycles = (serviceId: string, isUnhealthy: boolean): FailedCycleData => {
  const currentData = getFailedCyclesData(serviceId);
  
  if (isUnhealthy) {
    // Service is unhealthy - increment failed cycles
    const now = new Date().toISOString();
    const newData: FailedCycleData = {
      failedCycles: currentData.failedCycles + 1,
      firstFailureTime: currentData.firstFailureTime || now,
    };
    updateFailedCyclesData(serviceId, newData);
    return newData;
  } else {
    // Service is healthy - reset failed cycles
    resetFailedCyclesData(serviceId);
    return { failedCycles: 0, firstFailureTime: null };
  }
};

/**
 * Send health alert email if threshold is reached
 * Returns error message if email sending fails, null if successful or skipped
 */
const sendHealthAlertEmail = async (
  service: HealthService,
  healthStatus: ServiceHealthStatus,
  failedCycles: number,
  setHealthStatuses: Dispatch<SetStateAction<Record<string, ServiceHealthStatus>>>
): Promise<string | null> => {
  try {
    // Fetch latest service data to get current lastEmailSent
    let latestService = service;
    try {
      const response = await apiRequest<HealthService[] | { data?: HealthService[]; items?: HealthService[] }>('/api/data/health', {
        method: 'GET',
      });
      if (response.success && response.data) {
        const data = Array.isArray(response.data) 
          ? response.data 
          : ((response.data as any)?.data || (response.data as any)?.items || []);
        const found = data.find((s: HealthService) => s.id === service.id);
        if (found) {
          latestService = found;
        }
      }
    } catch (error) {
      // If fetch fails, use the service passed in
      console.warn('Failed to fetch latest service data, using provided service:', error);
    }

    // Check if email should be sent
    const failCycleToSendEmail = latestService.failCycleToSendEmail ?? 3;
    const emailTo = latestService.emailTo;
    const emailCC = latestService.emailCC;

    // Don't send if no email recipients configured
    if (!emailTo || emailTo.length === 0) {
      // Clear email error if no recipients configured
      setHealthStatuses(prev => ({
        ...prev,
        [service.id]: {
          ...(prev[service.id] || healthStatus),
          emailError: null,
        },
      }));
      return null;
    }

    // Don't send if failed cycles haven't reached threshold
    if (failedCycles < failCycleToSendEmail) {
      // Clear email error if threshold not reached
      setHealthStatuses(prev => ({
        ...prev,
        [service.id]: {
          ...(prev[service.id] || healthStatus),
          emailError: null,
        },
      }));
      return null;
    }

    // Check if we should send email (avoid sending on every check once threshold is reached)
    // Only send if this is exactly the threshold, or if enough time has passed since last email
    const emailIntervalMinutes = latestService.emailIntervalMinutes ?? 15;
    const lastEmailSent = latestService.lastEmailSent;
    if (lastEmailSent) {
      const lastSentTime = new Date(lastEmailSent).getTime();
      const intervalMs = emailIntervalMinutes * 60 * 1000;
      const timeSinceLastEmail = Date.now() - lastSentTime;
      
      // If we sent an email recently and this isn't exactly the threshold, don't send again
      if (timeSinceLastEmail < intervalMs && failedCycles > failCycleToSendEmail) {
        // Clear email error if we're not sending (rate limited)
        setHealthStatuses(prev => ({
          ...prev,
          [service.id]: {
            ...(prev[service.id] || healthStatus),
            emailError: null,
          },
        }));
        return null;
      }
    }

    // Prepare email template data
    const errorMessage = healthStatus.error || 
      (healthStatus.data?.status === 'unhealthy' ? 'Service is reporting as unhealthy' : 'Service health check failed');
    
    const checksDetails = healthStatus.data?.checks 
      ? Object.entries(healthStatus.data.checks)
          .filter(([_, check]) => check.status !== 'healthy')
          .map(([name, check]) => `${name}: ${check.message || check.status}`)
          .join('; ')
      : errorMessage;

    const healthDashboardUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/builder/health`
      : 'https://scm.cinnagen.com/health';

    const templateData = {
      serviceName: latestService.serviceTitle,
      status: healthStatus.data?.status || 'unhealthy',
      timestamp: healthStatus.data?.timestamp || new Date().toISOString(),
      version: healthStatus.data?.version || 'unknown',
      errorMessage: checksDetails,
      healthDashboardUrl,
      year: new Date().getFullYear().toString(),
    };

    // Send email using communication service
    const emailResponse = await Email.sendEmail({
      templateId: 'monitoring-error',
      to: emailTo,
      cc: emailCC,
      templateData,
    });

    if (emailResponse.success) {
      // Update lastEmailSent timestamp
      await updateLastEmailSent(latestService.id);
      console.log(`Health alert email sent for ${latestService.serviceTitle} after ${failedCycles} failed cycles`);
      
      // Clear email error on success
      setHealthStatuses(prev => ({
        ...prev,
        [service.id]: {
          ...(prev[service.id] || healthStatus),
          emailError: null,
        },
      }));
      
      return null;
    } else {
      const errorMessage = emailResponse.message || 'Failed to send email alert';
      console.error(`Failed to send health alert email for ${latestService.serviceTitle}:`, errorMessage);
      
      // Set email error in health status
      setHealthStatuses(prev => ({
        ...prev,
        [service.id]: {
          ...(prev[service.id] || healthStatus),
          emailError: errorMessage,
        },
      }));
      
      return errorMessage;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email alert';
    console.warn(`Error sending health alert email for ${service.serviceTitle}:`, error);
    
    // Set email error in health status
    setHealthStatuses(prev => ({
      ...prev,
      [service.id]: {
        ...(prev[service.id] || healthStatus),
        emailError: errorMessage,
      },
    }));
    
    return errorMessage;
  }
};

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

  // Get demo mode from environment config
  useEffect(() => {
    // Import DEMO_MODE directly from config (client-safe)
    import('@/gradian-ui/shared/configs/env-config').then(({ DEMO_MODE }) => {
      setIsDemoMode(DEMO_MODE);
    }).catch((error) => {
      console.error('Error loading demo mode:', error);
    });
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
        
        // Initialize health statuses and update with failed cycles data
        const initialStatuses: Record<string, ServiceHealthStatus> = {};
        data.forEach((service: HealthService) => {
          const failedCyclesData = getFailedCyclesData(service.id);
          if (!healthStatuses[service.id]) {
            initialStatuses[service.id] = {
              service,
              data: null,
              loading: false,
              error: null,
              lastChecked: null,
              failedCycles: failedCyclesData.failedCycles,
              firstFailureTime: failedCyclesData.firstFailureTime,
            };
          } else {
            // Update existing status with failed cycles data
            initialStatuses[service.id] = {
              ...healthStatuses[service.id],
              service, // Update service in case it changed
              failedCycles: failedCyclesData.failedCycles,
              firstFailureTime: failedCyclesData.firstFailureTime,
            };
          }
        });
        setHealthStatuses(prev => {
          const updated = { ...prev };
          Object.keys(initialStatuses).forEach(serviceId => {
            updated[serviceId] = initialStatuses[serviceId];
          });
          return updated;
        });
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
          // Mark as unhealthy when fetch fails
          const unhealthyData: HealthCheckResponse = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: service.serviceTitle,
            version: 'unknown',
            environment: 'unknown',
            dataSource: 'health-check',
            uptime: 0,
            checks: {
              fetch: {
                status: 'unhealthy',
                message: errorMsg,
              },
            },
            responseTime: 0,
          };
          const failedCyclesData = updateFailedCycles(service.id, true);
          const checkedAt = new Date().toISOString();
          const newStatus: ServiceHealthStatus = {
            ...(healthStatuses[service.id] || { service, data: null, loading: false, error: null, lastChecked: null }),
            data: unhealthyData,
            loading: false,
            error: errorMsg,
            lastChecked: checkedAt,
            failedCycles: failedCyclesData.failedCycles,
            firstFailureTime: failedCyclesData.firstFailureTime,
          };
          setHealthStatuses(prev => ({
            ...prev,
            [service.id]: newStatus,
          }));
          // Update lastChecked in health.json
          updateLastChecked(service.id);
          // Send email alert if threshold is reached
          sendHealthAlertEmail(service, newStatus, failedCyclesData.failedCycles, setHealthStatuses);
          if (showToast) {
            toast.error(`Health check failed for ${service.serviceTitle}: ${errorMsg}`);
          }
          return;
        }

        let result: unknown;
        const text = await response.text();
        try {
          result = text ? JSON.parse(text) : {};
        } catch {
          // Handle plain text "healthy" (or similar) responses
          const trimmed = text?.trim().toLowerCase() ?? '';
          if (trimmed === 'healthy' || trimmed === 'ok') {
            result = { status: 'healthy', timestamp: new Date().toISOString(), message: trimmed };
          } else {
            throw new Error(`Invalid health response: expected JSON or "healthy"/"ok", got "${(text ?? '').slice(0, 50)}${(text?.length ?? 0) > 50 ? '...' : ''}"`);
          }
        }

        // Handle proxy response format
        let data: HealthCheckResponse;
        if (isExternalUrl && result.success === false) {
          // Proxy returned an error - mark as unhealthy
          const errorMsg = result.error || 'Failed to check health';
          const unhealthyData: HealthCheckResponse = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: service.serviceTitle,
            version: 'unknown',
            environment: 'unknown',
            dataSource: 'health-check',
            uptime: 0,
            checks: {
              fetch: {
                status: 'unhealthy',
                message: errorMsg,
              },
            },
            responseTime: 0,
          };
          const failedCyclesData = updateFailedCycles(service.id, true);
          const checkedAt = new Date().toISOString();
          const newStatus: ServiceHealthStatus = {
            ...(healthStatuses[service.id] || { service, data: null, loading: false, error: null, lastChecked: null }),
            data: unhealthyData,
            loading: false,
            error: errorMsg,
            lastChecked: checkedAt,
            failedCycles: failedCyclesData.failedCycles,
            firstFailureTime: failedCyclesData.firstFailureTime,
          };
          setHealthStatuses(prev => ({
            ...prev,
            [service.id]: newStatus,
          }));
          // Update lastChecked in health.json
          updateLastChecked(service.id);
          // Send email alert if threshold is reached
          sendHealthAlertEmail(service, newStatus, failedCyclesData.failedCycles, setHealthStatuses);
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
        
        // Determine if service is unhealthy (including degraded as unhealthy for tracking)
        const isUnhealthy = data.status === 'unhealthy' || data.status === 'degraded';
        const failedCyclesData = updateFailedCycles(service.id, isUnhealthy);
        const checkedAt = new Date().toISOString();
        
        const newStatus: ServiceHealthStatus = {
          ...(healthStatuses[service.id] || { service, data: null, loading: false, error: null, lastChecked: null }),
          data,
          loading: false,
          error: null,
          lastChecked: checkedAt,
          failedCycles: failedCyclesData.failedCycles,
          firstFailureTime: failedCyclesData.firstFailureTime,
        };
        
        setHealthStatuses(prev => ({
          ...prev,
          [service.id]: newStatus,
        }));
        // Update lastChecked in health.json
        updateLastChecked(service.id);
        // Send email alert if threshold is reached and service is unhealthy
        if (isUnhealthy) {
          sendHealthAlertEmail(service, newStatus, failedCyclesData.failedCycles, setHealthStatuses);
        }
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
        
        // Mark as unhealthy when fetch fails
        const unhealthyData: HealthCheckResponse = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: service.serviceTitle,
          version: 'unknown',
          environment: 'unknown',
          dataSource: 'health-check',
          uptime: 0,
          checks: {
            fetch: {
              status: 'unhealthy',
              message: errorMessage,
            },
          },
          responseTime: 0,
        };
        
        const failedCyclesData = updateFailedCycles(service.id, true);
        const checkedAt = new Date().toISOString();
        
        const newStatus: ServiceHealthStatus = {
          ...(healthStatuses[service.id] || { service, data: null, loading: false, error: null, lastChecked: null }),
          data: unhealthyData,
          loading: false,
          error: errorMessage,
          lastChecked: checkedAt,
          failedCycles: failedCyclesData.failedCycles,
          firstFailureTime: failedCyclesData.firstFailureTime,
        };
        
        // Set error state (don't throw)
        setHealthStatuses(prev => ({
          ...prev,
          [service.id]: newStatus,
        }));
        // Update lastChecked in health.json
        updateLastChecked(service.id);
        // Send email alert if threshold is reached
        sendHealthAlertEmail(service, newStatus, failedCyclesData.failedCycles, setHealthStatuses);
        
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
      
      // Mark as unhealthy when any error occurs
      const unhealthyData: HealthCheckResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: service.serviceTitle,
        version: 'unknown',
        environment: 'unknown',
        dataSource: 'health-check',
        uptime: 0,
        checks: {
          error: {
            status: 'unhealthy',
            message: errorMessage,
          },
        },
        responseTime: 0,
      };
      
      const failedCyclesData = updateFailedCycles(service.id, true);
      const checkedAt = new Date().toISOString();
      
      const newStatus: ServiceHealthStatus = {
        ...(healthStatuses[service.id] || { service, data: null, loading: false, error: null, lastChecked: null }),
        data: unhealthyData,
        loading: false,
        error: errorMessage,
        lastChecked: checkedAt,
        failedCycles: failedCyclesData.failedCycles,
        firstFailureTime: failedCyclesData.firstFailureTime,
      };
      
      setHealthStatuses(prev => ({
        ...prev,
        [service.id]: newStatus,
      }));
      // Update lastChecked in health.json
      updateLastChecked(service.id);
      // Send email alert if threshold is reached
      sendHealthAlertEmail(service, newStatus, failedCyclesData.failedCycles, setHealthStatuses);
      
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

