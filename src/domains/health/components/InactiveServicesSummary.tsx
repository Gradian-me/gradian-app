'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Power } from 'lucide-react';
import { IconBox } from '@/gradian-ui/form-builder/form-elements';
import { HealthService } from '../types';
import { scrollToService } from '../utils';

interface InactiveServicesSummaryProps {
  services: HealthService[];
}

export function InactiveServicesSummary({ services }: InactiveServicesSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <Power className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Inactive Services ({services.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {services.map((service) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50 opacity-60"
              onClick={() => scrollToService(service.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <IconBox
                        name={service.icon}
                        color="gray"
                        variant="flat"
                        size="sm"
                      />
                      <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400 truncate">
                        {service.serviceTitle}
                      </h4>
                    </div>
                    <Badge 
                      variant="outline"
                      className="font-bold text-xs bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                    >
                      INACTIVE
                    </Badge>
                  </div>
                  <Power className="h-5 w-5 shrink-0 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

