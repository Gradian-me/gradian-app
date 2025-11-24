export interface HealthService {
  id: string;
  serviceTitle: string;
  icon: string;
  color: string;
  healthApi: string;
  healthyJsonPath: string;
  isActive?: boolean;
  monitoringEnabled?: boolean;
}

export interface HealthCheckResponse {
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

export interface ServiceHealthStatus {
  service: HealthService;
  data: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  lastChecked: string | null;
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | null | undefined;

