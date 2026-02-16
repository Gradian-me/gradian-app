'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import { EqmsAnalyticsData } from '../types';

type Props = {
  data: EqmsAnalyticsData['heatmaps']['deviationSeverityProcess'];
  theme: Record<string, any>;
};

export default function EqmsHeatmap({ data, theme }: Props) {
  const baseTheme = theme as Record<string, any>;
  const processes = Array.from(new Set(data.map(d => d.process)));
  const severities = Array.from(new Set(data.map(d => d.severity)));

  const seriesData = data.map(item => [
    processes.indexOf(item.process),
    severities.indexOf(item.severity),
    item.count,
  ]);

  const option = {
    ...baseTheme,
    tooltip: {
      ...baseTheme.tooltip,
      formatter: (params: any) =>
        `${severities[params.value[1]]} · ${processes[params.value[0]]}: ${params.value[2]} occurrences`,
    },
    grid: { ...baseTheme.grid, top: '12%', bottom: '12%' },
    xAxis: {
      ...baseTheme.xAxis,
      type: 'category',
      data: processes,
      splitArea: { show: true },
    },
    yAxis: {
      ...baseTheme.yAxis,
      type: 'category',
      data: severities,
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: Math.max(...data.map(d => d.count)) || 10,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: [CHART_COLOR_PALETTE[1] + '22', CHART_COLOR_PALETTE[1]],
      },
    },
    series: [
      {
        name: 'Deviations',
        type: 'heatmap',
        data: seriesData,
        label: {
          show: true,
          color: '#111',
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />;
}

