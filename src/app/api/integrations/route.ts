import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'data', 'all-integrations.json');

/**
 * GET - Get all integrations
 */
export async function GET(request: NextRequest) {
  try {
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const integrations = JSON.parse(fileContent);
    
    // Support search parameter
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    let filteredIntegrations = integrations;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredIntegrations = integrations.filter((integration: any) =>
        integration.title.toLowerCase().includes(searchLower) ||
        integration.description.toLowerCase().includes(searchLower) ||
        integration.id.toLowerCase().includes(searchLower)
      );
    }
    
    return NextResponse.json({
      success: true,
      data: filteredIntegrations,
      count: filteredIntegrations.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch integrations'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.id || !body.title || !body.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: id, title, description'
        },
        { status: 400 }
      );
    }
    
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const integrations = JSON.parse(fileContent);
    
    // Check if integration with same id already exists
    if (integrations.find((i: any) => i.id === body.id)) {
      return NextResponse.json(
        {
          success: false,
          error: `Integration with id "${body.id}" already exists`
        },
        { status: 409 }
      );
    }
    
    // Add new integration
    const newIntegration = {
      id: body.id,
      title: body.title,
      description: body.description,
      icon: body.icon || 'Settings',
      color: body.color || '#8B5CF6',
      lastSynced: body.lastSynced || '',
      targetRoute: body.targetRoute || `/integrations/sync?id=${body.id}`,
      targetMethod: body.targetMethod || 'GET',
      sourceRoute: body.sourceRoute || undefined,
      sourceMethod: body.sourceMethod || 'GET',
      sourceDataPath: body.sourceDataPath || undefined,
    };
    
    integrations.push(newIntegration);
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(integrations, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: newIntegration
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create integration'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update an integration
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
    const integrations = JSON.parse(fileContent);
    
    const index = integrations.findIndex((i: any) => i.id === body.id);
    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Integration with id "${body.id}" not found`
        },
        { status: 404 }
      );
    }
    
    // Update integration
    integrations[index] = {
      ...integrations[index],
      ...body,
      id: body.id // Ensure id doesn't change
    };
    
    // Write back to file
    await writeFile(DATA_FILE, JSON.stringify(integrations, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: integrations[index]
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update integration'
      },
      { status: 500 }
    );
  }
}

