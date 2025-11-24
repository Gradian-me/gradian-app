import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'data', 'health.json');

/**
 * GET - Get all health services
 */
export async function GET(request: NextRequest) {
  try {
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const healthServices = JSON.parse(fileContent);
    
    // Support search parameter
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    let filteredServices = healthServices;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredServices = healthServices.filter((service: any) =>
        service.serviceTitle.toLowerCase().includes(searchLower) ||
        service.id.toLowerCase().includes(searchLower)
      );
    }
    
    return NextResponse.json({
      success: true,
      data: filteredServices,
      count: filteredServices.length
    });
  } catch (error) {
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
    
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const healthServices = JSON.parse(fileContent);
    
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
    };
    
    healthServices.push(newService);
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(healthServices, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: newService
    }, { status: 201 });
  } catch (error) {
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
    
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const healthServices = JSON.parse(fileContent);
    
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
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(healthServices, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: healthServices[index]
    });
  } catch (error) {
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
    
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const healthServices = JSON.parse(fileContent);
    
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
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(healthServices, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: `Health service "${id}" deleted successfully`
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete health service'
      },
      { status: 500 }
    );
  }
}

