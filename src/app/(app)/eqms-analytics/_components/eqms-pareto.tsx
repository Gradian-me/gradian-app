'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import { EqmsAnalyticsData } from '../types';

type Props = {
  data: EqmsAnalyticsData['paretoRootCauses'];
  theme: Record<string, any>;
};

export default function EqmsPareto({ data, theme }: Props) {
  const baseTheme = theme as Record<string, any>;
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, item) => sum + item.count, 0);
  const cumulative = sorted.map((item, idx) => {
    const sum = sorted.slice(0, idx + 1).reduce((acc, d) => acc + d.count, 0);
    return Math.round((sum / total) * 100);
  });

  const option = {
    ...baseTheme,
    tooltip: {
      ...baseTheme.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { ...baseTheme.grid, top: '16%', bottom: '18%' },
    xAxis: [
      {
        ...baseTheme.xAxis,
        type: 'category',
        data: sorted.map(d => d.cause),
        axisLabel: { interval: 0, rotate: 20 },
      },
    ],
    yAxis: [
      { ...baseTheme.yAxis, type: 'value', name: 'Count' },
      { ...baseTheme.yAxis, type: 'value', name: 'Cumulative %', max: 100 },
    ],
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: sorted.map(d => d.count),
        itemStyle: { color: CHART_COLOR_PALETTE[0], borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Cumulative %',
        type: 'line',
        yAxisIndex: 1,
        data: cumulative,
        smooth: true,
        itemStyle: { color: CHART_COLOR_PALETTE[3] },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />;
}

