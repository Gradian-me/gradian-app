import { NextResponse } from 'next/server';
import { readSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { calculateDashboardMetrics, calculateSpendAnalysis, calculateMonthlyTrends } from '@/lib/measures';

export async function GET() {
  try {
    // Use dynamic data storage for mock data
    const purchaseOrders = readSchemaData('purchaseOrders');
    const vendors = readSchemaData('vendors');
    const tenders = readSchemaData('tenders');
    const shipments = readSchemaData('shipments');
    const invoices = readSchemaData('invoices');

    const metrics = calculateDashboardMetrics({
      purchaseOrders,
      vendors,
      tenders,
      shipments,
      invoices,
    });

    const spendAnalysis = calculateSpendAnalysis({
      purchaseOrders,
    });

    const monthlyTrends = calculateMonthlyTrends({
      purchaseOrders,
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        spendAnalysis,
        monthlyTrends,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
