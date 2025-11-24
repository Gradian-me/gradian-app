import type { MetricItem } from '@/gradian-ui/analytics/indicators/metric-card/types';
import { ServiceHealthStatus, HealthService } from '../types';
import { formatUptime } from '@/gradian-ui/shared/utils/time-utils';

/**
 * Calculate metrics for a service based on its health status
 */
export const getServiceMetrics = (
  status: ServiceHealthStatus,
  serviceId: string,
  testUnhealthyServices: Set<string>
): MetricItem[] => {
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

/**
 * Calculate health statistics from services and statuses
 */
export const calculateHealthStats = (
  services: HealthService[],
  healthStatuses: Record<string, ServiceHealthStatus>,
  testUnhealthyServices: Set<string>
) => {
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

  const unhealthyServices = activeServices.filter(service => {
    const status = healthStatuses[service.id];
    const actualStatus = status?.data?.status;
    const isTestUnhealthy = testUnhealthyServices.has(service.id);
    // Only include truly unhealthy services, not degraded ones
    return isTestUnhealthy || actualStatus === 'unhealthy';
  });

  const inactiveServices = services.filter(service => service.monitoringEnabled === false);

  return {
    activeServices,
    inactiveCount,
    healthyCount,
    unhealthyCount,
    unhealthyServices,
    inactiveServices,
  };
};

