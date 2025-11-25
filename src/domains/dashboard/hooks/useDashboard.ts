import { useCallback } from 'react';
import { useDashboardStore } from '../../../stores/dashboard.store';

export const useDashboard = () => {
  const {
    stats,
    spendAnalysisData,
    kpiCards,
    performanceMetrics,
    filters,
    isLoading,
    error,
    fetchDashboardStats,
    fetchSpendAnalysisData,
    fetchKpiCards,
    fetchPerformanceMetrics,
    setFilters,
    clearError,
    reset,
  } = useDashboardStore();

  const handleFetchDashboardStats = useCallback(
    (newFilters?: any) => {
      return fetchDashboardStats(newFilters);
    },
    [fetchDashboardStats]
  );

  const handleFetchSpendAnalysisData = useCallback(
    (newFilters?: any) => {
      return fetchSpendAnalysisData(newFilters);
    },
    [fetchSpendAnalysisData]
  );

  const handleSetFilters = useCallback(
    (newFilters: any) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return {
    // State
    stats,
    spendAnalysisData,
    kpiCards,
    performanceMetrics,
    filters,
    isLoading,
    error,
    
    // Actions
    fetchDashboardStats: handleFetchDashboardStats,
    fetchSpendAnalysisData: handleFetchSpendAnalysisData,
    fetchKpiCards,
    fetchPerformanceMetrics,
    setFilters: handleSetFilters,
    clearError: handleClearError,
    reset: handleReset,
  };
};
