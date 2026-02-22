'use client';

import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import type { VolumeUnitCostOverheadPoint } from '../types';

type Props = {
  data: VolumeUnitCostOverheadPoint[];
  theme: Record<string, unknown>;
};

export default function CostScatter({ data, theme }: Props) {
  const baseTheme = theme as Record<string, unknown>;
  const seriesData = data.map((d, i) => [
    d.volume,
    d.unitCost,
    d.overheadShare,
    d.productName,
    CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
  ]);
  const option = {
    ...baseTheme,
    tooltip: {
      ...(baseTheme.tooltip as object),
      trigger: 'item' as const,
      formatter: (params: { value: number[] }) =>
        `${params.value[3]}<br/>Volume: ${params.value[0].toLocaleString()}<br/>Unit Cost: ${params.value[1].toLocaleString()}<br/>Overhead %: ${params.value[2]}%`,
    },
    grid: {
      left: '14%',
      right: '10%',
      top: '14%',
      bottom: '18%',
      containLabel: true,
    },
    xAxis: {
      ...(baseTheme.xAxis as object),
      type: 'value' as const,
      name: 'Volume',
      nameGap: 8,
    },
    yAxis: {
      ...(baseTheme.yAxis as object),
      type: 'value' as const,
      name: 'Unit Cost (IRR)',
      nameGap: 8,
    },
    series: [
      {
        type: 'scatter' as const,
        symbolSize: (val: number[]) => 12 + (val[2] ?? 0) / 5,
        data: seriesData,
        itemStyle: { color: (params: { value: number[] }) => params.value[4] },
        label: {
          show: true,
          fontSize: 10,
          formatter: (params: { value: number[] }) => params.value[3],
          position: 'top',
        },
      },
    ],
  };
  return (
    <div className="w-full min-h-[280px]" style={{ height: 320 }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
}
