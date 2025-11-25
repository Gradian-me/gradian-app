import { DashboardStats, SpendAnalysisData, KpiCard } from '../types';
import { apiClient } from '@/gradian-ui/shared/utils/api';
import { API_ENDPOINTS } from '@/gradian-ui/shared/constants';

export interface IDashboardRepository {
  getDashboardStats(): Promise<DashboardStats>;
  getSpendAnalysisData(): Promise<SpendAnalysisData>;
  getKpiCards(): Promise<KpiCard[]>;
  getPerformanceMetrics(): Promise<any>;
  getKpiLists(type?: string): Promise<any[]>;
}

export class DashboardRepository implements IDashboardRepository {
  private baseEndpoint = API_ENDPOINTS.DASHBOARD;

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>(`${this.baseEndpoint}/stats`);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch dashboard stats');
    }
    return response.data;
  }

  async getSpendAnalysisData(): Promise<SpendAnalysisData> {
    const response = await apiClient.get<SpendAnalysisData>(`${this.baseEndpoint}/spend-analysis`);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch spend analysis data');
    }
    return response.data;
  }

  async getKpiCards(): Promise<KpiCard[]> {
    const response = await apiClient.get<KpiCard[]>(`${this.baseEndpoint}/kpi-cards`);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch KPI cards');
    }
    return response.data;
  }

  async getPerformanceMetrics(): Promise<any> {
    const response = await apiClient.get<any>(`${this.baseEndpoint}/performance-metrics`);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch performance metrics');
    }
    return response.data;
  }

  async getKpiLists(type?: string): Promise<any[]> {
    const url = type 
      ? `${this.baseEndpoint}/kpi-lists?type=${encodeURIComponent(type)}`
      : `${this.baseEndpoint}/kpi-lists`;
    const response = await apiClient.get<any[]>(url);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch KPI lists');
    }
    return response.data;
  }
}

export const dashboardRepository = new DashboardRepository();
