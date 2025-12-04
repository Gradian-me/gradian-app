// Dynamic CRUD API Routes for Single Entity
// Handles GET, PUT, DELETE operations for a specific entity

import { NextRequest, NextResponse } from 'next/server';
import { BaseRepository } from '@/gradian-ui/shared/domain/repositories/base.repository';
import { BaseService } from '@/gradian-ui/shared/domain/services/base.service';
import { BaseController } from '@/gradian-ui/shared/domain/controllers/base.controller';
import { BaseEntity } from '@/gradian-ui/shared/domain/types/base.types';
import { isValidSchemaId, getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { clearCompaniesCache } from '@/gradian-ui/shared/utils/companies-loader';
import { isDemoModeEnabled, proxyDataRequest, enrichWithUsers } from '../../utils';
import { syncHasFieldValueRelationsForEntity } from '@/gradian-ui/shared/domain/utils/field-value-relations.util';

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
 * GET - Get single entity by ID
 * Example: GET /api/data/vendors/123
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string; id: string }> }
) {
  const { 'schema-id': schemaId, id } = await params;
  const targetPath = `/api/data/${schemaId}/${id}${request.nextUrl.search}`;

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

    const controller = await createController(schemaId);
    const response = await controller.getById(id);
    
    // Enrich response with user objects in demo mode
    if (isDemoModeEnabled()) {
      try {
        const responseData = await response.json();
        if (responseData && responseData.success && responseData.data && typeof responseData.data === 'object') {
          responseData.data = await enrichWithUsers(responseData.data);
        }
        return NextResponse.json(responseData, { status: response.status });
      } catch (error) {
        // If JSON parsing fails, return original response
        console.warn('[GET /api/data/:id] Failed to enrich response:', error);
        return response;
      }
    }
    
    return response;
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
 * PUT - Update entity
 * Example: PUT /api/data/vendors/123
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string; id: string }> }
) {
  const { 'schema-id': schemaId, id } = await params;
  const targetPath = `/api/data/${schemaId}/${id}`;

  if (!isDemoModeEnabled()) {
    const body = await request.json();
    return proxyDataRequest(request, targetPath, {
      body,
      method: 'PUT',
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

    const controller = await createController(schemaId);
    const response = await controller.update(id, request);

    // Parse response once so we can augment it (relations, enrichment) and then send
    let responseData: any;
    try {
      responseData = await response.json();
    } catch (error) {
      console.warn('[PUT /api/data/:id] Failed to parse update response JSON:', error);
      responseData = null;
    }

    // Clear companies cache if a company was updated
    if (schemaId === 'companies') {
      clearCompaniesCache();
    }

    // In demo mode, synchronize HAS_FIELD_VALUE relations after entity update
    if (isDemoModeEnabled() && responseData?.success && responseData.data && typeof responseData.data === 'object') {
      try {
        await syncHasFieldValueRelationsForEntity({
          schemaId,
          entity: responseData.data,
        });
      } catch (error) {
        console.warn('[PUT /api/data/:id] Failed to sync HAS_FIELD_VALUE relations', error);
      }
    }

    // Enrich response with user objects in demo mode
    if (isDemoModeEnabled() && responseData) {
      try {
        if (responseData && responseData.success && responseData.data && typeof responseData.data === 'object') {
          responseData.data = await enrichWithUsers(responseData.data);
        }
        return NextResponse.json(responseData, { status: response.status });
      } catch (error) {
        // If JSON parsing fails, fall back to minimal response
        console.warn('[PUT /api/data/:id] Failed to enrich response:', error);
        return NextResponse.json(responseData, { status: response.status });
      }
    }

    if (responseData) {
      return NextResponse.json(responseData, { status: response.status });
    }

    return response;
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
 * DELETE - Delete entity
 * Example: DELETE /api/data/vendors/123
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string; id: string }> }
) {
  const { 'schema-id': schemaId, id } = await params;
  const targetPath = `/api/data/${schemaId}/${id}`;

  if (!isDemoModeEnabled()) {
    return proxyDataRequest(request, targetPath, { method: 'DELETE' });
  }

  try {
    // Validate schema ID
    if (!(await isValidSchemaId(schemaId))) {
      return NextResponse.json(
        { success: false, error: `Invalid schema ID: ${schemaId}` },
        { status: 404 }
      );
    }

    const controller = await createController(schemaId);
    const response = await controller.delete(id);
    
    // Clear companies cache if a company was deleted
    if (schemaId === 'companies') {
      clearCompaniesCache();
    }
    
    return response;
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

