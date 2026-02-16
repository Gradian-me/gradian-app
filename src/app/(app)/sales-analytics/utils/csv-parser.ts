import { SalesDataRow, SalesAnalyticsData } from '../types';

/**
 * Parse CSV string into SalesDataRow array
 */
export function parseSalesCSV(csvContent: string): SalesDataRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data: SalesDataRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with quoted values and commas
    const values = parseCSVLine(line);
    
    if (values.length < 5) continue;
    
    const year = parseInt(values[0]?.trim() || '0', 10);
    const customer = values[1]?.trim() || '';
    const product = values[2]?.trim() || '';
    
    // Parse quantity - remove commas, spaces, and handle parentheses (negative)
    let quantityStr = values[3]?.trim().replace(/,/g, '').replace(/\s/g, '') || '0';
    // Handle negative values in parentheses: (123) -> -123
    if (quantityStr.startsWith('(') && quantityStr.endsWith(')')) {
      quantityStr = '-' + quantityStr.slice(1, -1);
    }
    const quantity = parseFloat(quantityStr) || 0;
    
    // Parse amount - remove commas, spaces, quotes, and handle parentheses (negative)
    let amountStr = values[4]?.trim().replace(/,/g, '').replace(/\s/g, '').replace(/"/g, '') || '0';
    // Handle negative values in parentheses: (123) -> -123
    if (amountStr.startsWith('(') && amountStr.endsWith(')')) {
      amountStr = '-' + amountStr.slice(1, -1);
    }
    // Handle dash or empty values
    if (amountStr === '-' || amountStr === '' || amountStr === ' -   ') {
      continue;
    }
    const amount = parseFloat(amountStr) || 0;
    
    // Skip rows with invalid data (allow negative values but skip zero/empty)
    if (!year || !customer || !product || quantity === 0 || amount === 0) {
      continue;
    }
    
    data.push({
      year,
      customer,
      product,
      salesQuantity: quantity,
      salesAmount: amount,
    });
  }
  
  return data;
}

/**
 * Parse a CSV line handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Process raw sales data into analytics-ready format
 */
export function processSalesData(rawData: SalesDataRow[]): SalesAnalyticsData {
  // Group by year
  const byYear = new Map<number, { revenue: number; quantity: number; count: number }>();
  const byCustomer = new Map<string, { revenue: number; quantity: number; years: Set<number> }>();
  const byProduct = new Map<string, { revenue: number; quantity: number; years: Set<number> }>();
  const byCustomerYear = new Map<string, Map<number, { revenue: number; quantity: number }>>();
  const byProductYear = new Map<string, Map<number, { revenue: number; quantity: number }>>();
  
  let totalRevenue = 0;
  let totalQuantity = 0;
  
  rawData.forEach(row => {
    totalRevenue += row.salesAmount;
    totalQuantity += row.salesQuantity;
    
    // By year
    const yearData = byYear.get(row.year) || { revenue: 0, quantity: 0, count: 0 };
    yearData.revenue += row.salesAmount;
    yearData.quantity += row.salesQuantity;
    yearData.count += 1;
    byYear.set(row.year, yearData);
    
    // By customer
    const customerData = byCustomer.get(row.customer) || { revenue: 0, quantity: 0, years: new Set() };
    customerData.revenue += row.salesAmount;
    customerData.quantity += row.salesQuantity;
    customerData.years.add(row.year);
    byCustomer.set(row.customer, customerData);
    
    // By product
    const productData = byProduct.get(row.product) || { revenue: 0, quantity: 0, years: new Set() };
    productData.revenue += row.salesAmount;
    productData.quantity += row.salesQuantity;
    productData.years.add(row.year);
    byProduct.set(row.product, productData);
    
    // By customer-year
    if (!byCustomerYear.has(row.customer)) {
      byCustomerYear.set(row.customer, new Map());
    }
    const customerYearMap = byCustomerYear.get(row.customer)!;
    const customerYearData = customerYearMap.get(row.year) || { revenue: 0, quantity: 0 };
    customerYearData.revenue += row.salesAmount;
    customerYearData.quantity += row.salesQuantity;
    customerYearMap.set(row.year, customerYearData);
    
    // By product-year
    if (!byProductYear.has(row.product)) {
      byProductYear.set(row.product, new Map());
    }
    const productYearMap = byProductYear.get(row.product)!;
    const productYearData = productYearMap.get(row.year) || { revenue: 0, quantity: 0 };
    productYearData.revenue += row.salesAmount;
    productYearData.quantity += row.salesQuantity;
    productYearMap.set(row.year, productYearData);
  });
  
  // Calculate revenue by year
  const years = Array.from(byYear.keys()).sort();
  const revenueByYear = years.map(year => {
    const data = byYear.get(year)!;
    return {
      year,
      revenue: data.revenue,
      quantity: data.quantity,
      avgPriceProxy: data.quantity > 0 ? data.revenue / data.quantity : 0,
    };
  });
  
  // Calculate year-over-year growth
  const latestYear = years[years.length - 1];
  const prevYearForGrowth = years[years.length - 2];
  const latestRevenue = byYear.get(latestYear)?.revenue || 0;
  const previousRevenue = byYear.get(prevYearForGrowth)?.revenue || 0;
  const yearOverYearGrowth = previousRevenue > 0 ? ((latestRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  
  // Calculate revenue by customer
  const revenueByCustomer = Array.from(byCustomer.entries())
    .map(([customer, data]) => {
      // Calculate growth rate
      const customerYears = Array.from(data.years).sort();
      const firstYear = customerYears[0];
      const lastYear = customerYears[customerYears.length - 1];
      
      const firstYearData = byCustomerYear.get(customer)?.get(firstYear) || { revenue: 0, quantity: 0 };
      const lastYearData = byCustomerYear.get(customer)?.get(lastYear) || { revenue: 0, quantity: 0 };
      
      const growthRate = firstYearData.revenue > 0 
        ? ((lastYearData.revenue - firstYearData.revenue) / firstYearData.revenue) * 100 
        : 0;
      
      return {
        customer,
        revenue: data.revenue,
        quantity: data.quantity,
        growthRate,
        revenueShare: (data.revenue / totalRevenue) * 100,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  
  // Calculate revenue by product
  const revenueByProduct = Array.from(byProduct.entries())
    .map(([product, data]) => ({
      product,
      revenue: data.revenue,
      quantity: data.quantity,
      revenueShare: (data.revenue / totalRevenue) * 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  
  // Calculate customer momentum (normalized)
  const maxRevenue = Math.max(...revenueByCustomer.map(c => c.revenue));
  const maxGrowth = Math.max(...revenueByCustomer.map(c => Math.abs(c.growthRate)));
  
  const customerMomentum = revenueByCustomer.map(customer => ({
    customer: customer.customer,
    revenueContribution: maxRevenue > 0 ? customer.revenue / maxRevenue : 0,
    growthMomentum: maxGrowth > 0 ? (customer.growthRate + maxGrowth) / (2 * maxGrowth) : 0.5,
    revenue: customer.revenue,
    growthRate: customer.growthRate,
  }));
  
  // Calculate product concentration and stability
  const productConcentration = revenueByProduct.map(product => {
    const productYears = byProductYear.get(product.product);
    if (!productYears) {
      return {
        product: product.product,
        revenue: product.revenue,
        revenueShare: product.revenueShare,
        stability: 0,
      };
    }
    
    const yearRevenues = Array.from(productYears.values()).map(d => d.revenue);
    const mean = yearRevenues.reduce((a, b) => a + b, 0) / yearRevenues.length;
    const variance = yearRevenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / yearRevenues.length;
    const stability = mean > 0 ? 1 / (1 + Math.sqrt(variance) / mean) : 0; // Higher is more stable
    
    return {
      product: product.product,
      revenue: product.revenue,
      revenueShare: product.revenueShare,
      stability,
    };
  });
  
  // Calculate volume vs revenue
  const volumeVsRevenue = revenueByYear.map((yearData, index) => {
    const prevYearData = index > 0 ? revenueByYear[index - 1] : null;
    const revenueGrowth = prevYearData && prevYearData.revenue > 0
      ? ((yearData.revenue - prevYearData.revenue) / prevYearData.revenue) * 100
      : 0;
    const quantityGrowth = prevYearData && prevYearData.quantity > 0
      ? ((yearData.quantity - prevYearData.quantity) / prevYearData.quantity) * 100
      : 0;
    
    return {
      year: yearData.year,
      revenue: yearData.revenue,
      quantity: yearData.quantity,
      avgPriceProxy: yearData.avgPriceProxy,
      revenueGrowth,
      quantityGrowth,
    };
  });
  
  // Top customer and product revenue share
  const topCustomerRevenueShare = revenueByCustomer[0]?.revenueShare || 0;
  const topProductRevenueShare = revenueByProduct[0]?.revenueShare || 0;
  
  const avgPriceProxy = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
  
  // Calculate top 10 customers and products for last year
  const lastYear = latestYear;
  const lastYearTotalRevenue = byYear.get(lastYear)?.revenue || 0;
  
  // Get customers for last year only
  const customersLastYear = Array.from(byCustomerYear.entries())
    .map(([customer, yearMap]) => {
      const lastYearData = yearMap.get(lastYear) || { revenue: 0, quantity: 0 };
      return {
        customer,
        revenue: lastYearData.revenue,
        quantity: lastYearData.quantity,
        revenueShare: lastYearTotalRevenue > 0 ? (lastYearData.revenue / lastYearTotalRevenue) * 100 : 0,
        avgPriceProxy: lastYearData.quantity > 0 ? lastYearData.revenue / lastYearData.quantity : 0,
      };
    })
    .filter(c => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // Get products for last year only
  const productsLastYear = Array.from(byProductYear.entries())
    .map(([product, yearMap]) => {
      const lastYearData = yearMap.get(lastYear) || { revenue: 0, quantity: 0 };
      return {
        product,
        revenue: lastYearData.revenue,
        quantity: lastYearData.quantity,
        revenueShare: lastYearTotalRevenue > 0 ? (lastYearData.revenue / lastYearTotalRevenue) * 100 : 0,
        avgPriceProxy: lastYearData.quantity > 0 ? lastYearData.revenue / lastYearData.quantity : 0,
      };
    })
    .filter(p => p.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // Calculate trending and declining products (year-over-year growth)
  // Compare last year vs previous year (not just last two years product appeared)
  const previousYear = years.length >= 2 ? years[years.length - 2] : null;
  const currentYear = lastYear;
  
  if (!previousYear) {
    // Not enough years of data
    return {
      kpis: {
        totalRevenue,
        totalQuantity,
        avgPriceProxy,
        yearOverYearGrowth,
        topCustomerRevenueShare,
        topProductRevenueShare,
      },
      revenueByYear,
      revenueByCustomer,
      revenueByProduct,
      customerMomentum,
      productConcentration,
      volumeVsRevenue,
      top10CustomersLastYear: customersLastYear,
      top10ProductsLastYear: productsLastYear,
      top10TrendingProducts: [],
      top10DecliningProducts: [],
    };
  }
  
  // Get all products that existed in either previous or current year
  const allProducts = Array.from(byProductYear.keys());
  
  const productTrends: Array<{
    product: string;
    revenue: number;
    quantity: number;
    growthRate: number;
    previousYearRevenue: number;
    currentYearRevenue: number;
  }> = [];
  
  for (const product of allProducts) {
    const yearMap = byProductYear.get(product);
    if (!yearMap) continue;
    
    const previousYearData = yearMap.get(previousYear) || { revenue: 0, quantity: 0 };
    const currentYearData = yearMap.get(currentYear) || { revenue: 0, quantity: 0 };
    
    // Calculate growth rate
    let growthRate: number;
    if (previousYearData.revenue > 0 && currentYearData.revenue > 0) {
      // Product existed in both years - calculate normal growth
      growthRate = ((currentYearData.revenue - previousYearData.revenue) / previousYearData.revenue) * 100;
    } else if (previousYearData.revenue === 0 && currentYearData.revenue > 0) {
      // New product - set to high growth rate for trending
      growthRate = 1000; // 1000% to indicate new product
    } else if (previousYearData.revenue > 0 && currentYearData.revenue === 0) {
      // Discontinued product - set to -100% for declining
      growthRate = -100;
    } else {
      // No revenue in either year - skip
      continue;
    }
    
    productTrends.push({
      product,
      revenue: currentYearData.revenue,
      quantity: currentYearData.quantity,
      growthRate,
      previousYearRevenue: previousYearData.revenue,
      currentYearRevenue: currentYearData.revenue,
    });
  }
  
  // Top 10 trending products (highest growth rate, must have current year revenue > 0)
  const top10TrendingProducts = [...productTrends]
    .filter(p => p.currentYearRevenue > 0) // Only products with current year revenue
    .sort((a, b) => b.growthRate - a.growthRate)
    .slice(0, 10);
  
  // Top 10 declining products (lowest/negative growth rate, must have existed in previous year)
  const top10DecliningProducts = [...productTrends]
    .filter(p => p.previousYearRevenue > 0) // Only products that existed in previous year
    .sort((a, b) => a.growthRate - b.growthRate)
    .slice(0, 10);
  
  return {
    kpis: {
      totalRevenue,
      totalQuantity,
      avgPriceProxy,
      yearOverYearGrowth,
      topCustomerRevenueShare,
      topProductRevenueShare,
    },
    revenueByYear,
    revenueByCustomer,
    revenueByProduct,
    customerMomentum,
    productConcentration,
    volumeVsRevenue,
    top10CustomersLastYear: customersLastYear,
    top10ProductsLastYear: productsLastYear,
    top10TrendingProducts,
    top10DecliningProducts,
  };
}

