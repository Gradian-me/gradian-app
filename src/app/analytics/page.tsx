'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FormTabs,
  FormTabsList,
  FormTabsTrigger,
} from '@/gradian-ui/form-builder/form-elements';
import { SpendAnalysisChart } from '@/components/dashboard/charts/spend-analysis-chart';
import { MonthlyTrendChart } from '@/components/dashboard/charts/monthly-trend-chart';
import {
  DollarSign,
  TrendingUp,
  Shield,
  Users,
  Download,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardMetrics, SpendAnalysis, MonthlyTrend } from '@/types';
import ReactECharts from 'echarts-for-react';
import { LoadingSpinner } from '@/gradian-ui/layout/components';
import { CHART_ANIMATION_CONFIG, CHART_COLOR_PALETTE, createChartTheme } from '@/gradian-ui/shared/constants/chart-theme';
import { useTheme } from 'next-themes';
import { DynamicAiAgentResponseContainer } from '@/gradian-ui/data-display/components/DynamicAiAgentResponseContainer';
import type { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [spendAnalysis, setSpendAnalysis] = useState<SpendAnalysis[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('last12');
  const [activeTab, setActiveTab] = useState<'spend' | 'vendor' | 'funnel' | 'analysis' | 'risk'>('spend');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const chartTheme = useMemo(() => createChartTheme(isDark), [isDark]);

  const tabs = [
    { id: 'spend' as const, label: 'Spend Analysis' },
    { id: 'vendor' as const, label: 'Vendor Performance' },
    { id: 'funnel' as const, label: 'Tender Funnel' },
    { id: 'analysis' as const, label: 'Tender Analysis' },
    { id: 'risk' as const, label: 'Risk Assessment' },
  ];

  const vendorPerformanceData = useMemo(
    () => [
      { name: 'Transfarma', onTime: 98, quality: 95, responsiveness: 92, value: 2.5 },
      { name: 'Ottana Pharmed', onTime: 94, quality: 92, responsiveness: 88, value: 1.8 },
      { name: 'Exapilog', onTime: 90, quality: 89, responsiveness: 84, value: 1.4 },
      { name: 'Mana Pharma', onTime: 87, quality: 90, responsiveness: 82, value: 1.2 },
      { name: 'BioSynx', onTime: 91, quality: 93, responsiveness: 90, value: 1.6 },
    ],
    []
  );

  const vendorPerformanceOption = useMemo(() => {
    const categories = vendorPerformanceData.map(item => item.name);
    return {
      ...chartTheme,
      grid: {
        ...chartTheme.grid,
        top: '28%',
        bottom: '18%',
      },
      legend: {
        ...chartTheme.legend,
        data: ['On-Time Delivery', 'Quality Score', 'Responsiveness'],
        top: '5%',
        left: '2%',
        orient: 'horizontal',
        align: 'left',
        itemGap: 16,
        itemWidth: 14,
        itemHeight: 14,
      },
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'category',
        data: categories,
        axisLabel: {
          ...chartTheme.xAxis.axisLabel,
          interval: 0,
          rotate: 0,
        },
      },
      yAxis: {
        ...chartTheme.yAxis,
        type: 'value',
        max: 100,
        axisLabel: {
          ...chartTheme.yAxis.axisLabel,
          formatter: (value: number) => `${value}%`,
        },
      },
      series: [
        {
          name: 'On-Time Delivery',
          type: 'bar',
          data: vendorPerformanceData.map(item => item.onTime),
          itemStyle: {
            color: CHART_COLOR_PALETTE[0],
            borderRadius: [4, 4, 0, 0],
          },
          animationDelay: (idx: number) => idx * 80,
        },
        {
          name: 'Quality Score',
          type: 'bar',
          data: vendorPerformanceData.map(item => item.quality),
          itemStyle: {
            color: CHART_COLOR_PALETTE[2],
            borderRadius: [4, 4, 0, 0],
          },
          animationDelay: (idx: number) => idx * 80 + 100,
        },
        {
          name: 'Responsiveness',
          type: 'bar',
          data: vendorPerformanceData.map(item => item.responsiveness),
          itemStyle: {
            color: CHART_COLOR_PALETTE[4],
            borderRadius: [4, 4, 0, 0],
          },
          animationDelay: (idx: number) => idx * 80 + 200,
        },
      ],
      animationDuration: CHART_ANIMATION_CONFIG.duration,
      animationEasing: CHART_ANIMATION_CONFIG.easing,
    };
  }, [chartTheme, vendorPerformanceData]);

  const tenderFunnelData = useMemo(
    () => [
      { stage: 'Draft', value: 64 },
      { stage: 'Published', value: 48 },
      { stage: 'Responses', value: 36 },
      { stage: 'Shortlisted', value: 22 },
      { stage: 'Awarded', value: 14 },
    ],
    []
  );

  const tenderFunnelOption = useMemo(
    () => ({
      ...chartTheme,
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'item',
        formatter: (params: any) => `
          <div style="padding: 8px;">
            <div style="font-weight:600; margin-bottom: 4px;">${params.name}</div>
            <div>${params.value} tenders</div>
          </div>
        `,
      },
      series: [
        {
          type: 'funnel',
          left: '10%',
          top: '16%',
          bottom: '6%',
          width: '80%',
          min: 0,
          max: tenderFunnelData[0]?.value ?? 100,
          sort: 'descending',
          gap: 4,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
          },
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}\n{c}',
            fontSize: 12,
            color: '#fff',
          },
          data: tenderFunnelData.map((item, index) => ({
            name: item.stage,
            value: item.value,
            itemStyle: {
              color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
            },
          })),
        },
      ],
    }),
    [chartTheme, tenderFunnelData]
  );

  const tenderCycleData = useMemo(
    () => [
      { month: 'Apr', cycle: 36, awards: 8 },
      { month: 'May', cycle: 34, awards: 10 },
      { month: 'Jun', cycle: 32, awards: 9 },
      { month: 'Jul', cycle: 30, awards: 11 },
      { month: 'Aug', cycle: 28, awards: 14 },
      { month: 'Sep', cycle: 27, awards: 12 },
      { month: 'Oct', cycle: 26, awards: 13 },
      { month: 'Nov', cycle: 25, awards: 15 },
    ],
    []
  );

  const tenderAnalysisOption = useMemo(() => {
    const months = tenderCycleData.map(item => item.month);
    return {
      ...chartTheme,
      grid: {
        ...chartTheme.grid,
        top: '20%',
        bottom: '20%',
      },
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'axis',
      },
      legend: {
        ...chartTheme.legend,
        data: ['Avg Cycle Time', 'Tenders Awarded'],
        top: '2%',
        left: '2%',
        orient: 'horizontal',
        align: 'left',
      },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'category',
        data: months,
      },
      yAxis: [
        {
          ...chartTheme.yAxis,
          type: 'value',
          name: 'Cycle Time (days)',
          axisLabel: {
            ...chartTheme.yAxis.axisLabel,
            formatter: '{value}d',
          },
        },
        {
          ...chartTheme.yAxis,
          type: 'value',
          name: 'Awards',
          axisLabel: {
            ...chartTheme.yAxis.axisLabel,
            formatter: '{value}',
          },
        },
      ],
      series: [
        {
          name: 'Avg Cycle Time',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          data: tenderCycleData.map(item => item.cycle),
          itemStyle: {
            color: CHART_COLOR_PALETTE[1],
          },
          areaStyle: {
            color: CHART_COLOR_PALETTE[1] + '33',
          },
        },
        {
          name: 'Tenders Awarded',
          type: 'bar',
          yAxisIndex: 1,
          data: tenderCycleData.map(item => item.awards),
          itemStyle: {
            color: CHART_COLOR_PALETTE[5] ?? '#7c3aed',
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [chartTheme, tenderCycleData]);

  const riskDimensions = useMemo(
    () => [
      { name: 'Compliance', value: 92 },
      { name: 'Financial', value: 85 },
      { name: 'Operational', value: 78 },
      { name: 'Supply Chain', value: 81 },
      { name: 'Cybersecurity', value: 74 },
      { name: 'Reputation', value: 88 },
    ],
    []
  );

  const riskRadarOption = useMemo(
    () => ({
      ...chartTheme,
      radar: {
        indicator: riskDimensions.map(dim => ({ name: dim.name, max: 100 })),
        splitArea: {
          show: true,
        },
        center: ['50%', '45%'],
        radius: '52%',
      },
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'item',
      },
      legend: {
        ...chartTheme.legend,
        show: true,
        top: '2%',
        left: '2%',
        orient: 'horizontal',
        align: 'left',
      },
      series: [
        {
          type: 'radar',
          areaStyle: {
            color: CHART_COLOR_PALETTE[3] + '33',
          },
          lineStyle: {
            color: CHART_COLOR_PALETTE[3],
            width: 2,
          },
          data: [
            {
              value: riskDimensions.map(dim => dim.value),
              name: 'Risk Coverage',
            },
          ],
        },
      ],
    }),
    [chartTheme, riskDimensions]
  );

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        
        if (data.success) {
          setMetrics(data.data.metrics);
          setSpendAnalysis(data.data.spendAnalysis);
          setMonthlyTrends(data.data.monthlyTrends);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <MainLayout title="Analytics & Reporting" icon="BarChart3">
        <LoadingSpinner centered containerClassName="h-64" />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Analytics & Reporting" icon="BarChart3">
      <div className="space-y-6">
        {/* Header with Export Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:items-center"
        >
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics & Reporting</h2>
            <p className="text-gray-600 dark:text-gray-400">Comprehensive insights into your business performance</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${metrics?.totalSpend.toLocaleString()}
                </div>
                <p className="text-xs text-green-600">+12.5% from last period</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${metrics?.costSavings.toLocaleString()}
                </div>
                <p className="text-xs text-blue-600">5.8% of total spend</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Vendor Rating</CardTitle>
                <Shield className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics?.averageVendorRating}
                </div>
                <p className="text-xs text-yellow-600">Excellent performance</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                <Users className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-600">
                  {metrics?.onTimeDelivery}%
                </div>
                <p className="text-xs text-violet-600">Above target (90%)</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <FormTabs
            value={activeTab}
            onValueChange={value => setActiveTab(value as typeof activeTab)}
            className="w-full"
          >
            <FormTabsList className="min-w-full bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 select-none">
              {tabs.map(tab => (
                <FormTabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="px-4 py-1.5 text-sm"
                >
                  {tab.label}
                </FormTabsTrigger>
              ))}
            </FormTabsList>
          </FormTabs>
        </motion.div>

        {activeTab === 'spend' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpendAnalysisChart data={spendAnalysis} />
              <MonthlyTrendChart data={monthlyTrends} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Top Performing Vendors</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Transfarma</span>
                      <Badge variant="success">4.8</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Ottana Pharmed</span>
                      <Badge variant="success">4.5</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Exapilog</span>
                      <Badge variant="warning">4.2</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Recent Trends</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Spend Growth</span>
                      <span className="text-sm font-medium text-green-600">+12.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Order Volume</span>
                      <span className="text-sm font-medium text-blue-600">+8.3%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Cost Savings</span>
                      <span className="text-sm font-medium text-green-600">+5.8%</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.8 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Compliance Score</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">94.2%</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Above industry average</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mt-3">
                        <div className="bg-green-600 dark:bg-green-500 h-2 rounded-full" style={{ width: '94.2%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}

        {activeTab === 'vendor' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div
              className="xl:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Vendor Performance Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ReactECharts option={vendorPerformanceOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Highlights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {vendorPerformanceData.map(vendor => (
                    <div key={vendor.name} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-none last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{vendor.name}</span>
                        <Badge variant="outline">{vendor.value.toFixed(1)}M</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        <span>On-Time: <span className="text-gray-700 dark:text-gray-300 font-medium">{vendor.onTime}%</span></span>
                        <span>Quality: <span className="text-gray-700 dark:text-gray-300 font-medium">{vendor.quality}%</span></span>
                        <span>Responsiveness: <span className="text-gray-700 dark:text-gray-300 font-medium">{vendor.responsiveness}%</span></span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {activeTab === 'funnel' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Tender Funnel Conversion</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ReactECharts option={tenderFunnelOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Stage Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tenderFunnelData.map((stage, index) => {
                    const conversion =
                      index === 0 ? 100 : Math.round((stage.value / tenderFunnelData[index - 1].value) * 100);
                    return (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{stage.stage}</span>
                          <span className="text-gray-500 dark:text-gray-400">{stage.value} tenders</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${conversion}%`,
                              backgroundColor: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                          <span>Conversion</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{conversion}%</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div
              className="xl:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Tender Cycle Efficiency</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ReactECharts option={tenderAnalysisOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <DynamicAiAgentResponseContainer
                action={{
                  id: 'tender-analysis-insights',
                  label: 'Insights Summary',
                  action: 'runAiAgent',
                  componentType: 'ai-agent-response',
                  agentId: 'data-analysis-expert',
                  runType: 'automatic',
                  icon: 'BarChart',
                  variant: 'default',
                  maxHeight: 340,
                  additionalSystemPrompt: `Analyze the following Tender Cycle Efficiency data and provide comprehensive insights as a data analyst. Focus on:
- Cycle time trends and improvements
- Award conversion rates and patterns
- Performance metrics and efficiency gains
- Key insights and actionable recommendations
- Strengths, weaknesses, and risks
- Areas for improvement

Provide a concise but comprehensive analysis suitable for an insights summary card.`
                } as QuickAction}
                schema={{
                  id: 'analytics',
                  name: 'Analytics',
                  singular_name: 'Analytics',
                  plural_name: 'Analytics',
                  fields: [],
                  sections: []
                } as FormSchema}
                data={{
                  id: 'tender-cycle-data',
                  tenderCycleData: tenderCycleData
                }}
                disableAnimation={false}
                index={1}
              />
            </motion.div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div
              className="xl:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Risk Coverage Radar</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ReactECharts option={riskRadarOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Key Risk Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Overall Risk Score</span>
                    <Badge variant="success">Low (18%)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">High-Risk Vendors</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Compliance Alerts</span>
                    <span className="font-semibold text-yellow-600">5 open</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Top Risk Drivers</p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                      <li>• Supply chain disruptions in APAC region</li>
                      <li>• Pending compliance certifications for two vendors</li>
                      <li>• Increased cybersecurity monitoring following new integrations</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}


