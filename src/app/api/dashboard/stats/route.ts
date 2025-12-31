import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

export async function GET(request: NextRequest) {
  // Check authentication if REQUIRE_LOGIN is true
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  try {
    // Mock dashboard stats data
    const stats = {
      totalVendors: 25,
      activeVendors: 18,
      totalTenders: 12,
      activeTenders: 8,
      totalPurchaseOrders: 45,
      pendingPurchaseOrders: 6,
      totalSpend: 1250000,
      monthlySpend: 125000,
      averageProcessingTime: 5.2,
      topCategories: [
        { category: 'Pharmaceuticals', count: 15, value: 450000 },
        { category: 'Medical Devices', count: 8, value: 320000 },
        { category: 'Laboratory Equipment', count: 6, value: 280000 },
        { category: 'Consumables', count: 12, value: 150000 },
        { category: 'Other', count: 4, value: 50000 }
      ],
      recentActivity: [
        {
          id: '1',
          type: 'vendor_created',
          title: 'New Vendor Added',
          description: 'ABC Pharmaceuticals has been added to the vendor list',
          timestamp: new Date('2024-12-10T10:30:00'),
          userId: 'user1',
          userName: 'Mahyar Abidi',
          metadata: { vendorId: 'vendor1' }
        },
        {
          id: '2',
          type: 'tender_published',
          title: 'Tender Published',
          description: 'HPLC Equipment tender has been published',
          timestamp: new Date('2024-12-10T08:45:00'),
          userId: 'user2',
          userName: 'Dr. Sarah Chen',
          metadata: { tenderId: 'tender1' }
        },
        {
          id: '3',
          type: 'po_created',
          title: 'Purchase Order Created',
          description: 'New purchase order for medical supplies',
          timestamp: new Date('2024-12-10T06:20:00'),
          userId: 'user3',
          userName: 'John Smith',
          metadata: { poId: 'po1' }
        },
        {
          id: '4',
          type: 'po_approved',
          title: 'PO Approved',
          description: 'Purchase order has been approved',
          timestamp: new Date('2024-12-10T04:15:00'),
          userId: 'user2',
          userName: 'Dr. Sarah Chen',
          metadata: { poId: 'po1' }
        },
        {
          id: '5',
          type: 'tender_awarded',
          title: 'Tender Awarded',
          description: 'Laboratory equipment tender has been awarded',
          timestamp: new Date('2024-12-09T16:30:00'),
          userId: 'user1',
          userName: 'Mahyar Abidi',
          metadata: { tenderId: 'tender2', vendorId: 'vendor2' }
        }
      ],
      upcomingDeadlines: [
        {
          id: '1',
          type: 'tender_closing',
          title: 'HPLC Equipment Tender',
          description: 'Submission deadline for HPLC equipment tender',
          dueDate: new Date('2024-12-12T17:00:00'),
          priority: 'high',
          status: 'pending',
          entityId: 'tender3',
          entityType: 'tender'
        },
        {
          id: '2',
          type: 'po_delivery',
          title: 'Purchase Order Delivery',
          description: 'Expected delivery of medical supplies',
          dueDate: new Date('2024-12-15T09:00:00'),
          priority: 'medium',
          status: 'pending',
          entityId: 'po2',
          entityType: 'purchase_order'
        },
        {
          id: '3',
          type: 'approval_due',
          title: 'Vendor Evaluation',
          description: 'Quarterly vendor performance review',
          dueDate: new Date('2024-12-17T14:00:00'),
          priority: 'medium',
          status: 'pending',
          entityId: 'eval1',
          entityType: 'approval'
        },
        {
          id: '4',
          type: 'approval_due',
          title: 'Contract Renewal',
          description: 'Annual contract renewal with key supplier',
          dueDate: new Date('2024-12-24T16:00:00'),
          priority: 'low',
          status: 'pending',
          entityId: 'contract1',
          entityType: 'approval'
        }
      ],
      performanceMetrics: {
        vendorPerformance: {
          averageRating: 4.2,
          onTimeDelivery: 87.5,
          qualityScore: 92.3
        },
        tenderPerformance: {
          averageResponseTime: 3.2,
          quotationRate: 78.5,
          awardRate: 65.2
        },
        procurementEfficiency: {
          averageProcessingTime: 5.2,
          costSavings: 125000,
          cycleTime: 12.5
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
