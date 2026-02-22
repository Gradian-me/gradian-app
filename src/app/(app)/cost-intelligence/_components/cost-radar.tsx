'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';

type RadarDatum = { name: string; value: number };

type Props = {
  data: RadarDatum[];
  theme: Record<string, unknown>;
  title?: string;
};

export default function CostRadar({ data, theme, title = 'Overhead Structure' }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const maxVal = Math.max(...data.map((d) => d.value), 1) * 1.2;
  const option = {
    ...baseTheme,
    title: {
      ...(baseTheme.title as object),
      text: title,
      left: 'center',
      top: '2%',
    },
    radar: {
      indicator: data.map((d) => ({ name: d.name, max: maxVal })),
      splitArea: { show: true },
      center: ['50%', '55%'],
      radius: '60%',
    },
    tooltip: { ...(baseTheme.tooltip as object), trigger: 'item' as const },
    series: [
      {
        type: 'radar' as const,
        areaStyle: { color: CHART_COLOR_PALETTE[3] + '33' },
        lineStyle: { color: CHART_COLOR_PALETTE[3], width: 2 },
        data: [{ value: data.map((d) => d.value), name: 'Value' }],
      },
    ],
  };
  return (
    <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />
  );
}
