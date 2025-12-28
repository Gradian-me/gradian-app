'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Package, TrendingUp, Users, BarChart3, AlertTriangle } from 'lucide-react';
import { SalesAnalyticsData } from '../types';

type Props = {
  kpis: SalesAnalyticsData['kpis'];
  revenueByYear: SalesAnalyticsData['revenueByYear'];
};

type KpiItem =
  | { key: 'totalRevenue'; label: string; icon: typeof DollarSign; tone: 'default'; format: 'currency' }
  | { key: 'totalQuantity'; label: string; icon: typeof Package; tone: 'default'; format: 'number' }
  | { key: 'avgPriceProxy'; label: string; icon: typeof BarChart3; tone: 'info'; format: 'currency' }
  | { key: 'yearOverYearGrowth'; label: string; icon: typeof TrendingUp; tone: 'success' | 'danger'; format: 'percentage' }
  | { key: 'topCustomerRevenueShare'; label: string; icon: typeof Users; tone: 'warning'; format: 'percentage' }
  | { key: 'topProductRevenueShare'; label: string; icon: typeof AlertTriangle; tone: 'warning'; format: 'percentage' };

const items: ReadonlyArray<KpiItem> = [
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, tone: 'default', format: 'currency' },
  { key: 'totalQuantity', label: 'Total Quantity', icon: Package, tone: 'default', format: 'number' },
  { key: 'avgPriceProxy', label: 'Avg Price Proxy', icon: BarChart3, tone: 'info', format: 'currency' },
  { key: 'yearOverYearGrowth', label: 'YoY Growth', icon: TrendingUp, tone: 'success', format: 'percentage' },
  { key: 'topCustomerRevenueShare', label: 'Top Customer Share', icon: Users, tone: 'warning', format: 'percentage' },
  { key: 'topProductRevenueShare', label: 'Top Product Share', icon: AlertTriangle, tone: 'warning', format: 'percentage' },
];

const toneClass = (tone: typeof items[number]['tone']) => {
  switch (tone) {
    case 'success':
      return 'text-green-600';
    case 'warning':
      return 'text-amber-600';
    case 'danger':
      return 'text-red-600';
    case 'info':
      return 'text-blue-600';
    default:
      return 'text-gray-900 dark:text-gray-100';
  }
};

const formatValue = (value: number, format: 'currency' | 'number' | 'percentage'): string => {
  if (format === 'currency') {
    return new Intl.NumberFormat('fa-IR', { style: 'currency', currency: 'IRR', maximumFractionDigits: 0 }).format(value);
  }
  if (format === 'percentage') {
    return `${value.toFixed(1)}%`;
  }
  return new Intl.NumberFormat('fa-IR').format(value);
};

const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export function SalesKpiCards({ kpis, revenueByYear }: Props) {
  // Get last year and previous year data
  const sortedYears = [...revenueByYear].sort((a, b) => a.year - b.year);
  const lastYearData = sortedYears[sortedYears.length - 1];
  const previousYearData = sortedYears.length >= 2 ? sortedYears[sortedYears.length - 2] : null;

  // Calculate last year values and growth rates
  const lastYearRevenue = lastYearData?.revenue || 0;
  const lastYearQuantity = lastYearData?.quantity || 0;
  const lastYearAvgPriceProxy = lastYearData?.avgPriceProxy || 0;

  const revenueGrowth = previousYearData ? calculateGrowth(lastYearRevenue, previousYearData.revenue) : 0;
  const quantityGrowth = previousYearData ? calculateGrowth(lastYearQuantity, previousYearData.quantity) : 0;
  const avgPriceProxyGrowth = previousYearData && previousYearData.avgPriceProxy > 0
    ? calculateGrowth(lastYearAvgPriceProxy, previousYearData.avgPriceProxy)
    : 0;

  // Create growth badge component
  const GrowthBadge = ({ growth }: { growth: number }) => {
    const isPositive = growth >= 0;
    return (
      <Badge
        variant={isPositive ? 'default' : 'destructive'}
        className={`mt-2 ${isPositive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
      >
        {isPositive ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Revenue - Last Year */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-gray-900 dark:text-gray-100" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatValue(lastYearRevenue, 'currency')}
          </div>
          {previousYearData && <GrowthBadge growth={revenueGrowth} />}
        </CardContent>
      </Card>

      {/* Total Quantity - Last Year */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          <Package className="h-4 w-4 text-gray-900 dark:text-gray-100" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatValue(lastYearQuantity, 'number')}
          </div>
          {previousYearData && <GrowthBadge growth={quantityGrowth} />}
        </CardContent>
      </Card>

      {/* Avg Price Proxy - Last Year */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Price Proxy</CardTitle>
          <BarChart3 className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatValue(lastYearAvgPriceProxy, 'currency')}
          </div>
          {previousYearData && <GrowthBadge growth={avgPriceProxyGrowth} />}
        </CardContent>
      </Card>

      {/* Other KPIs */}
      {items.filter(item => 
        item.key !== 'totalRevenue' && 
        item.key !== 'totalQuantity' && 
        item.key !== 'avgPriceProxy'
      ).map(item => {
        const Icon = item.icon;
        const value = kpis[item.key as keyof typeof kpis];
        const display = formatValue(value as number, item.format);
        const isNegative = item.format === 'percentage' && (value as number) < 0;
        const finalTone = isNegative ? 'danger' : item.tone;

        return (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <Icon className={`h-4 w-4 ${toneClass(finalTone)}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${toneClass(finalTone)}`}>{display}</div>
              {item.key === 'yearOverYearGrowth' && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {(value as number) >= 0 ? '↑ Growth' : '↓ Decline'}
                </p>
              )}
              {(item.key === 'topCustomerRevenueShare' || item.key === 'topProductRevenueShare') && (
                <Badge variant="outline" className="mt-2">
                  {(value as number) > 30 ? 'High Concentration' : 'Moderate'}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

