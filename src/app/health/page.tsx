'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card/components/MetricCard';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Activity,
  RefreshCw,
  Server,
  Database,
  Globe,
  Zap
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

  // Check all services
  const checkAllHealth = async () => {
    const promises = services.map(service => checkHealth(service));
    await Promise.all(promises);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && services.length > 0 && refreshIntervalSeconds > 0) {
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
  const getServiceMetrics = (status: ServiceHealthStatus): MetricItem[] => {
    if (!status.data) {
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
    const metrics: MetricItem[] = [];

    // Overall status
    metrics.push({
      id: 'status',
      label: 'Status',
      value: data.status === 'healthy' ? 'Healthy' : data.status === 'unhealthy' ? 'Unhealthy' : 'Degraded',
      icon: data.status === 'healthy' ? 'CheckCircle' : 'AlertCircle',
      iconColor: data.status === 'healthy' ? 'green' : data.status === 'unhealthy' ? 'red' : 'yellow',
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

  // Calculate overall stats
  const healthyCount = Object.values(healthStatuses).filter(
    s => s.data?.status === 'healthy'
  ).length;
  const unhealthyCount = Object.values(healthStatuses).filter(
    s => s.data?.status === 'unhealthy'
  ).length;
  const degradedCount = Object.values(healthStatuses).filter(
    s => s.data?.status === 'degraded'
  ).length;


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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="w-full sm:w-auto"
            >
              <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}</span>
              <span className="sm:hidden">{autoRefresh ? 'Auto On' : 'Auto Off'}</span>
            </Button>
            {autoRefresh && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label htmlFor="refresh-interval" className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Interval (s):
                </label>
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
              onClick={checkAllHealth}
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
                      <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-2xl font-bold text-yellow-500">
                          {degradedCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Degraded</div>
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
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-2xl font-bold text-red-500">
                          {unhealthyCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Unhealthy</div>
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

        {/* Service Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="space-y-4"
        >
          {loading ? (
            <>
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
            </>
          ) : services.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No health services configured.</p>
              </CardContent>
            </Card>
          ) : (
            services.map((service, index) => {
              const status = healthStatuses[service.id];
              const serviceStatus = status?.data?.status || null;
              const isHealthy = serviceStatus === 'healthy';
              const isRefreshing = refreshing.has(service.id);

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-4 sm:p-6">
                      {/* Service Header */}
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <div 
                              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${status?.data?.status === 'healthy' ? '#10b981' : status?.data?.status === 'unhealthy' ? '#ef4444' : '#f59e0b'}20` }}
                            >
                              <IconRenderer 
                                iconName={service.icon} 
                                className={`h-6 w-6 ${
                                  status?.data?.status === 'healthy' 
                                    ? 'text-green-500' 
                                    : status?.data?.status === 'unhealthy' 
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
                        
                        <div className="flex flex-row items-end space-x-2 w-full sm:w-auto shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => checkHealth(service)}
                            disabled={isRefreshing}
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
                      {status?.data && !status?.loading && (
                        <div className="mb-4">
                          <MetricCard
                            metrics={getServiceMetrics(status)}
                            gradient={service.color as any || 'blue'}
                            showPattern={true}
                            layout="grid"
                            columns={4}
                          />
                        </div>
                      )}

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
      </div>
    </MainLayout>
  );
}

