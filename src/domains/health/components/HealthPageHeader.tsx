'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CircularProgress } from '@/gradian-ui/analytics/indicators/kpi-list/components/CircularProgress';
import { Activity, RefreshCw, Plus } from 'lucide-react';

interface HealthPageHeaderProps {
  onNewService: () => void;
  autoRefresh: boolean;
  refreshIntervalSeconds: number;
  timerKey: number;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefreshIntervalChange: (seconds: number) => void;
  onRefreshAll: () => Promise<void>;
  onTimerComplete: () => void;
  refreshing: boolean;
  loading: boolean;
}

export function HealthPageHeader({
  onNewService,
  autoRefresh,
  refreshIntervalSeconds,
  timerKey,
  onAutoRefreshChange,
  onRefreshIntervalChange,
  onRefreshAll,
  onTimerComplete,
  refreshing,
  loading,
}: HealthPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Health Monitoring</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Monitor the health and status of all services</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
        <Button
          variant="default"
          size="sm"
          onClick={onNewService}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Service
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={onAutoRefreshChange}
            />
            <Label 
              htmlFor="auto-refresh" 
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <Activity className={`h-4 w-4 ${autoRefresh ? 'animate-pulse text-violet-500' : 'text-gray-400'}`} />
              <span>Auto Refresh</span>
            </Label>
          </div>
        </div>
        {autoRefresh && refreshIntervalSeconds > 0 && (
          <div className="flex items-center gap-2">
            <CircularProgress
              key={timerKey}
              duration={refreshIntervalSeconds}
              isPlaying={autoRefresh}
              isTimer={true}
              size={40}
              strokeWidth={4}
              onComplete={() => {
                // Trigger health check when timer completes
                onTimerComplete();
              }}
              color={['#7C3AED', '#F97316', '#FACC15', '#EF4444']}
            />
          </div>
        )}
        {autoRefresh && (
          <div className="flex items-center gap-2">
            <Label htmlFor="refresh-interval" className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Interval (s):
            </Label>
            <Input
              id="refresh-interval"
              type="number"
              min="1"
              max="3600"
              value={refreshIntervalSeconds}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value > 0) {
                  onRefreshIntervalChange(value);
                }
              }}
              className="w-20 h-9"
              disabled={!autoRefresh}
            />
          </div>
        )}
        <Button
          variant="outline"
          onClick={onRefreshAll}
          disabled={loading || refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh All</span>
          <span className="sm:hidden">Refresh</span>
        </Button>
      </div>
    </motion.div>
  );
}

