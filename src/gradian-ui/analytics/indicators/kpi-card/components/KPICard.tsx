'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  delay = 0 
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -2, scale: 1.005 }}
      className="group"
    >
      <Card 
        className="relative h-auto overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-300"
        style={{ height: '-webkit-fill-available' }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
            {title}
          </CardTitle>
          <div className="p-2 rounded-xl bg-violet-600 text-white shadow-sm group-hover:bg-violet-700 transition-all duration-300">
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-baseline space-x-3">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-violet-900 dark:group-hover:text-violet-200 transition-colors">
              {value}
            </div>
            {trend && (
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                trend.isPositive 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' 
                  : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
              }`}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
              {subtitle}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

