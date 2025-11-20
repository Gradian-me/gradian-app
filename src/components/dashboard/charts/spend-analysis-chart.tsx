'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CHART_COLOR_PALETTE, CHART_ANIMATION_CONFIG, createChartTheme } from '@/gradian-ui/shared/constants/chart-theme';
import { useTheme } from 'next-themes';

interface SpendAnalysisData {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface SpendAnalysisChartProps {
  data: SpendAnalysisData[];
}

export function SpendAnalysisChart({ data }: SpendAnalysisChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const chartTheme = useMemo(() => createChartTheme(isDark), [isDark]);
  const labelColor = isDark ? '#E5E7EB' : '#374151';
  const tooltipSubtle = isDark ? '#94A3B8' : '#6B7280';

  const chartOption = useMemo(() => {
    const chartData = data.map((item, index) => ({
      name: item.category,
      value: item.amount,
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 1,
          colorStops: [
            { offset: 0, color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length] },
            { offset: 1, color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length] + '80' }
          ]
        },
        borderRadius: 8,
        borderWidth: 0,
      },
    }));

    return {
      ...chartTheme,
      animation: true,
      animationDuration: CHART_ANIMATION_CONFIG.duration,
      animationEasing: CHART_ANIMATION_CONFIG.easing,
      series: [
        {
          name: 'Spend by Category',
          type: 'pie',
          radius: ['30%', '60%'],
          center: ['45%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n{d}%',
            fontSize: 10,
            fontWeight: '500',
            color: labelColor,
            overflow: 'truncate',
            width: 70,
            rich: {
              b: {
                fontSize: 10,
                lineHeight: 14,
              },
            },
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 6,
            smooth: true,
            maxSurfaceAngle: 90,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              scale: 1.05,
            },
            label: {
              show: true,
              fontSize: 12,
              fontWeight: '600',
            },
          },
          data: chartData,
        },
      ],
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'item',
        formatter: (params: any) => {
          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${params.name}</div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${params.color}; border-radius: 50%; margin-right: 8px;"></span>
                <span>Amount: $${params.value.toLocaleString()}</span>
              </div>
              <div style="color: ${tooltipSubtle}; font-size: 11px;">${params.percent}% of total spend</div>
            </div>
          `;
        },
      },
      legend: {
        ...chartTheme.legend,
        top: '2%',
        left: '2%',
        orient: 'horizontal',
        align: 'left',
        itemGap: 16,
        icon: 'circle',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          ...(chartTheme.legend?.textStyle ?? {}),
          fontSize: 11,
        },
      },
    };
  }, [chartTheme, data, labelColor, tooltipSubtle]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Spend by Category</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden p-4">
          <div className="h-80 w-full overflow-hidden relative">
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%', maxWidth: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
