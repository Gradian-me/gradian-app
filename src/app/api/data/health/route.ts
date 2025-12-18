import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

const DATA_FILE = join(process.cwd(), 'data', 'health.json');
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
    
    // Ensure health.json file exists
    if (!existsSync(DATA_FILE)) {
      const defaultServices: any[] = [];
      await writeFile(DATA_FILE, JSON.stringify(defaultServices, null, 2), 'utf-8');
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error ensuring data file: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Continue anyway - will handle in read operations
  }
}

/**
 * Read health services from file
 */
async function readHealthServices(): Promise<any[]> {
  try {
    await ensureDataFile();
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const healthServices = JSON.parse(fileContent);
    return Array.isArray(healthServices) ? healthServices : [];
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureDataFile();
      return [];
    }
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading health services: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * GET - Get all health services
 */
export async function GET(request: NextRequest) {
  try {
    const healthServices = await readHealthServices();
    
    // Ensure default values for existing services
    const servicesWithDefaults = healthServices.map((service: any) => ({
      ...service,
      failCycleToSendEmail: service.failCycleToSendEmail ?? 3,
    }));
    
    // Support search parameter
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    let filteredServices = servicesWithDefaults;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredServices = servicesWithDefaults.filter((service: any) =>
        service.serviceTitle?.toLowerCase().includes(searchLower) ||
        service.id?.toLowerCase().includes(searchLower)
      );
    }
    
    return NextResponse.json({
      success: true,
      data: filteredServices,
      count: filteredServices.length
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in GET /api/data/health: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch health services'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new health service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.id || !body.serviceTitle || !body.healthApi) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: id, serviceTitle, healthApi'
        },
        { status: 400 }
      );
    }
    
    const healthServices = await readHealthServices();
    
    // Check if service with same id already exists
    if (healthServices.find((s: any) => s.id === body.id)) {
      return NextResponse.json(
        {
          success: false,
          error: `Health service with id "${body.id}" already exists`
        },
        { status: 409 }
      );
    }
    
    // Add new service
    const newService = {
      id: body.id,
      serviceTitle: body.serviceTitle,
      icon: body.icon || 'Activity',
      color: body.color || 'blue',
      healthApi: body.healthApi,
      healthyJsonPath: body.healthyJsonPath || 'status',
      isActive: body.isActive !== undefined ? body.isActive : true, // Default to active
      monitoringEnabled: body.monitoringEnabled !== undefined ? body.monitoringEnabled : true, // Default to enabled
      failCycleToSendEmail: body.failCycleToSendEmail !== undefined ? body.failCycleToSendEmail : 3, // Default to 3
    };
    
    healthServices.push(newService);
    
    // Ensure data file exists before writing
    await ensureDataFile();
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(healthServices, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: newService
    }, { status: 201 });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in POST /api/data/health: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create health service'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a health service
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id'
        },
        { status: 400 }
      );
    }
    
    const healthServices = await readHealthServices();
    
    const index = healthServices.findIndex((s: any) => s.id === body.id);
    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Health service with id "${body.id}" not found`
        },
        { status: 404 }
      );
    }
    
    // Update service
    healthServices[index] = {
      ...healthServices[index],
      ...body,
      id: body.id, // Ensure id doesn't change
    };
    
    // Ensure data file exists before writing
    await ensureDataFile();
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(healthServices, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: healthServices[index]
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in PUT /api/data/health: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update health service'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update a specific field in a health service
 */
async function updateHealthServiceField(
  serviceId: string,
  field: 'lastChecked' | 'lastEmailSent',
  value: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const healthServices = await readHealthServices();
    const index = healthServices.findIndex((s: any) => s.id === serviceId);
    
    if (index === -1) {
      return {
        success: false,
        error: `Health service with id "${serviceId}" not found`
      };
    }
    
    // Update the field
    healthServices[index] = {
      ...healthServices[index],
      [field]: value,
    };
    
    // Ensure data file exists before writing
    await ensureDataFile();
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(healthServices, null, 2), 'utf-8');
    
    return {
      success: true,
      data: healthServices[index]
    };
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error updating ${field} for health service: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to update ${field}`
    };
  }
}

/**
 * PATCH - Update lastChecked or lastEmailSent timestamp for a service
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, field, timestamp } = body;
    
    if (!serviceId || !field || !timestamp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: serviceId, field (lastChecked or lastEmailSent), timestamp'
        },
        { status: 400 }
      );
    }
    
    if (field !== 'lastChecked' && field !== 'lastEmailSent') {
      return NextResponse.json(
        {
          success: false,
          error: 'Field must be either "lastChecked" or "lastEmailSent"'
        },
        { status: 400 }
      );
    }
    
    const result = await updateHealthServiceField(serviceId, field, timestamp);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: result.error?.includes('not found') ? 404 : 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in PATCH /api/data/health: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update health service timestamp'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a health service
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: id'
        },
        { status: 400 }
      );
    }
    
    const healthServices = await readHealthServices();
    
    const index = healthServices.findIndex((s: any) => s.id === id);
    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Health service with id "${id}" not found`
        },
        { status: 404 }
      );
    }
    
    // Remove service
    healthServices.splice(index, 1);
    
    // Ensure data file exists before writing
    await ensureDataFile();
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(healthServices, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: `Health service "${id}" deleted successfully`
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in DELETE /api/data/health: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete health service'
      },
      { status: 500 }
    );
  }
}

