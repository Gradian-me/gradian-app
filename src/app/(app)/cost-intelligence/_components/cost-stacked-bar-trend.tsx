'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import type { CostCompositionByPeriod } from '../types';

type Props = {
  data: CostCompositionByPeriod[];
  theme: Record<string, unknown>;
};

const STACK_KEYS = [
  { key: 'material', name: 'Material', color: CHART_COLOR_PALETTE[0] },
  { key: 'directSalary', name: 'Direct Salary', color: CHART_COLOR_PALETTE[1] },
  { key: 'indirectSalary', name: 'Indirect Salary', color: CHART_COLOR_PALETTE[2] },
  { key: 'directOverhead', name: 'Direct Overhead', color: CHART_COLOR_PALETTE[3] },
  { key: 'indirectOverhead', name: 'Indirect Overhead', color: CHART_COLOR_PALETTE[4] },
] as const;

export default function CostStackedBarTrend({ data, theme }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const option = {
    ...baseTheme,
    tooltip: {
      ...(baseTheme.tooltip as object),
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
    },
    legend: {
      ...(baseTheme.legend as object),
      data: STACK_KEYS.map((k) => k.name),
      top: '2%',
    },
    grid: { ...(baseTheme.grid as object), top: '20%', bottom: '12%' },
    xAxis: {
      ...(baseTheme.xAxis as object),
      type: 'category' as const,
      data: data.map((d) => d.periodLabel),
    },
    yAxis: {
      ...(baseTheme.yAxis as object),
      type: 'value' as const,
      name: 'IRR',
    },
    series: STACK_KEYS.map((k) => ({
      name: k.name,
      type: 'bar' as const,
      stack: 'total',
      data: data.map((d) => (d[k.key] as number) ?? 0),
      itemStyle: { color: k.color },
    })),
  };
  return (
    <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />
  );
}
