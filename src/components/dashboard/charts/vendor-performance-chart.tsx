'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CHART_COLOR_PALETTE, CHART_ANIMATION_CONFIG, createChartTheme } from '@/gradian-ui/shared/constants/chart-theme';
import { useTheme } from 'next-themes';

interface VendorPerformanceData {
  vendor: string;
  rating: number;
  onTimeDelivery: number;
  qualityScore: number;
  totalOrders: number;
}

interface VendorPerformanceChartProps {
  data: VendorPerformanceData[];
}

export function VendorPerformanceChart({ data }: VendorPerformanceChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const chartTheme = useMemo(() => createChartTheme(isDark), [isDark]);
  const tooltipHeading = isDark ? '#F9FAFB' : '#111827';
  const tooltipLabel = isDark ? '#94A3B8' : '#374151';

  const chartOption = useMemo(() => {
    const vendors = data.map(item => item.vendor);
    const ratings = data.map(item => item.rating);
    const onTimeDelivery = data.map(item => item.onTimeDelivery);
    const qualityScores = data.map(item => item.qualityScore);

    return {
      ...chartTheme,
      animation: true,
      animationDuration: CHART_ANIMATION_CONFIG.duration,
      animationEasing: CHART_ANIMATION_CONFIG.easing,
      grid: {
        ...chartTheme.grid,
        left: '8%',
        right: '12%',
        top: '15%',
        bottom: '20%',
        containLabel: true,
      },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'category',
        data: vendors,
        axisLabel: {
          ...chartTheme.xAxis.axisLabel,
          interval: 0,
          rotate: 45,
        },
      },
      yAxis: [
        {
          ...chartTheme.yAxis,
          type: 'value',
          name: 'Rating & Scores',
          nameLocation: 'middle',
          nameGap: 40,
          min: 0,
          max: 5,
          axisLabel: {
            ...chartTheme.yAxis.axisLabel,
            formatter: (value: number) => value.toFixed(1),
          },
        },
        {
          ...chartTheme.yAxis,
          type: 'value',
          name: 'On-Time Delivery (%)',
          nameLocation: 'end',
          nameGap: 10,
          min: 0,
          max: 100,
          axisLabel: {
            ...chartTheme.yAxis.axisLabel,
            formatter: (value: number) => `${value}%`,
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: 'Rating',
          type: 'bar',
          yAxisIndex: 0,
          data: ratings,
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
          animationDelay: (idx: number) => idx * 100,
        },
        {
          name: 'Quality Score',
          type: 'line',
          yAxisIndex: 0,
          data: qualityScores,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            color: CHART_COLOR_PALETTE[2],
            width: 3,
            type: 'solid',
          },
          itemStyle: {
            color: CHART_COLOR_PALETTE[2],
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(6, 182, 212, 0.5)',
              scale: 1.3,
            },
          },
          animationDelay: (idx: number) => idx * 100 + 200,
        },
        {
          name: 'On-Time Delivery',
          type: 'line',
          yAxisIndex: 1,
          data: onTimeDelivery,
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: {
            color: CHART_COLOR_PALETTE[4],
            width: 3,
            type: 'dashed',
          },
          itemStyle: {
            color: CHART_COLOR_PALETTE[4],
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(16, 185, 129, 0.5)',
              scale: 1.3,
            },
          },
          animationDelay: (idx: number) => idx * 100 + 400,
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
          const ratingParam = params.find(p => p.seriesName === 'Rating');
          const qualityParam = params.find(p => p.seriesName === 'Quality Score');
          const deliveryParam = params.find(p => p.seriesName === 'On-Time Delivery');
          
          return `
            <div style="padding: 12px;">
              <div style="font-weight: 600; margin-bottom: 8px; color: ${tooltipHeading};">${params[0].axisValue}</div>
              ${ratingParam ? `
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${ratingParam.color}; border-radius: 2px; margin-right: 8px;"></span>
                  <span style="margin-right: 8px; color: ${tooltipLabel};">Rating:</span>
                  <span style="font-weight: 600; color: ${tooltipHeading};">${ratingParam.value}/5.0</span>
                </div>
              ` : ''}
              ${qualityParam ? `
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${qualityParam.color}; border-radius: 50%; margin-right: 8px;"></span>
                  <span style="margin-right: 8px; color: ${tooltipLabel};">Quality Score:</span>
                  <span style="font-weight: 600; color: ${tooltipHeading};">${qualityParam.value}/5.0</span>
                </div>
              ` : ''}
              ${deliveryParam ? `
                <div style="display: flex; align-items: center;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${deliveryParam.color}; border-radius: 0; margin-right: 8px;"></span>
                  <span style="margin-right: 8px; color: ${tooltipLabel};">On-Time Delivery:</span>
                  <span style="font-weight: 600; color: ${tooltipHeading};">${deliveryParam.value}%</span>
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
        itemGap: 18,
        itemWidth: 14,
        itemHeight: 14,
      },
    };
  }, [chartTheme, data, tooltipHeading, tooltipLabel]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Vendor Performance</span>
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
