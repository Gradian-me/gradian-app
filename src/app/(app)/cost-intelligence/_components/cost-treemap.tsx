'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import type { CostCompositionByPeriod } from '../types';

type Props = {
  data: CostCompositionByPeriod[];
  theme: Record<string, unknown>;
};

export default function CostTreemap({ data, theme }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const totalByCategory: Record<string, number> = {
    Material: 0,
    'Direct Salary': 0,
    'Indirect Salary': 0,
    'Direct Overhead': 0,
    'Indirect Overhead': 0,
  };
  data.forEach((d) => {
    totalByCategory['Material'] += d.material;
    totalByCategory['Direct Salary'] += d.directSalary;
    totalByCategory['Indirect Salary'] += d.indirectSalary;
    totalByCategory['Direct Overhead'] += d.directOverhead;
    totalByCategory['Indirect Overhead'] += d.indirectOverhead;
  });
  const children = Object.entries(totalByCategory).map(([name, value], i) => ({
    name,
    value: Math.round(value),
    itemStyle: { color: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length] },
  }));
  const option = {
    ...baseTheme,
    tooltip: {
      ...(baseTheme.tooltip as object),
      formatter: (params: { value: number; name: string }) =>
        `${params.name}: ${(params.value / 1e6).toFixed(1)}M IRR`,
    },
    series: [
      {
        type: 'treemap' as const,
        left: '2%',
        right: '2%',
        top: '2%',
        bottom: '2%',
        width: '96%',
        height: '96%',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          fontSize: 11,
          formatter: (params: { name: string; value: number }) => `${params.name}\n${(params.value / 1e6).toFixed(1)}M`,
        },
        data: [{ name: 'Cost', children }],
      },
    ],
  };
  return (
    <div className="w-full min-h-[280px]" style={{ height: 320 }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
}
