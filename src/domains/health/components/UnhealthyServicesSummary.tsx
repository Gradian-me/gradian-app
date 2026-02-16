'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { IconBox } from '@/gradian-ui/form-builder/form-elements';
import { HealthService, ServiceHealthStatus } from '../types';
import { scrollToService } from '../utils';

interface UnhealthyServicesSummaryProps {
  services: HealthService[];
  healthStatuses: Record<string, ServiceHealthStatus>;
  testUnhealthyServices: Set<string>;
}

export function UnhealthyServicesSummary({
  services,
  healthStatuses,
  testUnhealthyServices,
}: UnhealthyServicesSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Unhealthy Services ({services.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {services.map((service) => {
          const status = healthStatuses[service.id];
          const actualStatus = status?.data?.status;
          const isTestUnhealthy = testUnhealthyServices.has(service.id);
          const serviceStatus = isTestUnhealthy ? 'unhealthy' : actualStatus;
          const isUnhealthy = serviceStatus === 'unhealthy';
          
          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 bg-red-50/50 dark:bg-red-950/20"
                onClick={() => scrollToService(service.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <IconBox
                          name={service.icon}
                          color={isUnhealthy ? 'red' : 'amber'}
                          variant="flat"
                          size="sm"
                        />
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {service.serviceTitle}
                        </h4>
                      </div>
                      <Badge 
                        variant={isUnhealthy ? 'destructive' : 'default'}
                        className={`font-bold text-xs ${
                          isUnhealthy 
                            ? 'bg-red-600 text-white dark:bg-red-700' 
                            : 'bg-yellow-500 text-white dark:bg-yellow-600'
                        }`}
                      >
                        {isUnhealthy ? 'UNHEALTHY' : 'DEGRADED'}
                      </Badge>
                      {status?.data?.responseTime !== undefined && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          Response: {status.data.responseTime}ms
                        </div>
                      )}
                      {status?.error && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 truncate">
                          {status.error}
                        </div>
                      )}
                    </div>
                    <AlertCircle className={`h-5 w-5 shrink-0 ${isUnhealthy ? 'text-red-500' : 'text-yellow-500'}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

