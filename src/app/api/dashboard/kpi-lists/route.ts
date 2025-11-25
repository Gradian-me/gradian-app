import { NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_FILE = join(process.cwd(), 'data', 'kpi-lists.json');
const DATA_DIR = join(process.cwd(), 'data');

/**
 * Ensure data directory and file exist
 */
async function ensureDataFile(): Promise<void> {
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    
    // Ensure kpi-lists.json file exists
    if (!existsSync(DATA_FILE)) {
      // If file doesn't exist, return empty array
      // The file should be created manually or via another process
      return;
    }
  } catch (error) {
    console.error('Error ensuring data file:', error);
    // Continue anyway - will handle in read operations
  }
}

/**
 * Read KPI lists from file
 */
async function readKpiLists(): Promise<any[]> {
  try {
    await ensureDataFile();
    
    if (!existsSync(DATA_FILE)) {
      return [];
    }
    
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Ensure data is an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error reading KPI lists:', error);
    return [];
  }
}

/**
 * GET /api/dashboard/kpi-lists?type=recent_activity
 * Filter KPI lists by type parameter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    
    const allKpiLists = await readKpiLists();
    
    // Filter by type if provided
    let filteredData = allKpiLists;
    if (type) {
      filteredData = allKpiLists.filter(item => item.type === type);
    }
    
    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
    
    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length,
      type: type || 'all'
    });
  } catch (error) {
    console.error('Error fetching KPI lists:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch KPI lists',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

