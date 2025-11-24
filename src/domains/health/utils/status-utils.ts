import { AlertCircle, CheckCircle, Clock, LucideIcon } from 'lucide-react';
import { HealthStatus } from '../types';

/**
 * Get badge color variant for health status
 */
export const getStatusColor = (status: HealthStatus): 'success' | 'destructive' | 'warning' | 'default' => {
  if (!status) return 'default';
  if (status === 'healthy') return 'success';
  if (status === 'unhealthy') return 'destructive';
  return 'warning';
};

/**
 * Get icon component for health status
 * Returns the Lucide icon component that can be rendered in JSX
 */
export const getStatusIcon = (status: HealthStatus): LucideIcon => {
  if (!status) return Clock;
  if (status === 'healthy') return CheckCircle;
  return AlertCircle;
};

/**
 * Get human-readable text for health status
 */
export const getStatusText = (status: HealthStatus): string => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

