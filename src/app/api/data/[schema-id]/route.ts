// Dynamic CRUD API Routes
// Handles all CRUD operations for any schema dynamically

import { NextRequest, NextResponse } from 'next/server';
import { BaseRepository } from '@/gradian-ui/shared/domain/repositories/base.repository';
import { BaseService } from '@/gradian-ui/shared/domain/services/base.service';
import { BaseController } from '@/gradian-ui/shared/domain/controllers/base.controller';
import { BaseEntity } from '@/gradian-ui/shared/domain/types/base.types';
import { isValidSchemaId, getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { loadAllCompanies, clearCompaniesCache } from '@/gradian-ui/shared/utils/companies-loader';
import { isDemoModeEnabled, proxyDataRequest, enrichWithUsers, enrichEntitiesWithUsers } from '../utils';
import { syncHasFieldValueRelationsForEntity, minimizePickerFieldValues, enrichEntitiesPickerFieldsFromRelations, enrichEntityPickerFieldsFromRelations } from '@/gradian-ui/shared/domain/utils/field-value-relations.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

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

  // Special-case: if schema is "schemas", delegate to /api/schemas to avoid scattered handling
  if (schemaId === 'schemas') {
    const targetUrl = new URL(request.nextUrl.toString());
    targetUrl.pathname = '/api/schemas';
    // Preserve original query params
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }
  const targetPath = `/api/data/${schemaId}${request.nextUrl.search}`;

  if (!isDemoModeEnabled()) {
    return proxyDataRequest(request, targetPath);
  }

  try {
    // Validate schema ID
    if (!(await isValidSchemaId(schemaId))) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Schema "${schemaId}" not found. Please ensure the schema exists in your schema registry before querying data.` 
        },
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
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `Companies cache load failed, using controller: ${error instanceof Error ? error.message : String(error)}`,
        );
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
    const response = await controller.getAll(request);
    
    // Enrich response with user objects and picker field data from relations in demo mode
    if (isDemoModeEnabled()) {
      try {
        const responseData = await response.json();
        if (responseData && responseData.success && responseData.data) {
          if (Array.isArray(responseData.data)) {
            // Enrich with users first
            responseData.data = await enrichEntitiesWithUsers(responseData.data);
            // Then enrich picker fields from relations
            responseData.data = await enrichEntitiesPickerFieldsFromRelations({
              schemaId,
              entities: responseData.data,
            });
          } else if (typeof responseData.data === 'object') {
            // Single entity - enrich with users first
            responseData.data = await enrichWithUsers(responseData.data);
            // Then enrich picker fields from relations
            responseData.data = await enrichEntityPickerFieldsFromRelations({
              schemaId,
              entity: responseData.data,
            });
          }
        }
        return NextResponse.json(responseData, { status: response.status });
      } catch (error) {
        // If JSON parsing fails, return original response
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[GET /api/data] Failed to enrich response: ${error instanceof Error ? error.message : String(error)}`,
        );
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
  
  if (!schemaId) {
    return NextResponse.json(
      { success: false, error: 'Schema ID is required' },
      { status: 400 }
    );
  }

  const targetPath = `/api/data/${schemaId}`;

  if (!isDemoModeEnabled()) {
    try {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        // If body parsing fails, still try to proxy (might be empty body)
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[POST /api/data/${schemaId}] Failed to parse request body, proxying with undefined body: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        body = undefined;
      }
      
      return proxyDataRequest(request, targetPath, {
        body,
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
    } catch (error) {
      loggingCustom(
        LogType.INFRA_LOG,
        'error',
        `[POST /api/data/${schemaId}] Error proxying request: ${error instanceof Error ? error.message : String(error)}`,
      );
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to proxy request' 
        },
        { status: 500 }
      );
    }
  }

  try {
    // Validate schema ID
    if (!(await isValidSchemaId(schemaId))) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Schema "${schemaId}" not found. Please ensure the schema exists in your schema registry before creating data.` 
        },
        { status: 404 }
      );
    }

    const requestBody = await request.json();
    const isArray = Array.isArray(requestBody);
    
    // If single item, use controller (maintains existing behavior)
    if (!isArray) {
      // In demo mode, extract picker values and remove them from request body before saving
      // This implements relations-only storage
      let pickerValues: Record<string, any> = {};
      let cleanedRequestBody = requestBody;
      
      if (isDemoModeEnabled()) {
        try {
          const schema = await getSchemaById(schemaId);
          if (schema) {
            // Extract picker field values before minimizing them
            const { extractPickerFieldValues, minimizePickerFieldValues: minimizeValues } = await import('@/gradian-ui/shared/domain/utils/field-value-relations.util');
            pickerValues = extractPickerFieldValues({ schema, data: requestBody });
            
            // Minimize picker values to [{id}, {id}] format (keep IDs for tracing)
            cleanedRequestBody = minimizeValues({ schema, data: requestBody });
          }
        } catch (error) {
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[POST /api/data] Failed to extract picker values: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const controller = await createController(schemaId);
      // Pass cleaned body directly (controller.create accepts body as second parameter)
      const response = await controller.create(request, cleanedRequestBody);

      // Parse response once so we can augment it (relations, enrichment) and then send
      let responseData: any;
      try {
        responseData = await response.json();
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[POST /api/data] Failed to parse create response JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
        responseData = null;
      }

      // Clear companies cache if a company was created
      if (schemaId === 'companies') {
        clearCompaniesCache();
      }

      // In demo mode, synchronize HAS_FIELD_VALUE relations after entity creation
      // Use the extracted picker values to create relations
      if (isDemoModeEnabled() && responseData?.success && responseData.data && typeof responseData.data === 'object' && Object.keys(pickerValues).length > 0) {
        try {
          // Create relations from the extracted picker values
          const entityWithPickerValues = { ...responseData.data, ...pickerValues };
          await syncHasFieldValueRelationsForEntity({
            schemaId,
            entity: entityWithPickerValues,
          });
          
          // Update entity with minimized picker values (keep IDs for tracing)
          const schema = await getSchemaById(schemaId);
          if (schema) {
            const minimizedEntity = minimizePickerFieldValues({
              schema,
              data: responseData.data,
            });
            
            // Update entity in storage with minimized values
            const repository = new BaseRepository(schemaId);
            await repository.update(String(responseData.data.id), minimizedEntity);
            
            // Update response data to reflect minimized entity
            responseData.data = minimizedEntity;
          }
        } catch (error) {
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[POST /api/data] Failed to sync HAS_FIELD_VALUE relations: ${error instanceof Error ? error.message : String(error)}`,
          );
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
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[POST /api/data] Failed to enrich response: ${error instanceof Error ? error.message : String(error)}`,
          );
          return NextResponse.json(responseData, { status: response.status });
        }
      }

      // For non-demo or parse failures, return original response as-is
      if (responseData) {
        return NextResponse.json(responseData, { status: response.status });
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
      // Enrich entities with user objects in demo mode
      const enrichedEntities = isDemoModeEnabled() 
        ? await enrichEntitiesWithUsers(createdEntities)
        : createdEntities;
      
      return NextResponse.json(
        { 
          success: true,
          data: enrichedEntities,
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

    // Enrich entities with user objects in demo mode
    const enrichedEntities = isDemoModeEnabled() 
      ? await enrichEntitiesWithUsers(createdEntities)
      : createdEntities;

    return NextResponse.json({
      success: true,
      data: enrichedEntities,
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

