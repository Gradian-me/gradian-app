'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calculator,
  Package,
  Percent,
  PieChart,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type { CostIntelligenceKpis } from '../types';

type Props = {
  kpis: CostIntelligenceKpis;
};

/** Per-KPI color and icon: tailwind text/background/border classes for icon and left accent */
const KPI_COLORS = [
  { icon: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-l-blue-500' },
  { icon: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-l-emerald-500' },
  { icon: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10 dark:bg-violet-500/20', border: 'border-l-violet-500' },
  { icon: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-l-amber-500' },
  { icon: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-l-rose-500' },
  { icon: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', border: 'border-l-cyan-500' },
] as const;

const items: Array<{
  key: keyof CostIntelligenceKpis;
  label: string;
  icon: typeof Calculator;
  format: (v: number) => string;
}> = [
  {
    key: 'totalAbsorbedCostIRR',
    label: 'Total Absorbed Cost (IRR)',
    icon: Calculator,
    format: (v) => (v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`),
  },
  {
    key: 'unitCost',
    label: 'Unit Cost',
    icon: Package,
    format: (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v)),
  },
  {
    key: 'grossMarginPct',
    label: 'Gross Margin %',
    icon: Percent,
    format: (v) => `${v}%`,
  },
  {
    key: 'overheadAbsorptionRatePct',
    label: 'Overhead Absorption %',
    icon: PieChart,
    format: (v) => `${v}%`,
  },
  {
    key: 'fxExposurePct',
    label: 'FX Exposure %',
    icon: TrendingUp,
    format: (v) => `${v}%`,
  },
  {
    key: 'costVolatilityIndex',
    label: 'Cost Volatility Index',
    icon: Activity,
    format: (v) => `${v}`,
  },
];

export function CostKpiCards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        const value = kpis[item.key];
        const display = typeof value === 'number' ? item.format(value) : String(value ?? '—');
        const colors = KPI_COLORS[index % KPI_COLORS.length];
        return (
          <Card key={item.key} className={`border-l-4 ${colors.border}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {item.label}
              </CardTitle>
              <span className={`rounded-md p-1.5 ${colors.bg}`}>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{display}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
