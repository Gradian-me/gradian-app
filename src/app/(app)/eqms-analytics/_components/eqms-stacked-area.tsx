'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import { EqmsAnalyticsData } from '../types';

type Props = {
  data: EqmsAnalyticsData['timeSeries'];
  theme: Record<string, any>;
};

export default function EqmsStackedArea({ data, theme }: Props) {
  const baseTheme = theme as Record<string, any>;
  const option = {
    ...baseTheme,
    tooltip: {
      ...baseTheme.tooltip,
      trigger: 'axis',
    },
    legend: {
      ...baseTheme.legend,
      data: ['Change', 'Deviation', 'Complaint', 'Audit', 'Risk', 'CAPA'],
      top: '2%',
      left: '2%',
    },
    grid: {
      ...baseTheme.grid,
      top: '18%',
      bottom: '10%',
      left: '5%',
      right: '5%',
    },
    xAxis: {
      ...baseTheme.xAxis,
      type: 'category',
      boundaryGap: false,
      data: data.map(d => d.month),
    },
    yAxis: {
      ...baseTheme.yAxis,
      type: 'value',
    },
    series: [
      'change',
      'deviation',
      'complaint',
      'audit',
      'risk',
      'capa',
    ].map((key, idx) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      type: 'line',
      smooth: true,
      stack: 'total',
      areaStyle: {
        color: `${CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length]}33`,
      },
      lineStyle: {
        width: 2,
      },
      emphasis: { focus: 'series' },
      data: data.map((d: any) => d[key]),
      itemStyle: { color: CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length] },
    })),
  };

  return <ReactECharts option={option} style={{ height: 340, width: '100%' }} opts={{ renderer: 'svg' }} />;
}

