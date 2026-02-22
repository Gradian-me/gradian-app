'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';

type HeatmapDatum = { x: string; y: string; value: number };

type Props = {
  data: HeatmapDatum[];
  xLabel?: string;
  yLabel?: string;
  theme: Record<string, unknown>;
};

export default function CostHeatmap({ data, xLabel = 'X', yLabel = 'Y', theme }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const xCategories = Array.from(new Set(data.map((d) => d.x)));
  const yCategories = Array.from(new Set(data.map((d) => d.y)));
  const seriesData = data.map((d) => [
    xCategories.indexOf(d.x),
    yCategories.indexOf(d.y),
    d.value,
  ]);
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const option = {
    ...baseTheme,
    tooltip: {
      ...(baseTheme.tooltip as object),
      formatter: (params: { value: number[] }) =>
        `${xCategories[params.value[0]]} · ${yCategories[params.value[1]]}: ${params.value[2]}`,
    },
    grid: {
      left: '14%',
      right: '4%',
      top: '8%',
      bottom: '22%',
      containLabel: true,
    },
    xAxis: {
      ...(baseTheme.xAxis as object),
      type: 'category' as const,
      data: xCategories,
      name: xLabel,
      nameGap: 8,
      splitArea: { show: true },
      axisLabel: { interval: 0, rotate: xCategories.length > 4 ? 25 : 0 },
    },
    yAxis: {
      ...(baseTheme.yAxis as object),
      type: 'category' as const,
      data: yCategories,
      name: yLabel,
      nameGap: 8,
      splitArea: { show: true },
      axisLabel: { width: 80, overflow: 'truncate' },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '2%',
      itemWidth: 20,
      itemHeight: 80,
      inRange: { color: [CHART_COLOR_PALETTE[2] + '22', CHART_COLOR_PALETTE[2]] },
    },
    series: [
      {
        type: 'heatmap' as const,
        data: seriesData,
        label: { show: true, fontSize: 10 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
      },
    ],
  };
  return (
    <div className="w-full min-h-[280px]" style={{ height: 320 }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
}
