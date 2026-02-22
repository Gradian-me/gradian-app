'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import type { OverheadCategoryByPeriod } from '../types';

type Props = {
  data: OverheadCategoryByPeriod[];
  ledgerNames: string[];
  theme: Record<string, unknown>;
};

export default function CostStackedArea({ data, ledgerNames, theme }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const option = {
    ...baseTheme,
    tooltip: { ...(baseTheme.tooltip as object), trigger: 'axis' as const },
    legend: {
      ...(baseTheme.legend as object),
      data: ledgerNames,
      top: '2%',
    },
    grid: { ...(baseTheme.grid as object), top: '20%', bottom: '12%' },
    xAxis: {
      ...(baseTheme.xAxis as object),
      type: 'category' as const,
      boundaryGap: false,
      data: data.map((d) => d.periodLabel as string),
    },
    yAxis: { ...(baseTheme.yAxis as object), type: 'value' as const },
    series: ledgerNames.map((name, idx) => ({
      name,
      type: 'line' as const,
      smooth: true,
      stack: 'total',
      areaStyle: {
        color: `${CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length]}33`,
      },
      data: data.map((d) => (typeof d[name] === 'number' ? (d[name] as number) : 0)),
    })),
  };
  return (
    <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />
  );
}
