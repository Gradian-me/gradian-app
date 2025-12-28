'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormTabs, FormTabsList, FormTabsTrigger } from '@/gradian-ui/form-builder/form-elements';
import { CHART_COLOR_PALETTE, createChartTheme } from '@/gradian-ui/shared/constants/chart-theme';
import { fetchSalesAnalyticsData, salesAnalyticsDemoData } from './demo-data';
import { SalesKpiCards } from './_components/sales-kpi-cards';
import SalesInsightCard from './_components/sales-insight-card';
import ReactECharts from 'echarts-for-react';
import { SalesAnalyticsData } from './types';

type Tabs = 'overview' | 'revenue' | 'customers' | 'products' | 'volume';

export default function SalesAnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const chartTheme = useMemo(() => createChartTheme(resolvedTheme === 'dark'), [resolvedTheme]);
  const [activeTab, setActiveTab] = useState<Tabs>('overview');
  const [data, setData] = useState<SalesAnalyticsData>(salesAnalyticsDemoData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch fresh data on client side
    fetchSalesAnalyticsData().then(fetchedData => {
      setData(fetchedData);
      setLoading(false);
    });
  }, []);

  // Format sales data for board-level-sales-analyst agent
  const formatSalesDataForAgent = useMemo(() => {
    const rows: string[] = [];
    data.revenueByYear.forEach(year => {
      rows.push(`Year: ${year.year}, Revenue: ${year.revenue}, Quantity: ${year.quantity}`);
    });
    
    const lastYear = data.revenueByYear[data.revenueByYear.length - 1]?.year;
    const lastYearTotalRevenue = data.revenueByYear[data.revenueByYear.length - 1]?.revenue || 0;
    
    return {
      salesData: `Sales Data:\n${rows.join('\n')}\n\nLast Year (${lastYear}) Total Revenue: ${lastYearTotalRevenue}\n\nCustomer Details:\n${data.revenueByCustomer.slice(0, 10).map(c => `${c.customer}: Revenue ${c.revenue}, Growth ${c.growthRate.toFixed(1)}%`).join('\n')}\n\nProduct Details:\n${data.revenueByProduct.slice(0, 10).map(p => `${p.product}: Revenue ${p.revenue}, Share ${p.revenueShare.toFixed(1)}%`).join('\n')}`,
      top10CustomersLastYear: data.top10CustomersLastYear,
      top10ProductsLastYear: data.top10ProductsLastYear,
      top10TrendingProducts: data.top10TrendingProducts,
      top10DecliningProducts: data.top10DecliningProducts,
      lastYear: lastYear,
      lastYearTotalRevenue: lastYearTotalRevenue,
    };
  }, [data]);

  const revenueByYearOption = useMemo(() => {
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
      legend: { ...chartTheme.legend, data: ['Revenue', 'Quantity'], top: '2%' },
      grid: { ...chartTheme.grid, top: '16%', bottom: '16%' },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'category',
        data: data.revenueByYear.map(y => y.year.toString()),
      },
      yAxis: [
        { ...chartTheme.yAxis, type: 'value', name: 'Revenue (IRR)' },
        { ...chartTheme.yAxis, type: 'value', name: 'Quantity', position: 'right' },
      ],
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: data.revenueByYear.map(y => y.revenue),
          itemStyle: { color: CHART_COLOR_PALETTE[0], borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Quantity',
          type: 'line',
          yAxisIndex: 1,
          data: data.revenueByYear.map(y => y.quantity),
          smooth: true,
          itemStyle: { color: CHART_COLOR_PALETTE[3] },
        },
      ],
    };
  }, [chartTheme, data.revenueByYear]);

  const volumeVsRevenueOption = useMemo(() => {
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
      legend: { ...chartTheme.legend, data: ['Revenue Growth %', 'Quantity Growth %', 'Avg Price Proxy'], top: '2%' },
      grid: { ...chartTheme.grid, top: '16%', bottom: '16%' },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'category',
        data: data.volumeVsRevenue.map(v => v.year.toString()),
      },
      yAxis: [
        { ...chartTheme.yAxis, type: 'value', name: 'Growth %' },
        { ...chartTheme.yAxis, type: 'value', name: 'Price Proxy', position: 'right' },
      ],
      series: [
        {
          name: 'Revenue Growth %',
          type: 'bar',
          data: data.volumeVsRevenue.map(v => v.revenueGrowth),
          itemStyle: { color: CHART_COLOR_PALETTE[0] },
        },
        {
          name: 'Quantity Growth %',
          type: 'bar',
          data: data.volumeVsRevenue.map(v => v.quantityGrowth),
          itemStyle: { color: CHART_COLOR_PALETTE[1] },
        },
        {
          name: 'Avg Price Proxy',
          type: 'line',
          yAxisIndex: 1,
          data: data.volumeVsRevenue.map(v => v.avgPriceProxy),
          smooth: true,
          itemStyle: { color: CHART_COLOR_PALETTE[4] },
        },
      ],
    };
  }, [chartTheme, data.volumeVsRevenue]);

  const top10CustomersChartOption = useMemo(() => {
    const customers = data.top10CustomersLastYear; // Already sorted descending (highest first)
    return {
      ...chartTheme,
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const customer = customers[param.dataIndex];
          return `${customer.customer}<br/>Revenue: ${customer.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} IRR<br/>Share: ${customer.revenueShare.toFixed(2)}%`;
        },
      },
      grid: { ...chartTheme.grid, top: '8%', bottom: '12%', left: '25%', right: '8%' },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'value',
        name: 'Revenue (IRR)',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
            if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
            if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
            return value.toLocaleString();
          },
        },
      },
      yAxis: {
        ...chartTheme.yAxis,
        type: 'category',
        data: customers.map(c => c.customer.length > 30 ? c.customer.substring(0, 30) + '...' : c.customer),
        inverse: true, // Highest on top (inverse true shows first item at top)
        axisLabel: {
          ...chartTheme.yAxis?.axisLabel,
          interval: 0,
          fontSize: 11,
        },
      },
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: customers.map(c => c.revenue),
          itemStyle: {
            color: CHART_COLOR_PALETTE[0],
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const customer = customers[params.dataIndex];
              return `${customer.revenueShare.toFixed(1)}%`;
            },
            fontSize: 11,
          },
        },
      ],
    };
  }, [chartTheme, data.top10CustomersLastYear]);

  const top10ProductsChartOption = useMemo(() => {
    const products = data.top10ProductsLastYear; // Already sorted descending (highest first)
    return {
      ...chartTheme,
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const product = products[param.dataIndex];
          return `${product.product}<br/>Revenue: ${product.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} IRR<br/>Share: ${product.revenueShare.toFixed(2)}%`;
        },
      },
      grid: { ...chartTheme.grid, top: '8%', bottom: '12%', left: '25%', right: '8%' },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'value',
        name: 'Revenue (IRR)',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
            if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
            if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
            return value.toLocaleString();
          },
        },
      },
      yAxis: {
        ...chartTheme.yAxis,
        type: 'category',
        data: products.map(p => p.product.length > 30 ? p.product.substring(0, 30) + '...' : p.product),
        inverse: true, // Highest on top (inverse true shows first item at top)
        axisLabel: {
          ...chartTheme.yAxis?.axisLabel,
          interval: 0,
          fontSize: 11,
        },
      },
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: products.map(p => p.revenue),
          itemStyle: {
            color: CHART_COLOR_PALETTE[1],
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const product = products[params.dataIndex];
              return `${product.revenueShare.toFixed(1)}%`;
            },
            fontSize: 11,
          },
        },
      ],
    };
  }, [chartTheme, data.top10ProductsLastYear]);

  const customerQuadrantOption = useMemo(() => {
    const topCustomers = data.customerMomentum.slice(0, 20);
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'item', formatter: (p: any) => `${p.data[2]}: Revenue ${p.data[0]}, Growth ${p.data[1]}` },
      grid: { ...chartTheme.grid, top: '12%', bottom: '18%', left: '8%', right: '6%' },
      xAxis: {
        ...chartTheme.xAxis,
        name: 'Revenue Contribution (Normalized)',
        type: 'value',
        min: 0,
        max: 1,
      },
      yAxis: {
        ...chartTheme.yAxis,
        name: 'Growth Momentum (Normalized)',
        type: 'value',
        min: 0,
        max: 1,
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (data: number[]) => Math.sqrt(data[0]) * 30,
          data: topCustomers.map(c => [c.revenueContribution, c.growthMomentum, c.customer]),
          itemStyle: {
            color: (params: any) => {
              const x = params.data[0];
              const y = params.data[1];
              if (x > 0.5 && y > 0.5) return CHART_COLOR_PALETTE[2]; // Defend
              if (x < 0.5 && y > 0.5) return CHART_COLOR_PALETTE[3]; // Invest
              if (x < 0.5 && y < 0.5) return CHART_COLOR_PALETTE[0]; // Exit
              return CHART_COLOR_PALETTE[1]; // Monitor
            },
          },
        },
      ],
    };
  }, [chartTheme, data.customerMomentum]);

  const topCustomersOption = useMemo(() => {
    const top10 = data.revenueByCustomer.slice(0, 10);
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
      grid: { ...chartTheme.grid, top: '12%', bottom: '25%', left: '12%', right: '6%' },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'value',
        name: 'Revenue (IRR)',
      },
      yAxis: {
        ...chartTheme.yAxis,
        type: 'category',
        data: top10.map(c => c.customer.length > 30 ? c.customer.substring(0, 30) + '...' : c.customer),
        inverse: true, // Highest on top (inverse true shows first item at top)
        axisLabel: { interval: 0, rotate: 0 },
      },
      series: [
        {
          type: 'bar',
          data: top10.map(c => c.revenue),
          itemStyle: { color: CHART_COLOR_PALETTE[0], borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => `${(params.value / 1e12).toFixed(1)}T`,
          },
        },
      ],
    };
  }, [chartTheme, data.revenueByCustomer]);

  const topProductsOption = useMemo(() => {
    const top10 = data.revenueByProduct.slice(0, 10);
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
      grid: { ...chartTheme.grid, top: '12%', bottom: '25%', left: '12%', right: '6%' },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'value',
        name: 'Revenue (IRR)',
      },
      yAxis: {
        ...chartTheme.yAxis,
        type: 'category',
        data: top10.map(p => p.product.length > 40 ? p.product.substring(0, 40) + '...' : p.product),
        axisLabel: { interval: 0, rotate: 0 },
      },
      series: [
        {
          type: 'bar',
          data: top10.map(p => p.revenue),
          itemStyle: { color: CHART_COLOR_PALETTE[2], borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => `${(params.value / 1e12).toFixed(1)}T`,
          },
        },
      ],
    };
  }, [chartTheme, data.revenueByProduct]);

  const productConcentrationOption = useMemo(() => {
    const top10 = data.productConcentration.slice(0, 10);
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
      legend: { ...chartTheme.legend, data: ['Revenue Share %', 'Stability'], top: '2%' },
      grid: { ...chartTheme.grid, top: '16%', bottom: '16%' },
      xAxis: {
        ...chartTheme.xAxis,
        type: 'category',
        data: top10.map(p => p.product.length > 20 ? p.product.substring(0, 20) + '...' : p.product),
        axisLabel: { interval: 0, rotate: 45 },
      },
      yAxis: [
        { ...chartTheme.yAxis, type: 'value', name: 'Revenue Share %' },
        { ...chartTheme.yAxis, type: 'value', name: 'Stability', position: 'right', max: 1 },
      ],
      series: [
        {
          name: 'Revenue Share %',
          type: 'bar',
          data: top10.map(p => p.revenueShare),
          itemStyle: { color: CHART_COLOR_PALETTE[0] },
        },
        {
          name: 'Stability',
          type: 'line',
          yAxisIndex: 1,
          data: top10.map(p => p.stability),
          smooth: true,
          itemStyle: { color: CHART_COLOR_PALETTE[4] },
        },
      ],
    };
  }, [chartTheme, data.productConcentration]);

  if (loading) {
    return (
      <MainLayout title="Sales Analytics" icon="TrendingUp">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-400">Loading sales data...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Sales Analytics" icon="TrendingUp">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Analytics</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Board-level sales performance analysis with revenue trends, customer insights, and product concentration.
              </p>
            </div>
          </div>
        </motion.div>

        <SalesKpiCards kpis={data.kpis} revenueByYear={data.revenueByYear} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <FormTabs value={activeTab} onValueChange={v => setActiveTab(v as Tabs)}>
            <FormTabsList className="min-w-full bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
              {[
                ['overview', 'Overview'],
                ['revenue', 'Revenue Trends'],
                ['customers', 'Customers'],
                ['products', 'Products'],
                ['volume', 'Volume vs Revenue'],
              ].map(([id, label]) => (
                <FormTabsTrigger key={id} value={id} className="px-4 py-1.5 text-sm">
                  {label}
                </FormTabsTrigger>
              ))}
            </FormTabsList>
          </FormTabs>
        </motion.div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Customers by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.top10CustomersLastYear.length > 0 ? (
                    <ReactECharts option={top10CustomersChartOption} style={{ height: 350, width: '100%' }} opts={{ renderer: 'svg' }} />
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      No customer data available for the last year
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.top10ProductsLastYear.length > 0 ? (
                    <ReactECharts option={top10ProductsChartOption} style={{ height: 350, width: '100%' }} opts={{ renderer: 'svg' }} />
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      No product data available for the last year
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <SalesInsightCard
                agentId="board-level-sales-analyst"
                title="Executive Summary"
                payload={{
                  salesData: formatSalesDataForAgent.salesData,
                  revenueByYear: data.revenueByYear,
                  top10CustomersLastYear: formatSalesDataForAgent.top10CustomersLastYear,
                  top10ProductsLastYear: formatSalesDataForAgent.top10ProductsLastYear,
                  top10TrendingProducts: formatSalesDataForAgent.top10TrendingProducts,
                  top10DecliningProducts: formatSalesDataForAgent.top10DecliningProducts,
                  lastYear: formatSalesDataForAgent.lastYear,
                  lastYearTotalRevenue: formatSalesDataForAgent.lastYearTotalRevenue,
                  revenueByCustomer: data.revenueByCustomer.slice(0, 10),
                  revenueByProduct: data.revenueByProduct.slice(0, 10),
                  kpis: data.kpis,
                }}
                prompt="Analyze the provided sales data and provide a comprehensive board-level executive summary following the exact format specified in your system prompt. Include all 7 sections: Executive Snapshot, Revenue Trend by Year, Volume vs Revenue, Customer Quadrant, Product Concentration, Action Register, and Final Board Question."
                runType="automatic"
              />
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={revenueByYearOption} style={{ height: 400, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <SalesInsightCard
                agentId="board-level-sales-analyst"
                title="Revenue Insights"
                payload={{
                  revenueByYear: data.revenueByYear,
                  kpis: data.kpis,
                }}
                prompt="Analyze the revenue trends by year. Identify the revenue direction, growth drivers, and what leadership must prepare for if the trend continues."
                runType="manual"
              />
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Customers by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={topCustomersOption} style={{ height: 400, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Quadrant (Revenue vs Momentum)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={customerQuadrantOption} style={{ height: 400, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <SalesInsightCard
                agentId="board-level-sales-analyst"
                title="Customer Insights"
                payload={{
                  revenueByCustomer: data.revenueByCustomer,
                  customerMomentum: data.customerMomentum,
                }}
                prompt="Analyze customer performance using the quadrant analysis. Identify which customers to protect, fix/exit, and bet on. Quantify concentration risk."
                runType="manual"
              />
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={topProductsOption} style={{ height: 400, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Product Concentration & Stability</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={productConcentrationOption} style={{ height: 400, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <SalesInsightCard
                agentId="board-level-sales-analyst"
                title="Product Insights"
                payload={{
                  revenueByProduct: data.revenueByProduct,
                  productConcentration: data.productConcentration,
                }}
                prompt="Analyze product concentration and fragility. Calculate % of revenue from top products, assess stability, and identify what dependencies must be reduced."
                runType="manual"
              />
            </div>
          </div>
        )}

        {activeTab === 'volume' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Volume vs Revenue Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={volumeVsRevenueOption} style={{ height: 400, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <SalesInsightCard
                agentId="board-level-sales-analyst"
                title="Volume vs Revenue Insights"
                payload={{
                  volumeVsRevenue: data.volumeVsRevenue,
                }}
                prompt="Analyze volume vs revenue patterns. Check if revenue growth is real or cosmetic. Identify if price proxy erosion is masked by volume. Determine if changes are structural or temporary."
                runType="manual"
              />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

