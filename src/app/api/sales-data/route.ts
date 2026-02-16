import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseSalesCSV } from '@/app/(app)/sales-analytics/utils/csv-parser';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'SalesData.csv');
    const csvContent = readFileSync(filePath, 'utf-8');
    const data = parseSalesCSV(csvContent);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error loading sales data:', error);
    return NextResponse.json({ error: 'Failed to load sales data' }, { status: 500 });
  }
}

