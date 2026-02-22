'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import type { UnitCostTrendPoint } from '../types';

type Props = {
  data: UnitCostTrendPoint[];
  theme: Record<string, unknown>;
};

export default function CostMultiLine({ data, theme }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const periods = Array.from(new Set(data.map((d) => d.periodLabel)));
  const products = Array.from(
    new Map(data.map((d) => [d.productId, d.productName])).entries()
  );
  const series = products.map(([productId, productName], idx) => ({
    name: productName,
    type: 'line' as const,
    smooth: true,
    data: periods.map((p) => {
      const point = data.find((d) => d.periodLabel === p && d.productId === productId);
      return point?.unitCost ?? 0;
    }),
    itemStyle: { color: CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length] },
  }));
  const option = {
    ...baseTheme,
    tooltip: { ...(baseTheme.tooltip as object), trigger: 'axis' as const },
    legend: { ...(baseTheme.legend as object), data: products.map(([, n]) => n), top: '2%' },
    grid: { ...(baseTheme.grid as object), top: '20%', bottom: '12%' },
    xAxis: {
      ...(baseTheme.xAxis as object),
      type: 'category' as const,
      data: periods,
    },
    yAxis: {
      ...(baseTheme.yAxis as object),
      type: 'value' as const,
      name: 'Unit Cost (IRR)',
    },
    series,
  };
  return (
    <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />
  );
}
