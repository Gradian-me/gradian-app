'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, TimerReset, Activity, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { EqmsAnalyticsData } from '../types';

type Props = {
  kpis: EqmsAnalyticsData['kpis'];
};

type KpiItem =
  | { key: 'totalRecords'; label: string; icon: typeof Users; tone: 'default' }
  | { key: 'onTimeClosurePct'; label: string; icon: typeof TimerReset; tone: 'success'; suffix: string }
  | { key: 'overdue'; label: string; icon: typeof AlertTriangle; tone: 'warning' }
  | { key: 'criticalRiskPct'; label: string; icon: typeof Shield; tone: 'danger'; suffix: string }
  | { key: 'avgCycleDays'; label: string; icon: typeof Activity; tone: 'default'; suffix: string }
  | { key: 'customerImpactScore'; label: string; icon: typeof TrendingUp; tone: 'info' };

const items: ReadonlyArray<KpiItem> = [
  { key: 'totalRecords', label: 'Total Records', icon: Users, tone: 'default' },
  { key: 'onTimeClosurePct', label: 'On-Time Closure', icon: TimerReset, tone: 'success', suffix: '%' },
  { key: 'overdue', label: 'Overdue Items', icon: AlertTriangle, tone: 'warning' },
  { key: 'criticalRiskPct', label: 'Critical Risk', icon: Shield, tone: 'danger', suffix: '%' },
  { key: 'avgCycleDays', label: 'Avg Cycle Time', icon: Activity, tone: 'default', suffix: 'd' },
  { key: 'customerImpactScore', label: 'Customer Impact', icon: TrendingUp, tone: 'info' },
];

const toneClass = (tone: typeof items[number]['tone']) => {
  switch (tone) {
    case 'success':
      return 'text-green-600';
    case 'warning':
      return 'text-amber-600';
    case 'danger':
      return 'text-red-600';
    case 'info':
      return 'text-blue-600';
    default:
      return 'text-gray-900 dark:text-gray-100';
  }
};

export function EqmsKpiCards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => {
        const Icon = item.icon;
        const value = kpis[item.key as keyof typeof kpis];
        const suffix = 'suffix' in item ? item.suffix : '';
        const display = typeof value === 'number' ? `${value}${suffix}` : String(value);

        return (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <Icon className={`h-4 w-4 ${toneClass(item.tone)}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${toneClass(item.tone)}`}>{display}</div>
              {item.key === 'onTimeClosurePct' && (
                <p className="text-xs text-green-600">Target: ≥ 90%</p>
              )}
              {item.key === 'criticalRiskPct' && (
                <Badge variant="outline" className="mt-2">Controllable</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

