'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { useHealth, useHealthService } from '../hooks';
import { calculateHealthStats, getServiceMetrics } from '../utils';
import { HealthService } from '../types';
import { HealthPageHeader } from './HealthPageHeader';
import { HealthStatsCards } from './HealthStatsCards';
import { InactiveServicesSummary } from './InactiveServicesSummary';
import { UnhealthyServicesSummary } from './UnhealthyServicesSummary';
import { ServiceCardsList, HealthCardViewMode } from './ServiceCardsList';
import { ServiceFormDialog } from './ServiceFormDialog';
import { ServiceConfigDialog } from './ServiceConfigDialog';
import { HealthViewToggle } from './HealthViewToggle';

export function HealthPage() {
  const {
    services,
    healthStatuses,
    loading,
    refreshing,
    autoRefresh,
    refreshIntervalSeconds,
    timerKey,
    testUnhealthyServices,
    isDemoMode,
    setAutoRefresh,
    setRefreshIntervalSeconds,
    checkHealth,
    checkAllHealth,
    handleTimerComplete,
    toggleTestUnhealthy,
    toggleMonitoring,
    refreshServices,
  } = useHealth();

  const {
    showServiceForm,
    editingService,
    formData,
    openNewServiceForm,
    openEditServiceForm,
    closeServiceForm,
    setFormData,
    saveService,
    deleteService,
  } = useHealthService();

  const [configServiceId, setConfigServiceId] = useState<string | null>(null);
  const [cardViewMode, setCardViewMode] = useState<HealthCardViewMode>('wide');

  const stats = calculateHealthStats(services, healthStatuses, testUnhealthyServices);

  const handleSaveService = async () => {
    const result = await saveService(services, healthStatuses, checkHealth);
    if (result?.success) {
      await refreshServices();
      if (result.service && result.service.monitoringEnabled) {
        await checkHealth(result.service);
      }
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    await deleteService(serviceId, (id) => {
      // Service will be removed by the hook
      refreshServices();
    });
  };

  return (
    <MainLayout title="Health Monitoring">
      <div className="space-y-6">
        <HealthPageHeader
          onNewService={openNewServiceForm}
          autoRefresh={autoRefresh}
          refreshIntervalSeconds={refreshIntervalSeconds}
          timerKey={timerKey}
          onAutoRefreshChange={setAutoRefresh}
          onRefreshIntervalChange={setRefreshIntervalSeconds}
          onRefreshAll={async () => {
            await checkAllHealth(true); // Show toast on manual refresh
          }}
          onTimerComplete={handleTimerComplete}
          refreshing={refreshing.size > 0}
          loading={loading}
        />

        <div className="flex items-center justify-end">
          <HealthViewToggle value={cardViewMode} onChange={setCardViewMode} />
        </div>

        <HealthStatsCards
          loading={loading}
          healthyCount={stats.healthyCount}
          inactiveCount={stats.inactiveCount}
          unhealthyCount={stats.unhealthyCount}
          totalServices={services.length}
        />

        {!loading && stats.inactiveServices.length > 0 && (
          <InactiveServicesSummary services={stats.inactiveServices} />
        )}

        {!loading && stats.unhealthyServices.length > 0 && (
          <UnhealthyServicesSummary
            services={stats.unhealthyServices}
            healthStatuses={healthStatuses}
            testUnhealthyServices={testUnhealthyServices}
          />
        )}

        <ServiceCardsList
          services={services}
          healthStatuses={healthStatuses}
          testUnhealthyServices={testUnhealthyServices}
          isDemoMode={isDemoMode}
          loading={loading}
          refreshing={refreshing}
          onEditService={openEditServiceForm}
          onConfigureService={setConfigServiceId}
          onCheckHealth={checkHealth}
          onToggleTestUnhealthy={toggleTestUnhealthy}
          onToggleMonitoring={toggleMonitoring}
          getServiceMetrics={(status, serviceId) =>
            getServiceMetrics(status, serviceId, testUnhealthyServices)
          }
          viewMode={cardViewMode}
        />

        <ServiceFormDialog
          isOpen={showServiceForm}
          onClose={closeServiceForm}
          editingService={editingService}
          formData={formData}
          onFormDataChange={setFormData}
          onSave={handleSaveService}
        />

        {configServiceId && (
          <ServiceConfigDialog
            serviceId={configServiceId}
            service={services.find(s => s.id === configServiceId)}
            onClose={() => setConfigServiceId(null)}
            onEdit={openEditServiceForm}
            onDelete={handleDeleteService}
            onToggleMonitoring={toggleMonitoring}
            onToggleTestUnhealthy={toggleTestUnhealthy}
            isDemoMode={isDemoMode}
            isTestUnhealthy={testUnhealthyServices.has(configServiceId)}
          />
        )}
      </div>
    </MainLayout>
  );
}

