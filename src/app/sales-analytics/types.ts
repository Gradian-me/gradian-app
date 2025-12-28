export type SalesDataRow = {
  year: number;
  customer: string;
  product: string;
  salesQuantity: number;
  salesAmount: number;
};

export type SalesAnalyticsData = {
  kpis: {
    totalRevenue: number;
    totalQuantity: number;
    avgPriceProxy: number;
    yearOverYearGrowth: number;
    topCustomerRevenueShare: number;
    topProductRevenueShare: number;
  };
  revenueByYear: Array<{
    year: number;
    revenue: number;
    quantity: number;
    avgPriceProxy: number;
  }>;
  revenueByCustomer: Array<{
    customer: string;
    revenue: number;
    quantity: number;
    growthRate: number;
    revenueShare: number;
  }>;
  revenueByProduct: Array<{
    product: string;
    revenue: number;
    quantity: number;
    revenueShare: number;
  }>;
  customerMomentum: Array<{
    customer: string;
    revenueContribution: number; // normalized 0-1
    growthMomentum: number; // normalized 0-1
    revenue: number;
    growthRate: number;
  }>;
  productConcentration: Array<{
    product: string;
    revenue: number;
    revenueShare: number;
    stability: number; // variance in revenue across years
  }>;
  volumeVsRevenue: Array<{
    year: number;
    revenue: number;
    quantity: number;
    avgPriceProxy: number;
    revenueGrowth: number;
    quantityGrowth: number;
  }>;
  top10CustomersLastYear: Array<{
    customer: string;
    revenue: number;
    quantity: number;
    revenueShare: number;
    avgPriceProxy: number;
  }>;
  top10ProductsLastYear: Array<{
    product: string;
    revenue: number;
    quantity: number;
    revenueShare: number;
    avgPriceProxy: number;
  }>;
  top10TrendingProducts: Array<{
    product: string;
    revenue: number;
    quantity: number;
    growthRate: number;
    previousYearRevenue: number;
    currentYearRevenue: number;
  }>;
  top10DecliningProducts: Array<{
    product: string;
    revenue: number;
    quantity: number;
    growthRate: number;
    previousYearRevenue: number;
    currentYearRevenue: number;
  }>;
};

