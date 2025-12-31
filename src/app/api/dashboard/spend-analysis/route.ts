import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

export async function GET(request: NextRequest) {
  // Check authentication if REQUIRE_LOGIN is true
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  try {
    // Mock spend analysis data
    const spendAnalysisData = {
      byCategory: {
        labels: ['Pharmaceuticals', 'Medical Devices', 'Laboratory Equipment', 'Consumables', 'Other'],
        datasets: [
          {
            label: 'Spend by Category',
            data: [450000, 320000, 280000, 150000, 50000],
            backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
            borderColor: ['#dc2626', '#d97706', '#059669', '#2563eb', '#7c3aed'],
            borderWidth: 2
          }
        ]
      },
      byVendor: {
        labels: ['ABC Pharmaceuticals', 'XYZ Medical', 'LabTech Solutions', 'MedSupply Co', 'BioTech Inc'],
        datasets: [
          {
            label: 'Spend by Vendor',
            data: [180000, 150000, 120000, 95000, 80000],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            borderColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'],
            borderWidth: 2
          }
        ]
      },
      monthlyTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          {
            label: 'Monthly Spend',
            data: [120000, 135000, 142000, 128000, 155000, 148000, 162000, 158000, 145000, 138000, 152000, 168000],
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: '#3b82f6',
            borderWidth: 2,
            fill: true
          },
          {
            label: 'Order Count',
            data: [45, 52, 48, 41, 58, 55, 62, 59, 51, 47, 56, 64],
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderColor: '#10b981',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y1'
          }
        ]
      },
      quarterlyComparison: {
        labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'],
        datasets: [
          {
            label: 'Quarterly Spend',
            data: [397000, 431000, 465000, 458000],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
            borderColor: ['#2563eb', '#059669', '#d97706', '#dc2626'],
            borderWidth: 2
          }
        ]
      }
    };

    return NextResponse.json({
      success: true,
      data: spendAnalysisData
    });
  } catch (error) {
    console.error('Error fetching spend analysis data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch spend analysis data' },
      { status: 500 }
    );
  }
}
