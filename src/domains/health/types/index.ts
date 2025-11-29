export interface HealthService {
  id: string;
  serviceTitle: string;
  icon: string;
  color: string;
  healthApi: string;
  healthyJsonPath: string;
  isActive?: boolean;
  monitoringEnabled?: boolean;
  emailTo?: string[];
  emailCC?: string[];
  lastChecked?: string;
  lastEmailSent?: string;
  failCycleToSendEmail?: number; // Number of failed cycles before sending email alert (default: 3)
  emailIntervalMinutes?: number; // Minimum minutes between email alerts (default: 15)
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
  failedCycles?: number;
  firstFailureTime?: string | null;
  emailError?: string | null; // Error message when email sending fails
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | null | undefined;

