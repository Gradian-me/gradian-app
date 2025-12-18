import { useState, useCallback } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { toast } from 'sonner';
import { HealthService, ServiceHealthStatus } from '../types';

export interface UseHealthServiceReturn {
  // Form state
  showServiceForm: boolean;
  editingService: HealthService | null;
  formData: Partial<HealthService>;
  
  // Actions
  openNewServiceForm: () => void;
  openEditServiceForm: (service: HealthService) => void;
  closeServiceForm: () => void;
  setFormData: (data: Partial<HealthService>) => void;
  saveService: (
    services: HealthService[],
    healthStatuses: Record<string, ServiceHealthStatus>,
    checkHealth: (service: HealthService) => Promise<void>
  ) => Promise<{ success: boolean; service?: HealthService }>;
  deleteService: (serviceId: string, onDelete: (id: string) => void) => Promise<void>;
}

export const useHealthService = (): UseHealthServiceReturn => {
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<HealthService | null>(null);
  const [formData, setFormData] = useState<Partial<HealthService>>({
    id: '',
    serviceTitle: '',
    icon: 'Activity',
    color: 'blue',
    healthApi: '',
    healthyJsonPath: 'status',
    monitoringEnabled: true,
    isActive: true,
    failCycleToSendEmail: 3,
  });

  const openNewServiceForm = useCallback(() => {
    setFormData({
      id: '',
      serviceTitle: '',
      icon: 'Activity',
      color: 'blue',
      healthApi: '',
      healthyJsonPath: 'status',
      monitoringEnabled: true,
      isActive: true,
      emailTo: [],
      emailCC: [],
      failCycleToSendEmail: 3,
      emailIntervalMinutes: 15,
    });
    setEditingService(null);
    setShowServiceForm(true);
  }, []);

  const openEditServiceForm = useCallback((service: HealthService) => {
    setFormData({
      id: service.id,
      serviceTitle: service.serviceTitle,
      icon: service.icon,
      color: service.color,
      healthApi: service.healthApi,
      healthyJsonPath: service.healthyJsonPath,
      monitoringEnabled: service.monitoringEnabled !== false,
      isActive: service.isActive !== false,
      emailTo: service.emailTo || [],
      emailCC: service.emailCC || [],
      failCycleToSendEmail: service.failCycleToSendEmail ?? 3,
      emailIntervalMinutes: service.emailIntervalMinutes ?? 15,
    });
    setEditingService(service);
    setShowServiceForm(true);
  }, []);

  const closeServiceForm = useCallback(() => {
    setShowServiceForm(false);
    setEditingService(null);
  }, []);

  const saveService = useCallback(async (
    services: HealthService[],
    healthStatuses: Record<string, ServiceHealthStatus>,
    checkHealth: (service: HealthService) => Promise<void>
  ): Promise<{ success: boolean; service?: HealthService }> => {
    try {
      // Validation
      if (!formData.id || !formData.serviceTitle || !formData.healthApi) {
        toast.error('Please fill in all required fields');
        return { success: false };
      }

      // Check if ID already exists (for new services)
      if (!editingService && services.find(s => s.id === formData.id)) {
        toast.error(`Service with ID "${formData.id}" already exists`);
        return { success: false };
      }

      const serviceData: HealthService = {
        id: formData.id!,
        serviceTitle: formData.serviceTitle!,
        icon: formData.icon || 'Activity',
        color: formData.color || 'blue',
        healthApi: formData.healthApi!,
        healthyJsonPath: formData.healthyJsonPath || 'status',
        monitoringEnabled: formData.monitoringEnabled !== false,
        isActive: formData.isActive !== false,
        emailTo: formData.emailTo && formData.emailTo.length > 0 ? formData.emailTo : undefined,
        emailCC: formData.emailCC && formData.emailCC.length > 0 ? formData.emailCC : undefined,
        failCycleToSendEmail: formData.failCycleToSendEmail ?? 3,
        emailIntervalMinutes: formData.emailIntervalMinutes ?? 15,
      };

      const response = editingService
        ? await apiRequest(`/api/data/health`, {
            method: 'PUT',
            body: serviceData,
            callerName: 'useHealthService.saveService.update',
          })
        : await apiRequest(`/api/data/health`, {
            method: 'POST',
            body: serviceData,
            callerName: 'useHealthService.saveService.create',
          });

      if (response.success) {
        toast.success(editingService ? 'Service updated successfully' : 'Service created successfully');
        closeServiceForm();
        return { success: true, service: serviceData };
      } else {
        toast.error(response.error || 'Failed to save service');
        return { success: false };
      }
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
      return { success: false };
    }
  }, [formData, editingService, closeServiceForm]);

  const deleteService = useCallback(async (serviceId: string, onDelete: (id: string) => void) => {
    if (!confirm(`Are you sure you want to delete service "${serviceId}"?`)) {
      return;
    }

    try {
      const response = await apiRequest(`/api/data/health?id=${serviceId}`, {
        method: 'DELETE',
        callerName: 'useHealthService.deleteService',
      });

      if (response.success) {
        toast.success('Service deleted successfully');
        onDelete(serviceId);
      } else {
        toast.error(response.error || 'Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  }, []);

  return {
    showServiceForm,
    editingService,
    formData,
    openNewServiceForm,
    openEditServiceForm,
    closeServiceForm,
    setFormData,
    saveService,
    deleteService,
  };
};

