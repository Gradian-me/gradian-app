'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/gradian-ui/layout/components';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card/components/MetricCard';
import { PingOnChange } from '@/gradian-ui/layout/ping-on-change';
import { RefreshCw, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { HealthService, ServiceHealthStatus } from '../types';
import type { MetricItem } from '@/gradian-ui/analytics/indicators/metric-card/types';
import { getStatusColor, getStatusText, getStatusIcon } from '../utils';
import { formatDateTimeWithFallback } from '@/gradian-ui/shared/utils/date-utils';
import { cn } from '@/gradian-ui/shared/utils';

export type HealthCardViewMode = 'wide' | 'compact';

interface ServiceCardsListProps {
  services: HealthService[];
  healthStatuses: Record<string, ServiceHealthStatus>;
  testUnhealthyServices: Set<string>;
  isDemoMode: boolean;
  loading: boolean;
  refreshing: Set<string>;
  onEditService: (service: HealthService) => void;
  onConfigureService: (serviceId: string) => void;
  onCheckHealth: (service: HealthService) => Promise<void>;
  onToggleTestUnhealthy: (serviceId: string, enabled: boolean) => void;
  onToggleMonitoring: (serviceId: string, enabled: boolean) => Promise<void>;
  getServiceMetrics: (status: ServiceHealthStatus, serviceId: string) => MetricItem[];
  viewMode?: HealthCardViewMode;
}

export function ServiceCardsList({
  services,
  healthStatuses,
  testUnhealthyServices,
  isDemoMode,
  loading,
  refreshing,
  onEditService,
  onConfigureService,
  onCheckHealth,
  onToggleTestUnhealthy,
  onToggleMonitoring,
  getServiceMetrics,
  viewMode = 'wide',
}: ServiceCardsListProps) {
  const prevStatusesRef = useRef<Record<string, ServiceHealthStatus>>({});

  // Function to get raw metric values for ping tracking
  const getMetricValueForPing = (metricId: string, status: ServiceHealthStatus, isTestUnhealthy: boolean): any => {
    if (!status?.data) return null;
    switch (metricId) {
      case 'status':
        // Track the actual status value (healthy/unhealthy/degraded)
        // Include testUnhealthy in the value to ping when toggled
        return `${status.data.status}-${isTestUnhealthy}`;
      case 'responseTime':
        // Ensure we return a number (0 if undefined/null) to properly track changes
        return status.data.responseTime ?? 0;
      case 'uptime':
        // Round uptime to minutes to avoid pinging on every second change
        // Only ping when the minute value actually changes
        return Math.floor((status.data.uptime || 0) / 60);
      case 'version':
        return status.data.version || '';
      default:
        return null;
    }
  };

  // Function to get ping color based on metric
  const getPingColorForMetric = (metric: MetricItem): 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'gray' => {
    if (metric.iconColor === 'green') return 'green';
    if (metric.iconColor === 'red') return 'red';
    if (metric.iconColor === 'yellow') return 'yellow';
    return 'blue';
  };

  if (loading) {
    return <LoadingSkeleton variant="card-list" count={1} />;
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No health services configured.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className={viewMode === 'compact' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}
    >
      {services.map((service, index) => {
        const status = healthStatuses[service.id];
        const actualStatus = status?.data?.status || null;
        const isTestUnhealthy = testUnhealthyServices.has(service.id);
        const serviceStatus = isTestUnhealthy ? 'unhealthy' : actualStatus;
        const isHealthy = serviceStatus === 'healthy';
        const isRefreshing = refreshing.has(service.id);
        const isMonitoringDisabled = service.monitoringEnabled === false;
        const StatusIcon = getStatusIcon(serviceStatus);

        if (viewMode === 'compact') {
          return (
            <motion.div
              key={service.id}
              id={`service-card-${service.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
              className="scroll-mt-4 transition-all duration-300"
            >
              <Card className={`hover:shadow-md transition-shadow duration-200 ${isMonitoringDisabled ? 'opacity-60 bg-gray-50 dark:bg-gray-900/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{service.serviceTitle}</p>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{service.id}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            variant={getStatusColor(serviceStatus)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {getStatusText(serviceStatus)}
                          </Badge>
                          {status?.lastChecked && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Checked {formatDateTimeWithFallback(status.lastChecked)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onConfigureService(service.id)}
                        className="border border-gray-200 dark:border-gray-800"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => onCheckHealth(service)}
                        disabled={isRefreshing || isMonitoringDisabled}
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {status?.error && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 dark:text-red-300">{status.error}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        }

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
                        <PingOnChange 
                          value={serviceStatus} 
                          color={serviceStatus === 'healthy' ? 'green' : serviceStatus === 'unhealthy' ? 'red' : 'yellow'}
                        >
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
                            <StatusIcon className="h-4 w-4" />
                            <span>{getStatusText(serviceStatus)}</span>
                          </Badge>
                        </PingOnChange>
                      </div>
                    </div>
                    
                    {status?.lastChecked ? (
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Last checked: {formatDateTimeWithFallback(status.lastChecked)}
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="flex flex-row items-end gap-2 w-full sm:w-auto shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onConfigureService(service.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Configure</span>
                      <span className="sm:hidden">Config</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCheckHealth(service)}
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
                      <span className="text-sm font-medium">Monitoring is disabled for this service</span>
                    </div>
                  </div>
                ) : status?.data ? (
                  <div className="mb-4">
                    <MetricCard
                      metrics={getServiceMetrics(status, service.id)}
                      gradient={service.color as any || 'blue'}
                      showPattern={true}
                      layout="grid"
                      columns={4}
                      pingOnChange={true}
                      getMetricValue={(metricId) => getMetricValueForPing(metricId, status, isTestUnhealthy)}
                      getPingColor={getPingColorForMetric}
                    />
                  </div>
                ) : null}

                {/* Health Checks Details */}
                {status?.data?.checks && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Component Checks
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {Object.entries(status.data.checks).map(([checkName, check]) => {
                        return (
                          <div
                            key={checkName}
                            className={`p-3 rounded-lg border ${
                              check.status === 'healthy'
                                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                : check.status === 'unhealthy'
                                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                                : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                                {checkName}
                              </div>
                              {check.status === 'healthy' ? (
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <AlertCircle
                                  className={`h-4 w-4 shrink-0 ${
                                    check.status === 'unhealthy' ? 'text-red-500' : 'text-yellow-500'
                                  }`}
                                />
                              )}
                            </div>
                            {check.message && (
                              <div
                                className={`text-xs mt-1 ${
                                  check.status === 'healthy'
                                    ? 'text-green-700 dark:text-green-300'
                                    : check.status === 'unhealthy'
                                    ? 'text-red-700 dark:text-red-300'
                                    : 'text-yellow-700 dark:text-yellow-300'
                                }`}
                              >
                                {check.message}
                              </div>
                            )}
                            {check.responseTime !== undefined && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {check.responseTime}ms
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
