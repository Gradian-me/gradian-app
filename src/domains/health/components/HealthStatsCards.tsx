'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface HealthStatsCardsProps {
  loading: boolean;
  healthyCount: number;
  inactiveCount: number;
  unhealthyCount: number;
  totalServices: number;
}

export function HealthStatsCards({
  loading,
  healthyCount,
  inactiveCount,
  unhealthyCount,
  totalServices,
}: HealthStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-2xl font-bold text-green-500">
                  {healthyCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Healthy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-2xl font-bold text-gray-400">
                  {inactiveCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Inactive</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className={unhealthyCount > 0 ? 'bg-red-100 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {unhealthyCount > 0 ? (
                <div className="relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                  <AlertCircle className="relative h-5 w-5 text-red-600 dark:text-red-500 shrink-0" />
                </div>
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              )}
              <div className="min-w-0">
                <div className={`text-2xl font-bold ${unhealthyCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-red-500'}`}>
                  {unhealthyCount}
                </div>
                <div className={`text-sm truncate font-medium ${unhealthyCount > 0 ? 'text-red-800 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>Unhealthy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-2xl font-bold text-blue-500">
                  {totalServices}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Total Services</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

