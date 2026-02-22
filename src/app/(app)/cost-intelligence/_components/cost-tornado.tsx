'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';

type TornadoItem = { name: string; low: number; high: number };

type Props = {
  data: TornadoItem[];
  theme: Record<string, unknown>;
  title?: string;
};

export default function CostTornado({ data, theme, title }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const option = {
    ...baseTheme,
    title: title ? { ...(baseTheme.title as object), text: title, left: 'center' } : undefined,
    tooltip: { ...(baseTheme.tooltip as object), trigger: 'axis' as const },
    grid: { ...(baseTheme.grid as object), top: title ? '18%' : '12%', bottom: '15%', left: '18%', right: '10%' },
    xAxis: {
      ...(baseTheme.xAxis as object),
      type: 'value' as const,
      name: 'Margin %',
      axisLabel: { formatter: (v: number) => `${v}%` },
      max: (value: { max: number }) => Math.min(100, Math.ceil(value.max / 5) * 5 + 5),
    },
    yAxis: {
      ...(baseTheme.yAxis as object),
      type: 'category' as const,
      data: data.map((d) => d.name),
      inverse: true,
    },
    series: [
      {
        name: 'Margin after +25% ledger shock',
        type: 'bar' as const,
        stack: 'total',
        data: data.map((d) => d.low),
        itemStyle: { color: CHART_COLOR_PALETTE[4] },
      },
      {
        name: 'Margin erosion (pp)',
        type: 'bar' as const,
        stack: 'total',
        data: data.map((d) => d.high),
        itemStyle: { color: CHART_COLOR_PALETTE[2] },
      },
    ],
  };
  return (
    <ReactECharts option={option} style={{ height: 300, width: '100%' }} opts={{ renderer: 'svg' }} />
  );
}
