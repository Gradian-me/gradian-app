import { SalesAnalyticsData } from './types';
import { parseSalesCSV, processSalesData } from './utils/csv-parser';

// Empty data structure for initial render
const emptyData: SalesAnalyticsData = {
  kpis: {
    totalRevenue: 0,
    totalQuantity: 0,
    avgPriceProxy: 0,
    yearOverYearGrowth: 0,
    topCustomerRevenueShare: 0,
    topProductRevenueShare: 0,
  },
  revenueByYear: [],
  revenueByCustomer: [],
  revenueByProduct: [],
  customerMomentum: [],
  productConcentration: [],
  volumeVsRevenue: [],
  top10CustomersLastYear: [],
  top10ProductsLastYear: [],
  top10TrendingProducts: [],
  top10DecliningProducts: [],
};

// For client-side usage, export a function that fetches from API
export async function fetchSalesAnalyticsData(): Promise<SalesAnalyticsData> {
  try {
    const response = await fetch('/api/sales-data');
    if (!response.ok) {
      throw new Error('Failed to fetch sales data');
    }
    const { data } = await response.json();
    return processSalesData(data);
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return emptyData;
  }
}

// Server-side demo data (for initial render - will be replaced by client-side fetch)
export const salesAnalyticsDemoData: SalesAnalyticsData = emptyData;

