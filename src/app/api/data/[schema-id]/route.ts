// Dynamic CRUD API Routes
// Handles all CRUD operations for any schema dynamically

import { NextRequest, NextResponse } from 'next/server';
import { BaseRepository } from '@/gradian-ui/shared/domain/repositories/base.repository';
import { BaseService } from '@/gradian-ui/shared/domain/services/base.service';
import { BaseController } from '@/gradian-ui/shared/domain/controllers/base.controller';
import { BaseEntity } from '@/gradian-ui/shared/domain/types/base.types';
import { isValidSchemaId, getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { loadAllCompanies, clearCompaniesCache } from '@/gradian-ui/shared/utils/companies-loader';
import { isDemoModeEnabled, proxyDataRequest } from '../utils';

/**
 * Create controller instance for the given schema
 */
async function createController(schemaId: string) {
  const schema = await getSchemaById(schemaId);
  const repository = new BaseRepository<BaseEntity>(schemaId);
  const service = new BaseService<BaseEntity>(repository, schema.singular_name || 'Entity', schemaId);
  const controller = new BaseController<BaseEntity>(
    service, 
    schema.singular_name || 'Entity',
    schema.isNotCompanyBased || false
  );
  
  return controller;
}

/**
 * GET - Get all entities for a schema
 * Example: GET /api/data/vendors?search=test&status=ACTIVE
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string }> }
) {
  const { 'schema-id': schemaId } = await params;
  const targetPath = `/api/data/${schemaId}${request.nextUrl.search}`;

  if (!isDemoModeEnabled()) {
    return proxyDataRequest(request, targetPath);
  }

  try {
    // Validate schema ID
    if (!(await isValidSchemaId(schemaId))) {
      return NextResponse.json(
        { success: false, error: `Invalid schema ID: ${schemaId}` },
        { status: 404 }
      );
    }

    // Get schema to check if it's company-based
    const schema = await getSchemaById(schemaId);
    
    // Special handling for companies - use cached loader
    // Note: Companies don't have password fields, so no filtering needed
    // Companies schema is always not company-based (it doesn't filter by itself)
    if (schemaId === 'companies') {
      try {
        const companies = await loadAllCompanies();
        return NextResponse.json({
          success: true,
          data: companies,
        });
      } catch (error) {
        // If cache fails, fall through to normal controller
        console.warn('Companies cache load failed, using controller:', error);
      }
    }

    // Validate companyIds parameter for company-based schemas
    // If schema is company-based (isNotCompanyBased is not true), companyIds is required
    if (!schema.isNotCompanyBased && schemaId !== 'companies') {
      const searchParams = request.nextUrl.searchParams;
      
      // Check for companyIds comma-separated string (companyIds=id1,id2)
      const companyIdsString = searchParams.get('companyIds');
      // Check for backward compatibility: single companyId parameter
      const companyId = searchParams.get('companyId');
      // Allow includeIds to bypass company filter since records are explicitly targeted
      const hasIncludeIds =
        searchParams.has('includeIds') ||
        searchParams.getAll('includeIds[]').length > 0;
      
      // Parse companyIds from comma-separated string if provided
      const companyIds = companyIdsString 
        ? companyIdsString.split(',').map(id => id.trim()).filter(id => id.length > 0)
        : [];
      
      // Validate that at least one company ID is provided, unless includeIds is used
      if (!companyId && companyIds.length === 0 && !hasIncludeIds) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Missing required parameter: companyIds (or companyId for backward compatibility). This schema requires company filtering. Please provide at least one company ID.` 
          },
          { status: 400 }
        );
      }
    }

    const controller = await createController(schemaId);
    return await controller.getAll(request);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new entity or multiple entities
 * Example: 
 * - POST /api/data/vendors - creates a new entity (single object)
 * - POST /api/data/vendors - creates multiple entities (array of objects)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string }> }
) {
  const { 'schema-id': schemaId } = await params;
  const targetPath = `/api/data/${schemaId}`;

  if (!isDemoModeEnabled()) {
    const body = await request.json();
    return proxyDataRequest(request, targetPath, {
      body,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    // Validate schema ID
    if (!(await isValidSchemaId(schemaId))) {
      return NextResponse.json(
        { success: false, error: `Invalid schema ID: ${schemaId}` },
        { status: 404 }
      );
    }

    const requestBody = await request.json();
    const isArray = Array.isArray(requestBody);
    
    // If single item, use controller (maintains existing behavior)
    if (!isArray) {
    const controller = await createController(schemaId);
    const response = await controller.create(request);
    
    // Clear companies cache if a company was created
    if (schemaId === 'companies') {
      clearCompaniesCache();
    }
    
    return response;
    }

    // Handle array of entities
    const entitiesToCreate = requestBody;

    // Validate that we received valid entity objects
    if (!entitiesToCreate || entitiesToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: array must contain at least one entity object' },
        { status: 400 }
      );
    }

    // Get schema to check if it's company-based
    const schema = await getSchemaById(schemaId);
    const isNotCompanyBased = schema.isNotCompanyBased || false;

    // Create service for batch operations
    const repository = new BaseRepository<BaseEntity>(schemaId);
    const service = new BaseService<BaseEntity>(repository, schema.singular_name || 'Entity', schemaId);

    const createdEntities: any[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Process each entity
    for (let i = 0; i < entitiesToCreate.length; i++) {
      const entity = entitiesToCreate[i];
      
      try {
        // Replicate controller's company validation logic
        if (!isNotCompanyBased) {
          const companyId = entity.companyId;
          
          if (!companyId) {
            errors.push({
              index: i,
              error: 'Company ID is required. Please select a company before creating a record.'
            });
            continue;
          }
          
          if (companyId === '-1' || companyId === '' || companyId === null || companyId === undefined) {
            errors.push({
              index: i,
              error: 'Cannot create records when "All Companies" is selected. Please select a specific company first.'
            });
            continue;
          }
        }

        // Use service directly for batch operations
        const result = await service.create(entity);

        if (result.success && result.data) {
          createdEntities.push(result.data);
        } else {
          errors.push({
            index: i,
            error: result.error || 'Failed to create entity'
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Failed to create entity'
        });
      }
    }

    // If all failed, return error
    if (createdEntities.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to create entities: ${errors.map(e => `Index ${e.index}: ${e.error}`).join('; ')}` 
        },
        { status: 400 }
      );
    }

    // If some succeeded and some failed, return partial success
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: true,
          data: createdEntities,
          message: `Created ${createdEntities.length} of ${entitiesToCreate.length} entity(ies)`,
          errors: errors.length > 0 ? errors : undefined,
          partial: true
        },
        { status: 207 } // 207 Multi-Status for partial success
      );
    }

    // All succeeded
    // Clear companies cache if a company was created
    if (schemaId === 'companies') {
      clearCompaniesCache();
    }

    const message = `${createdEntities.length} entities created successfully`;

    return NextResponse.json({
      success: true,
      data: createdEntities,
      message
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

