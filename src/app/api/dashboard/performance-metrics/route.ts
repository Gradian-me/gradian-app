import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

export async function GET(request: NextRequest) {
  // Check authentication if REQUIRE_LOGIN is true
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  try {
    // Mock performance metrics data
    const performanceMetrics = {
      vendorPerformance: {
        averageRating: 4.2,
        onTimeDelivery: 87.5,
        qualityScore: 92.3,
        responseTime: 2.1,
        complianceRate: 96.8
      },
      tenderPerformance: {
        averageResponseTime: 3.2,
        quotationRate: 78.5,
        awardRate: 65.2,
        averageBidders: 4.8,
        successRate: 89.3
      },
      procurementEfficiency: {
        averageProcessingTime: 5.2,
        costSavings: 125000,
        cycleTime: 12.5,
        automationRate: 73.2,
        errorRate: 2.1
      },
      financialMetrics: {
        totalSpend: 1250000,
        monthlySpend: 125000,
        costPerOrder: 2777.78,
        budgetUtilization: 83.3,
        savingsRate: 8.7
      },
      operationalMetrics: {
        totalOrders: 450,
        completedOrders: 398,
        pendingOrders: 52,
        averageOrderValue: 2777.78,
        orderFulfillmentRate: 88.4
      }
    };

    return NextResponse.json({
      success: true,
      data: performanceMetrics
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}
