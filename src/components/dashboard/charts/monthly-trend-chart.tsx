'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CHART_COLOR_PALETTE, CHART_ANIMATION_CONFIG, createChartTheme } from '@/gradian-ui/shared/constants/chart-theme';
import { useTheme } from 'next-themes';

interface MonthlyTrendData {
  month: string;
  spend: number;
  orders: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const chartTheme = useMemo(() => createChartTheme(isDark), [isDark]);
  const tooltipHeading = isDark ? '#F9FAFB' : '#111827';
  const tooltipLabel = isDark ? '#94A3B8' : '#374151';

  const chartOption = useMemo(() => {
    const months = data.map(item => item.month);
    const spendData = data.map(item => item.spend);
    const ordersData = data.map(item => item.orders);

    return {
      ...chartTheme,
      animation: true,
      animationDuration: CHART_ANIMATION_CONFIG.duration,
      animationEasing: CHART_ANIMATION_CONFIG.easing,
      grid: {
        ...chartTheme.grid,
        left: '8%',
        right: '12%',
        top: '26%',
        bottom: '18%',
        containLabel: true,
      },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'category',
        data: months,
        axisLabel: {
          ...chartTheme.xAxis.axisLabel,
          interval: 0,
          rotate: 0,
        },
      },
      yAxis: [
        {
          ...chartTheme.yAxis,
          type: 'value',
          name: 'Spend ($)',
          nameLocation: 'middle',
          nameGap: 40,
          nameTextStyle: {
            color: CHART_COLOR_PALETTE[0],
            fontWeight: '600',
          },
          axisLabel: {
            ...chartTheme.yAxis.axisLabel,
            formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
          },
          splitLine: {
            ...chartTheme.yAxis.splitLine,
            show: true,
          },
        },
        {
          ...chartTheme.yAxis,
          type: 'value',
          name: 'Orders',
          nameLocation: 'end',
          nameGap: 10,
          nameTextStyle: {
            color: CHART_COLOR_PALETTE[4],
            fontWeight: '600',
          },
          axisLabel: {
            ...chartTheme.yAxis.axisLabel,
            formatter: (value: number) => value.toString(),
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: 'Monthly Spend',
          type: 'bar',
          yAxisIndex: 0,
          data: spendData,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: CHART_COLOR_PALETTE[0] },
                { offset: 1, color: CHART_COLOR_PALETTE[0] + '80' }
              ]
            },
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(59, 130, 246, 0.5)',
            },
          },
          animationDelay: (idx: number) => idx * 50,
        },
        {
          name: 'Order Count',
          type: 'line',
          yAxisIndex: 1,
          data: ordersData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: CHART_COLOR_PALETTE[4],
            width: 3,
            type: 'solid',
          },
          itemStyle: {
            color: CHART_COLOR_PALETTE[4],
            borderColor: '#fff',
            borderWidth: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: CHART_COLOR_PALETTE[4] + '20' },
                { offset: 1, color: CHART_COLOR_PALETTE[4] + '05' }
              ]
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(16, 185, 129, 0.5)',
              scale: 1.2,
            },
          },
          animationDelay: (idx: number) => idx * 50 + 200,
        },
      ],
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999',
          },
        },
        formatter: (params: any[]) => {
          const spendParam = params.find(p => p.seriesName === 'Monthly Spend');
          const ordersParam = params.find(p => p.seriesName === 'Order Count');
          
          return `
            <div style="padding: 12px;">
              <div style="font-weight: 600; margin-bottom: 8px; color: ${tooltipHeading};">${params[0].axisValue}</div>
              ${spendParam ? `
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${spendParam.color}; border-radius: 2px; margin-right: 8px;"></span>
                  <span style="margin-right: 8px; color: ${tooltipLabel};">Monthly Spend:</span>
                  <span style="font-weight: 600; color: ${tooltipHeading};">$${spendParam.value.toLocaleString()}</span>
                </div>
              ` : ''}
              ${ordersParam ? `
                <div style="display: flex; align-items: center;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${ordersParam.color}; border-radius: 50%; margin-right: 8px;"></span>
                  <span style="margin-right: 8px; color: ${tooltipLabel};">Orders:</span>
                  <span style="font-weight: 600; color: ${tooltipHeading};">${ordersParam.value}</span>
                </div>
              ` : ''}
            </div>
          `;
        },
      },
      legend: {
        ...chartTheme.legend,
        top: '4%',
        left: '2%',
        orient: 'horizontal',
        align: 'left',
        itemGap: 16,
        itemWidth: 14,
        itemHeight: 14,
      },
    };
  }, [chartTheme, data, tooltipHeading, tooltipLabel]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Monthly Spend Trend</span>
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
