import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DashboardStats, SpendAnalysisData, KpiCard } from '../domains/dashboard/types';
import { dashboardService } from '../domains/dashboard/services/dashboard.service';
import { LoadingState } from '@/gradian-ui/shared/types/common';
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';

interface DashboardState extends LoadingState {
  stats: DashboardStats | null;
  spendAnalysisData: SpendAnalysisData | null;
  kpiCards: KpiCard[];
  performanceMetrics: any;
  filters: any;
}

interface DashboardActions {
  // Data fetching
  fetchDashboardStats: (filters?: any) => Promise<void>;
  fetchSpendAnalysisData: (filters?: any) => Promise<void>;
  fetchKpiCards: () => Promise<void>;
  fetchPerformanceMetrics: () => Promise<void>;
  
  // State management
  setFilters: (filters: any) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState: DashboardState = {
  stats: null,
  spendAnalysisData: null,
  kpiCards: [],
  performanceMetrics: null,
  filters: {},
  isLoading: false,
  error: null,
};

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchDashboardStats: async (filters?: any) => {
        set({ isLoading: true, error: null });
        
        try {
          const stats = await dashboardService.getDashboardStats(filters);
          // Sanitize stats before storing
          const sanitizedStats = stats ? sanitizeNestedData(stats) : null;
          set({
            stats: sanitizedStats,
            filters: filters || {},
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
            isLoading: false,
          });
        }
      },

      fetchSpendAnalysisData: async (filters?: any) => {
        set({ isLoading: true, error: null });
        
        try {
          const spendAnalysisData = await dashboardService.getSpendAnalysisData(filters);
          // Sanitize data before storing
          const sanitizedData = spendAnalysisData ? sanitizeNestedData(spendAnalysisData) : null;
          set({
            spendAnalysisData: sanitizedData,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch spend analysis data',
            isLoading: false,
          });
        }
      },

      fetchKpiCards: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const kpiCards = await dashboardService.getKpiCards();
          // Sanitize KPI cards before storing
          const sanitizedCards = kpiCards ? sanitizeNestedData(kpiCards) : null;
          set({
            kpiCards: sanitizedCards || [],
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch KPI cards',
            isLoading: false,
          });
        }
      },

      fetchPerformanceMetrics: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const performanceMetrics = await dashboardService.getPerformanceMetrics();
          // Sanitize metrics before storing
          const sanitizedMetrics = performanceMetrics ? sanitizeNestedData(performanceMetrics) : null;
          set({
            performanceMetrics: sanitizedMetrics,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch performance metrics',
            isLoading: false,
          });
        }
      },

      setFilters: (filters: any) => {
        // Sanitize filters before storing
        const sanitizedFilters = filters ? sanitizeNestedData(filters) : {};
        set({ filters: sanitizedFilters });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set(initialState);
      },
    }),
    getZustandDevToolsConfig<DashboardState & DashboardActions>('dashboard-store')
  )
);
