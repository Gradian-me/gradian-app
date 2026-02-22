'use client';

import ReactECharts from 'echarts-for-react';

type WaterfallItem = { name: string; value: number }; // value can be negative for decrease

type Props = {
  data: WaterfallItem[];
  theme: Record<string, unknown>;
  title?: string;
};

export default function CostWaterfall({ data, theme, title }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const option = {
    ...baseTheme,
    title: title ? { ...(baseTheme.title as object), text: title, left: 'center' } : undefined,
    tooltip: { ...(baseTheme.tooltip as object), trigger: 'axis' as const },
    grid: { ...(baseTheme.grid as object), top: title ? '18%' : '12%', bottom: '15%' },
    xAxis: {
      ...(baseTheme.xAxis as object),
      type: 'category' as const,
      data: data.map((d) => d.name),
    },
    yAxis: { ...(baseTheme.yAxis as object), type: 'value' as const, name: 'IRR' },
    series: [
      {
        type: 'bar' as const,
        data: data.map((d) => d.value),
        itemStyle: {
          color: (params: { data: number }) => (params.data >= 0 ? '#EF4444' : '#10B981'),
        },
      },
    ],
  };
  return (
    <ReactECharts option={option} style={{ height: 300, width: '100%' }} opts={{ renderer: 'svg' }} />
  );
}
