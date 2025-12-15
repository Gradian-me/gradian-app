'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import { EqmsAnalyticsData } from '../types';

type Props = {
  data: EqmsAnalyticsData['funnels']['change'];
  title?: string;
  theme: Record<string, any>;
  showLegend?: boolean;
};

export default function EqmsFunnel({ data, theme, title = 'Process Funnel', showLegend = true }: Props) {
  const baseTheme = theme as Record<string, any>;
  const option = {
    ...baseTheme,
    legend: {
      ...baseTheme.legend,
      show: true,
      data: data.map(item => item.stage),
      top: '6%',
      left: 'center',
      itemGap: 12,
    },
    title: {
      ...baseTheme.title,
      text: title,
      left: 'center',
      top: '0%',
    },
    tooltip: {
      ...baseTheme.tooltip,
      trigger: 'item',
      formatter: (params: any) =>
        `<div style="padding:8px"><div style="font-weight:600">${params.name}</div><div>${params.value} items</div></div>`,
    },
    series: [
      {
        type: 'funnel',
        left: '6%',
        top: '14%',
        bottom: '4%',
        width: '88%',
        min: 0,
        max: data[0]?.value ?? 100,
        sort: 'descending',
        gap: 6,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}\n{c}',
          color: '#fff',
        },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length] },
        })),
      },
    ],
  };

  return (
    <div className="space-y-4">
      {showLegend && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          {data.map((item, index) => (
            <span
              key={item.stage}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-2 py-1"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length] }}
                aria-hidden
              />
              {item.stage}
            </span>
          ))}
        </div>
      )}
      <ReactECharts option={option} style={{ height: 340, width: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
}

