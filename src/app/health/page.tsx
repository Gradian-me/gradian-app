'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card/components/MetricCard';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { CircularTimer } from '@/components/ui/circular-timer';
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Activity,
  RefreshCw,
  Server,
  Database,
  Globe,
  Zap,
  Settings,
  Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import type { MetricItem } from '@/gradian-ui/analytics/indicators/metric-card/types';

interface HealthService {
  id: string;
  serviceTitle: string;
  icon: string;
  color: string;
  healthApi: string;
  healthyJsonPath: string;
  isActive?: boolean;
  monitoringEnabled?: boolean;
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  dataSource: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      message?: string;
      responseTime?: number;
    };
  };
  responseTime: number;
}

interface ServiceHealthStatus {
  service: HealthService;
  data: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  lastChecked: string | null;
}

export default function HealthPage() {
  const [services, setServices] = useState<HealthService[]>([]);
  const [healthStatuses, setHealthStatuses] = useState<Record<string, ServiceHealthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState<number>(30);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [timerKey, setTimerKey] = useState(0); // Key to reset timer
  const [testUnhealthyServices, setTestUnhealthyServices] = useState<Set<string>>(new Set()); // Services in test unhealthy mode
  const [isDemoMode, setIsDemoMode] = useState(DEMO_MODE); // Demo mode state
  const [configServiceId, setConfigServiceId] = useState<string | null>(null); // Service ID for configuration
  const [showMonitoringConfig, setShowMonitoringConfig] = useState(false); // Show monitoring configuration dialog

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
        // Keep default value on error
      }
    };

    fetchDemoMode();
  }, []);

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
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
            initialStatuses[service.id] = {
              service,
              data: null,
              loading: false,
              error: null,
              lastChecked: null,
            };
          });
          setHealthStatuses(initialStatuses);
        } else {
          console.error('Failed to fetch health services:', response.error);
        }
      } catch (error) {
        console.error('Error fetching health services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Fetch health status for a service
  const checkHealth = async (service: HealthService) => {
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
  };

  // Check all services (only active ones)
  const checkAllHealth = async () => {
    const activeServices = services.filter(service => service.monitoringEnabled !== false);
    const promises = activeServices.map(service => checkHealth(service));
    await Promise.all(promises);
    // Reset timer after check completes
    if (autoRefresh && refreshIntervalSeconds > 0) {
      setTimerKey(prev => prev + 1);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    const activeServices = services.filter(service => service.monitoringEnabled !== false);
    if (autoRefresh && activeServices.length > 0 && refreshIntervalSeconds > 0) {
      // Reset timer when starting
      setTimerKey(prev => prev + 1);
      
      // Initial check
      checkAllHealth();
      
      // Set up interval with user-defined seconds
      const interval = setInterval(() => {
        checkAllHealth();
      }, refreshIntervalSeconds * 1000);

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, services.length, refreshIntervalSeconds]);

  const getStatusColor = (status: 'healthy' | 'unhealthy' | 'degraded' | null | undefined): 'success' | 'destructive' | 'warning' | 'default' => {
    if (!status) return 'default';
    if (status === 'healthy') return 'success';
    if (status === 'unhealthy') return 'destructive';
    return 'warning';
  };

  const getStatusIcon = (status: 'healthy' | 'unhealthy' | 'degraded' | null | undefined) => {
    if (!status) return <Clock className="h-4 w-4" />;
    if (status === 'healthy') return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getStatusText = (status: 'healthy' | 'unhealthy' | 'degraded' | null | undefined) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateString: string | null) => {
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

  // Calculate metrics for a service
  const getServiceMetrics = (status: ServiceHealthStatus, serviceId: string): MetricItem[] => {
    const isTestUnhealthy = testUnhealthyServices.has(serviceId);
    
    if (!status.data) {
      // If test unhealthy is enabled, show unhealthy even without data
      if (isTestUnhealthy) {
        return [
          {
            id: 'status',
            label: 'Status',
            value: 'Unhealthy',
            icon: 'AlertCircle',
            iconColor: 'red',
          },
        ];
      }
      return [
        {
          id: 'status',
          label: 'Status',
          value: 'Unknown',
          icon: 'AlertCircle',
          iconColor: 'gray',
        },
      ];
    }

    const { data } = status;
    // Override status to unhealthy if in test mode
    const displayStatus = isTestUnhealthy ? 'unhealthy' : data.status;
    const metrics: MetricItem[] = [];

    // Overall status
    metrics.push({
      id: 'status',
      label: 'Status',
      value: displayStatus === 'healthy' ? 'Healthy' : displayStatus === 'unhealthy' ? 'Unhealthy' : 'Degraded',
      icon: displayStatus === 'healthy' ? 'CheckCircle' : 'AlertCircle',
      iconColor: displayStatus === 'healthy' ? 'green' : displayStatus === 'unhealthy' ? 'red' : 'yellow',
    });

    // Response time
    if (data.responseTime !== undefined) {
      metrics.push({
        id: 'responseTime',
        label: 'Response Time',
        value: data.responseTime,
        unit: 'ms',
        icon: 'Zap',
        iconColor: data.responseTime < 100 ? 'green' : data.responseTime < 500 ? 'yellow' : 'red',
        format: 'number',
      });
    }

    // Uptime
    if (data.uptime !== undefined) {
      metrics.push({
        id: 'uptime',
        label: 'Uptime',
        value: formatUptime(data.uptime),
        icon: 'Clock',
        iconColor: 'blue',
      });
    }

    // Version
    if (data.version) {
      metrics.push({
        id: 'version',
        label: 'Version',
        value: data.version,
        icon: 'Server',
        iconColor: 'violet',
      });
    }

    return metrics;
  };

  // Calculate overall stats (including test unhealthy services, excluding inactive)
  const activeServices = services.filter(service => service.monitoringEnabled !== false);
  const inactiveCount = services.filter(service => service.monitoringEnabled === false).length;
  
  const healthyCount = activeServices.filter(service => {
    const status = healthStatuses[service.id];
    const isTestUnhealthy = testUnhealthyServices.has(service.id);
    return !isTestUnhealthy && status?.data?.status === 'healthy';
  }).length;
  const unhealthyCount = activeServices.filter(service => {
    const status = healthStatuses[service.id];
    const isTestUnhealthy = testUnhealthyServices.has(service.id);
    // Only count as unhealthy if test unhealthy OR actually unhealthy (not degraded)
    return isTestUnhealthy || status?.data?.status === 'unhealthy';
  }).length;

  // Get unhealthy services (only unhealthy, not degraded, including test unhealthy, only active)
  const unhealthyServices = activeServices.filter(service => {
    const status = healthStatuses[service.id];
    const actualStatus = status?.data?.status;
    const isTestUnhealthy = testUnhealthyServices.has(service.id);
    // Only include truly unhealthy services, not degraded ones
    return isTestUnhealthy || actualStatus === 'unhealthy';
  });

  // Get inactive services
  const inactiveServices = services.filter(service => service.monitoringEnabled === false);

  // Scroll to service card
  const scrollToService = (serviceId: string) => {
    const element = document.getElementById(`service-card-${serviceId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add a highlight effect
      element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
      }, 2000);
    }
  };

  // Toggle monitoring for a service
  const toggleMonitoring = async (serviceId: string, enabled: boolean) => {
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
  };


  return (
    <MainLayout title="Health Monitoring">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Health Monitoring</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Monitor the health and status of all services</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMonitoringConfig(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure Monitoring
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label 
                  htmlFor="auto-refresh" 
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  <Activity className={`h-4 w-4 ${autoRefresh ? 'animate-pulse text-violet-500' : 'text-gray-400'}`} />
                  <span>Auto Refresh</span>
                </Label>
              </div>
            </div>
            {autoRefresh && refreshIntervalSeconds > 0 && (
              <div className="flex items-center gap-2">
                <CircularTimer
                  key={timerKey}
                  duration={refreshIntervalSeconds}
                  isPlaying={autoRefresh}
                  size={40}
                  strokeWidth={4}
                  onComplete={() => {
                    // Timer completed, refresh will be triggered by interval
                    // Reset timer for next cycle
                    setTimerKey(prev => prev + 1);
                  }}
                  colors={['#7C3AED', '#F97316', '#FACC15', '#EF4444']}
                />
              </div>
            )}
            {autoRefresh && (
              <div className="flex items-center gap-2">
                <Label htmlFor="refresh-interval" className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Interval (s):
                </Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  min="1"
                  max="3600"
                  value={refreshIntervalSeconds}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value > 0) {
                      setRefreshIntervalSeconds(value);
                    }
                  }}
                  className="w-20 h-9"
                  disabled={!autoRefresh}
                />
              </div>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                await checkAllHealth();
                // Reset timer after manual refresh
                if (autoRefresh && refreshIntervalSeconds > 0) {
                  setTimerKey(prev => prev + 1);
                }
              }}
              disabled={loading || refreshing.size > 0}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing.size > 0 ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh All</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                          {healthyCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Healthy</div>
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
                      <AlertCircle className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-2xl font-bold text-gray-400">
                          {inactiveCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Inactive</div>
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
                <Card className={unhealthyCount > 0 ? 'bg-red-100 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      {unhealthyCount > 0 ? (
                        <div className="relative">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                          <AlertCircle className="relative h-5 w-5 text-red-600 dark:text-red-500 shrink-0" />
                        </div>
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className={`text-2xl font-bold ${unhealthyCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-red-500'}`}>
                          {unhealthyCount}
                        </div>
                        <div className={`text-sm truncate font-medium ${unhealthyCount > 0 ? 'text-red-800 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>Unhealthy</div>
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
                      <Activity className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-2xl font-bold text-blue-500">
                          {services.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Total Services</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </div>

        {/* Inactive Services Summary Cards */}
        {!loading && inactiveServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Power className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Inactive Services ({inactiveServices.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {inactiveServices.map((service) => {
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50 opacity-60"
                      onClick={() => scrollToService(service.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-200 dark:bg-gray-700"
                              >
                                <IconRenderer 
                                  iconName={service.icon} 
                                  className="h-5 w-5 text-gray-400"
                                />
                              </div>
                              <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 truncate">
                                {service.serviceTitle}
                              </h4>
                            </div>
                            <Badge 
                              variant="outline"
                              className="font-bold text-xs bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                            >
                              INACTIVE
                            </Badge>
                          </div>
                          <Power className="h-5 w-5 shrink-0 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Unhealthy Services Summary Cards */}
        {!loading && unhealthyServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Unhealthy Services ({unhealthyServices.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {unhealthyServices.map((service) => {
                const status = healthStatuses[service.id];
                const actualStatus = status?.data?.status;
                const isTestUnhealthy = testUnhealthyServices.has(service.id);
                // Override to unhealthy if in test mode
                const serviceStatus = isTestUnhealthy ? 'unhealthy' : actualStatus;
                const isUnhealthy = serviceStatus === 'unhealthy';
                
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 bg-red-50/50 dark:bg-red-950/20"
                      onClick={() => scrollToService(service.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: isUnhealthy ? '#ef444420' : '#f59e0b20' }}
                              >
                                <IconRenderer 
                                  iconName={service.icon} 
                                  className={`h-5 w-5 ${isUnhealthy ? 'text-red-500' : 'text-yellow-500'}`}
                                />
                              </div>
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                {service.serviceTitle}
                              </h4>
                            </div>
                            <Badge 
                              variant={isUnhealthy ? 'destructive' : 'default'}
                              className={`font-bold text-xs ${
                                isUnhealthy 
                                  ? 'bg-red-600 text-white dark:bg-red-700' 
                                  : 'bg-yellow-500 text-white dark:bg-yellow-600'
                              }`}
                            >
                              {isUnhealthy ? 'UNHEALTHY' : 'DEGRADED'}
                            </Badge>
                            {status?.data?.responseTime !== undefined && (
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                Response: {status.data.responseTime}ms
                              </div>
                            )}
                            {status?.error && (
                              <div className="mt-2 text-xs text-red-600 dark:text-red-400 truncate">
                                {status.error}
                              </div>
                            )}
                          </div>
                          <AlertCircle className={`h-5 w-5 shrink-0 ${isUnhealthy ? 'text-red-500' : 'text-yellow-500'}`} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Service Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="space-y-4"
        >
          {loading ? (
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex flex-row items-end space-x-2 w-full sm:w-auto shrink-0">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-blue-200/50 dark:border-blue-800/50 p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : services.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No health services configured.</p>
              </CardContent>
            </Card>
          ) : (
            services.map((service, index) => {
              const status = healthStatuses[service.id];
              const actualStatus = status?.data?.status || null;
              const isTestUnhealthy = testUnhealthyServices.has(service.id);
              // Override status to unhealthy if in test mode
              const serviceStatus = isTestUnhealthy ? 'unhealthy' : actualStatus;
              const isHealthy = serviceStatus === 'healthy';
              const isRefreshing = refreshing.has(service.id);
              const isMonitoringDisabled = service.monitoringEnabled === false;

              return (
                <motion.div
                  key={service.id}
                  id={`service-card-${service.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className="scroll-mt-4 transition-all duration-300"
                >
                  <Card className={`hover:shadow-lg transition-shadow duration-200 ${isMonitoringDisabled ? 'opacity-60 bg-gray-50 dark:bg-gray-900/50' : ''}`}>
                    <CardContent className="p-4 sm:p-6">
                      {/* Service Header */}
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <div 
                              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${serviceStatus === 'healthy' ? '#10b981' : serviceStatus === 'unhealthy' ? '#ef4444' : '#f59e0b'}20` }}
                            >
                              <IconRenderer 
                                iconName={service.icon} 
                                className={`h-6 w-6 ${
                                  serviceStatus === 'healthy' 
                                    ? 'text-green-500' 
                                    : serviceStatus === 'unhealthy' 
                                    ? 'text-red-500' 
                                    : 'text-yellow-500'
                                }`}
                              />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold truncate min-w-0 flex-1">
                              {service.serviceTitle}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                                {service.id}
                              </Badge>
                              <Badge 
                                variant={isHealthy ? 'outline' : getStatusColor(serviceStatus)} 
                                className={`flex items-center space-x-1 shrink-0 whitespace-nowrap ${
                                  isHealthy 
                                    ? 'border-green-500/50 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-500/30' 
                                    : ''
                                }`}
                              >
                                {isHealthy && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                )}
                                {getStatusIcon(serviceStatus)}
                                <span>{getStatusText(serviceStatus)}</span>
                              </Badge>
                            </div>
                          </div>
                          
                          {status?.lastChecked && (
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Last checked: {formatDate(status.lastChecked)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-row items-end gap-2 w-full sm:w-auto shrink-0">
                          <div className="flex items-center gap-2 px-2 py-1 border rounded-md bg-gray-50 dark:bg-gray-900/50">
                            <Label htmlFor={`monitoring-${service.id}`} className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer">
                              Monitoring
                            </Label>
                            <Switch
                              id={`monitoring-${service.id}`}
                              checked={service.monitoringEnabled !== false}
                              onCheckedChange={(checked) => toggleMonitoring(service.id, checked)}
                            />
                          </div>
                          {isDemoMode && (
                            <div className="flex items-center gap-2 px-2 py-1 border rounded-md bg-gray-50 dark:bg-gray-900/50">
                              <Label htmlFor={`test-unhealthy-${service.id}`} className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer">
                                Test Unhealthy
                              </Label>
                              <Switch
                                id={`test-unhealthy-${service.id}`}
                                checked={isTestUnhealthy}
                                disabled={isMonitoringDisabled}
                                onCheckedChange={(checked) => {
                                  setTestUnhealthyServices(prev => {
                                    const next = new Set(prev);
                                    if (checked) {
                                      next.add(service.id);
                                    } else {
                                      next.delete(service.id);
                                    }
                                    return next;
                                  });
                                }}
                              />
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfigServiceId(service.id)}
                            className="flex-1 sm:flex-none"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Configure</span>
                            <span className="sm:hidden">Config</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => checkHealth(service)}
                            disabled={isRefreshing || isMonitoringDisabled}
                            className="flex-1 sm:flex-none"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                            <span className="sm:hidden">Sync</span>
                          </Button>
                        </div>
                      </div>

                      {/* Error Display */}
                      {status?.error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-red-800 dark:text-red-200">Error</div>
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">{status.error}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metrics Card */}
                      {isMonitoringDisabled ? (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Power className="h-4 w-4" />
                            <span className="text-sm font-medium">Monitoring is disabled for this service</span>
                          </div>
                        </div>
                      ) : status?.data && !status?.loading ? (
                        <div className="mb-4" key={`metrics-${service.id}-${isTestUnhealthy}`}>
                          <MetricCard
                            metrics={getServiceMetrics(status, service.id)}
                            gradient={service.color as any || 'blue'}
                            showPattern={true}
                            layout="grid"
                            columns={4}
                          />
                        </div>
                      ) : null}

                      {/* Health Checks Details */}
                      {status?.data?.checks && !status?.loading && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                            Component Checks
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {Object.entries(status.data.checks).map(([checkName, check]) => (
                              <div
                                key={checkName}
                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {check.status === 'healthy' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                  ) : check.status === 'unhealthy' ? (
                                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                                  )}
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate capitalize">
                                    {checkName}
                                  </span>
                                </div>
                                {check.responseTime !== undefined && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 shrink-0">
                                    {check.responseTime}ms
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {Object.entries(status.data.checks).some(([, check]) => check.message) && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(status.data.checks).map(([checkName, check]) => (
                                check.message && (
                                  <div key={checkName} className="text-xs text-gray-600 dark:text-gray-400 pl-4">
                                    <span className="font-medium capitalize">{checkName}:</span> {check.message}
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Loading State */}
                      {status?.loading && (
                        <div className="mt-4 space-y-4">
                          {/* Metrics Card Skeleton */}
                          <div className="rounded-xl border bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-blue-200/50 dark:border-blue-800/50 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-3 w-16" />
                                  <Skeleton className="h-6 w-20" />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-3 w-20" />
                                  <Skeleton className="h-6 w-16" />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-3 w-16" />
                                  <Skeleton className="h-6 w-24" />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-3 w-16" />
                                  <Skeleton className="h-6 w-20" />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Health Checks Skeleton */}
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-32" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <Skeleton className="h-10 w-full rounded-lg" />
                              <Skeleton className="h-10 w-full rounded-lg" />
                              <Skeleton className="h-10 w-full rounded-lg" />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* Monitoring Configuration Dialog */}
        <Dialog open={showMonitoringConfig} onOpenChange={setShowMonitoringConfig}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Monitoring</DialogTitle>
              <DialogDescription>
                Enable or disable monitoring for each service. Inactive services will not be checked.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${service.color || 'blue'}20` }}
                    >
                      <IconRenderer 
                        iconName={service.icon} 
                        className={`h-6 w-6 text-${service.color || 'blue'}-500`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {service.serviceTitle}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {service.id}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={service.monitoringEnabled !== false}
                    onCheckedChange={(checked) => toggleMonitoring(service.id, checked)}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Service Configuration Dialog */}
        <Dialog open={configServiceId !== null} onOpenChange={(open) => !open && setConfigServiceId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configure Service</DialogTitle>
              <DialogDescription>
                {configServiceId && services.find(s => s.id === configServiceId)?.serviceTitle}
              </DialogDescription>
            </DialogHeader>
            {configServiceId && (() => {
              const service = services.find(s => s.id === configServiceId);
              if (!service) return null;
              
              return (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Monitoring</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Enable health checks for this service
                      </div>
                    </div>
                    <Switch
                      checked={service.monitoringEnabled !== false}
                      onCheckedChange={(checked) => {
                        toggleMonitoring(service.id, checked);
                        setConfigServiceId(null);
                      }}
                    />
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Service Details</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ID:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono">{service.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">API:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono text-xs truncate max-w-[200px]">
                          {service.healthApi}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status Path:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono">{service.healthyJsonPath}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

