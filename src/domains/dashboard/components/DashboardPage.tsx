'use client';

import { MonthlyTrendChart } from '@/components/dashboard/charts/monthly-trend-chart';
import { ProcurementEfficiencyChart } from '@/components/dashboard/charts/procurement-efficiency-chart';
import { SpendAnalysisChart } from '@/components/dashboard/charts/spend-analysis-chart';
import { VendorPerformanceChart } from '@/components/dashboard/charts/vendor-performance-chart';
import { KPICard } from '@/gradian-ui/analytics/indicators/kpi-card';
import { KPIList } from '@/gradian-ui/analytics/indicators/kpi-list';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card';
import { MainLayout } from '@/components/layout/main-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  DollarSign,
  FileText,
  Shield,
  ShoppingCart,
  TrendingUp,
  Users,
  UserPlus,
  FileCheck,
  ShoppingBag,
  Award,
  AlertCircle,
  Clock,
  Star,
  Timer,
  TrendingDown
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/stores/user.store';
import { resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { useDashboard } from '../hooks/useDashboard';
import { LoadingSpinner, UserWelcome } from '@/gradian-ui/layout/components';

export function DashboardPage() {
  const user = useUserStore((state) => state.user);
  const language = useLanguageStore((state) => state.language || 'en');
  const {
    stats,
    spendAnalysisData,
    kpiCards,
    performanceMetrics,
    isLoading,
    error,
    fetchDashboardStats,
    fetchSpendAnalysisData,
    fetchKpiCards,
    fetchPerformanceMetrics,
    clearError,
  } = useDashboard();

  const [recentActivityKpi, setRecentActivityKpi] = useState<any[]>([]);
  const [upcomingDeadlinesKpi, setUpcomingDeadlinesKpi] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all dashboard data
    fetchDashboardStats();
    fetchSpendAnalysisData();
    fetchKpiCards();
    fetchPerformanceMetrics();

    // Fetch unified KPI lists
    const fetchKpiLists = async () => {
      try {
        const [recentActivityData, deadlinesData] = await Promise.all([
          fetch('/api/dashboard/kpi-lists?type=recent_activity').then(res => res.json()),
          fetch('/api/dashboard/kpi-lists?type=upcoming_deadlines').then(res => res.json())
        ]);
        
        if (recentActivityData.success) {
          setRecentActivityKpi(recentActivityData.data);
        }
        if (deadlinesData.success) {
          setUpcomingDeadlinesKpi(deadlinesData.data);
        }
      } catch (error) {
        console.error('Error fetching KPI lists:', error);
      }
    };

    fetchKpiLists();
  }, [fetchDashboardStats, fetchSpendAnalysisData, fetchKpiCards, fetchPerformanceMetrics]);

  if (isLoading) {
    return (
      <MainLayout title="Dashboard" subtitle="Loading dashboard data…" icon="LayoutDashboard">
        <LoadingSpinner centered containerClassName="h-64" />
      </MainLayout>
    );
  }

  const userFirstName = user ? resolveLocalizedField(user.name, language, 'en') : '';
  const userDisplayName = userFirstName || user?.email || 'there';
  const userInitials = (() => {
    const source = userDisplayName?.trim() || 'GR';
    return source
      .split(' ')
      .map((word) => word[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase();
  })();

  const subtitle = `Welcome back, ${userDisplayName}!`;

  return (
    <MainLayout title="Dashboard" subtitle={subtitle} icon="LayoutDashboard">
      <div className="space-y-6">
        <UserWelcome
          userName={userDisplayName}
          avatar={user?.avatar}
          initials={userInitials}
          welcomeSubtitle="Here's what's happening with your business today."
          welcomeGradient="violet"
          welcomeShowPattern={true}
          errorMessage={error || null}
          onClearError={clearError}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Active Vendors"
            value={stats?.activeVendors || 0}
            subtitle="+2 this month"
            icon={Users}
            trend={{ value: 12.5, isPositive: true }}
            delay={0.1}
          />
          <KPICard
            title="Open Tenders"
            value={stats?.activeTenders || 0}
            subtitle="3 closing soon"
            icon={FileText}
            delay={0.2}
          />
          <KPICard
            title="Purchase Orders"
            value={stats?.totalPurchaseOrders || 0}
            subtitle="6 pending approval"
            icon={ShoppingCart}
            delay={0.3}
          />
          <KPICard
            title="Total Spend"
            value={`$${((stats?.totalSpend || 0) / 1000).toFixed(0)}K`}
            subtitle={`$${((stats?.monthlySpend || 0) / 1000).toFixed(0)}K this month`}
            icon={DollarSign}
            delay={0.4}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendAnalysisChart data={[
            { category: 'Pharmaceuticals', amount: 45000, percentage: 35, trend: 'up' },
            { category: 'Medical Devices', amount: 32000, percentage: 25, trend: 'stable' },
            { category: 'Laboratory Equipment', amount: 28000, percentage: 22, trend: 'down' },
            { category: 'Consumables', amount: 15000, percentage: 12, trend: 'up' },
            { category: 'Other', amount: 8000, percentage: 6, trend: 'stable' }
          ]} />
          <MonthlyTrendChart data={[
            { month: 'Jan', spend: 120000, orders: 45 },
            { month: 'Feb', spend: 135000, orders: 52 },
            { month: 'Mar', spend: 142000, orders: 48 },
            { month: 'Apr', spend: 128000, orders: 41 },
            { month: 'May', spend: 155000, orders: 58 },
            { month: 'Jun', spend: 148000, orders: 55 },
            { month: 'Jul', spend: 162000, orders: 62 },
            { month: 'Aug', spend: 158000, orders: 59 },
            { month: 'Sep', spend: 145000, orders: 51 },
            { month: 'Oct', spend: 138000, orders: 47 },
            { month: 'Nov', spend: 152000, orders: 56 },
            { month: 'Dec', spend: 168000, orders: 64 }
          ]} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorPerformanceChart data={[
            { vendor: 'ABC Pharmaceuticals', rating: 4.5, onTimeDelivery: 92, qualityScore: 4.3, totalOrders: 25 },
            { vendor: 'XYZ Medical', rating: 4.2, onTimeDelivery: 88, qualityScore: 4.1, totalOrders: 18 },
            { vendor: 'LabTech Solutions', rating: 4.7, onTimeDelivery: 95, qualityScore: 4.6, totalOrders: 32 },
            { vendor: 'MedSupply Co', rating: 3.9, onTimeDelivery: 85, qualityScore: 3.8, totalOrders: 15 },
            { vendor: 'BioTech Inc', rating: 4.4, onTimeDelivery: 90, qualityScore: 4.2, totalOrders: 22 }
          ]} />
          <ProcurementEfficiencyChart data={[
            { month: 'Jan', processingTime: 6.2, costSavings: 15000, cycleTime: 14, automationRate: 65 },
            { month: 'Feb', processingTime: 5.8, costSavings: 18000, cycleTime: 13, automationRate: 68 },
            { month: 'Mar', processingTime: 5.5, costSavings: 22000, cycleTime: 12, automationRate: 72 },
            { month: 'Apr', processingTime: 5.2, costSavings: 19000, cycleTime: 11, automationRate: 75 },
            { month: 'May', processingTime: 4.9, costSavings: 25000, cycleTime: 10, automationRate: 78 },
            { month: 'Jun', processingTime: 4.7, costSavings: 21000, cycleTime: 9, automationRate: 80 }
          ]} />
        </div>

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <KPIList
            title="Recent Activity"
            subtitle="Latest updates from your business operations."
            icon="TrendingUp"
            items={
              recentActivityKpi.length > 0
                ? recentActivityKpi.slice(0, 5).map((item) => ({
                    title: item.title,
                    subtitle: item.subtitle,
                    color: item.color,
                    progress: item.progress,
                    status: item.status,
                    url: item.url,
                  }))
                : []
            }
          />

          {/* Upcoming Deadlines */}
          <KPIList
            title="Upcoming Deadlines"
            subtitle="Important dates and deadlines to keep track of."
            icon="CheckCircle"
            items={
              upcomingDeadlinesKpi.length > 0
                ? upcomingDeadlinesKpi.slice(0, 5).map((item) => ({
                    title: item.title,
                    subtitle: item.subtitle,
                    color: item.color,
                    progress: item.progress,
                    status: item.status,
                    url: item.url,
                  }))
                : []
            }
          />
        </div>

        {/* Performance Metrics */}
        {performanceMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
          >
            <MetricCard
              metrics={[
                {
                  id: 'average-rating',
                  label: 'Average Vendor Rating',
                  value: performanceMetrics.vendorPerformance?.averageRating || 0,
                  format: 'number',
                  precision: 1,
                  icon: 'Star',
                  iconColor: 'amber',
                },
                {
                  id: 'processing-time',
                  label: 'Average Processing Time',
                  value: performanceMetrics.procurementEfficiency?.averageProcessingTime || 0,
                  unit: 'days',
                  format: 'number',
                  precision: 0,
                  icon: 'Timer',
                  iconColor: 'blue',
                },
                {
                  id: 'cost-savings',
                  label: 'Cost Savings',
                  value: performanceMetrics.procurementEfficiency?.costSavings || 0,
                  format: 'currency',
                  precision: 0,
                  prefix: '$',
                  icon: 'TrendingDown',
                  iconColor: 'emerald',
                },
              ]}
              gradient="violet"
              layout="grid"
              columns={3}
              footer={{
                icon: 'TrendingUp',
                text: 'Key performance indicators for your business operations.',
              }}
            />
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}


