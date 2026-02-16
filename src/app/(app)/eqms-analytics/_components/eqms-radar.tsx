'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';

type RadarDatum = { name?: string; pillar?: string; score: number };

type Props = {
  data: RadarDatum[];
  theme: Record<string, any>;
  title?: string;
};

export default function EqmsRadar({ data, theme, title = 'Risk Coverage' }: Props) {
  const baseTheme = theme as Record<string, any>;
  const option = {
    ...baseTheme,
    title: {
      ...baseTheme.title,
      text: title,
      left: 'center',
      top: '2%',
    },
    radar: {
      indicator: data.map(dim => ({ name: dim.name ?? dim.pillar, max: 100 })),
      splitArea: { show: true },
      center: ['50%', '55%'],
      radius: '60%',
    },
    tooltip: {
      ...baseTheme.tooltip,
      trigger: 'item',
    },
    series: [
      {
        type: 'radar',
        areaStyle: { color: CHART_COLOR_PALETTE[3] + '33' },
        lineStyle: { color: CHART_COLOR_PALETTE[3], width: 2 },
        data: [
          {
            value: data.map(dim => dim.score),
            name: 'Coverage',
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />;
}

