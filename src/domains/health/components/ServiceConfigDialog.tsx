'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2, Settings } from 'lucide-react';
import { HealthService } from '../types';

interface ServiceConfigDialogProps {
  serviceId: string;
  service: HealthService | undefined;
  onClose: () => void;
  onEdit: (service: HealthService) => void;
  onDelete: (serviceId: string) => Promise<void>;
  onToggleMonitoring: (serviceId: string, enabled: boolean) => Promise<void>;
}

export function ServiceConfigDialog({
  serviceId,
  service,
  onClose,
  onEdit,
  onDelete,
  onToggleMonitoring,
}: ServiceConfigDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={!!service} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Service</DialogTitle>
          <DialogDescription>
            {service.serviceTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Monitoring</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Enable health checks for this service
              </div>
            </div>
            <Switch
              checked={service.monitoringEnabled !== false}
              onCheckedChange={(checked) => {
                onToggleMonitoring(service.id, checked);
                onClose();
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onEdit(service);
                onClose();
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Service
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(service.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Service Details</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ID:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono">{service.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">API:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono text-xs truncate max-w-[200px]">
                  {service.healthApi}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status Path:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono">{service.healthyJsonPath}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
