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
import { syncHasFieldValueRelationsForEntity, minimizePickerFieldValues, enrichEntityPickerFieldsFromRelations } from '@/gradian-ui/shared/domain/utils/field-value-relations.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

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
    schema.isNotCompanyBased || false,
    schema // Pass schema to controller for field ID resolution
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

  // Special-case: if schema is "schemas", delegate to /api/schemas/:id
  if (schemaId === 'schemas') {
    const targetUrl = new URL(request.nextUrl.toString());
    targetUrl.pathname = `/api/schemas/${id}`;
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }
  const targetPath = `/api/data/${schemaId}/${id}${request.nextUrl.search}`;

  if (!isDemoModeEnabled()) {
    // Special handling for tenants and integrations: try backend first, fallback to local if backend fails
    if (schemaId === 'tenants' || schemaId === 'integrations') {
      // Try to proxy to backend first
      const proxyResponse = await proxyDataRequest(request, targetPath);
      
      // If backend returns success (2xx), return it immediately
      if (proxyResponse.status >= 200 && proxyResponse.status < 300) {
        return proxyResponse;
      }
      
      // If backend returns 404 or 5xx error, try to fallback to local file
      if (proxyResponse.status === 404 || (proxyResponse.status >= 500 && proxyResponse.status < 600)) {
        try {
          // Clone the response to read it without consuming the original
          const clonedResponse = proxyResponse.clone();
          let proxyData: any = null;
          try {
            proxyData = await clonedResponse.json();
          } catch {
            // If response is not JSON, treat as error
          }
          
          // If backend explicitly says not found or returns 404, try local fallback
          if (proxyResponse.status === 404 || (proxyData && proxyData.success === false)) {
            loggingCustom(
              LogType.INFRA_LOG,
              'warn',
              `[${schemaId === 'tenants' ? 'Tenant' : 'Integration'} API] Backend returned ${proxyResponse.status} for ${schemaId} "${id}", attempting local fallback`
            );
            
            // Fallback to local file
            try {
              const { readSchemaData } = await import('@/gradian-ui/shared/domain/utils/data-storage.util');
              const items = readSchemaData<any>(schemaId);
              const item = items.find((t: any) => String(t.id) === String(id));
              
              if (item) {
                loggingCustom(
                  LogType.INFRA_LOG,
                  'info',
                  `[${schemaId === 'tenants' ? 'Tenant' : 'Integration'} API] Found ${schemaId} "${id}" in local fallback`
                );
                return NextResponse.json({
                  success: true,
                  data: item
                }, {
                  headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                  },
                });
              } else {
                loggingCustom(
                  LogType.INFRA_LOG,
                  'warn',
                  `[${schemaId === 'tenants' ? 'Tenant' : 'Integration'} API] ${schemaId} "${id}" not found in local fallback either`
                );
              }
            } catch (loadError) {
              loggingCustom(
                LogType.INFRA_LOG,
                'error',
                `[${schemaId === 'tenants' ? 'Tenant' : 'Integration'} API] Failed to load local ${schemaId} for fallback: ${loadError instanceof Error ? loadError.message : String(loadError)}`
              );
            }
          }
        } catch (fallbackError) {
          // If fallback fails, log and return original proxy response
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[${schemaId === 'tenants' ? 'Tenant' : 'Integration'} API] Fallback failed for ${schemaId} "${id}": ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
          );
        }
      }
      
      // Return proxy response (either success or error)
      return proxyResponse;
    }
    
    // For other schemas, proxy directly without fallback
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

    // Get schema to check allowDataRelatedTenants flag
    const schema = await getSchemaById(schemaId);
    const tenantIdsParam = request.nextUrl.searchParams.get('tenantIds');
    const tenantIds = tenantIdsParam
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    const allowDataRelatedTenants = schema?.allowDataRelatedTenants === true;

    const controller = await createController(schemaId);
    const response = await controller.getById(id);
    
    // Parse response once for tenant filtering and enrichment
    let responseData: any = null;
    try {
      responseData = await response.json();
    } catch (error) {
      // If JSON parsing fails, return original response
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `[GET /api/data/:id] Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
      );
      return response;
    }
    
    // Apply tenant filtering for single entity if schema supports it
    if (allowDataRelatedTenants && tenantIds && tenantIds.length > 0 && responseData && responseData.success && responseData.data) {
      const entity = responseData.data;
      const relatedTenants = entity['relatedTenants'];
      
      // If entity has relatedTenants, check if current tenant is included
      if (relatedTenants && Array.isArray(relatedTenants) && relatedTenants.length > 0) {
        const relatedIds = relatedTenants
          .map((item: any) => {
            if (typeof item === 'string') {
              return String(item).trim();
            }
            if (item && item.id) {
              return String(item.id).trim();
            }
            return null;
          })
          .filter((id: string | null): id is string => !!id);

        const normalizedTenantIds = tenantIds.map((id) => String(id).trim());
        const isVisible = relatedIds.some((id) => normalizedTenantIds.includes(id));
        
        if (!isVisible) {
          // Entity is not visible to the requested tenants
          return NextResponse.json(
            { success: false, error: 'Entity not found or not accessible for the requested tenants' },
            { status: 404 }
          );
        }
      }
      // If relatedTenants is empty/undefined, entity is visible to all (no filtering needed)
    }
    
    // Enrich response with user objects and picker field data from relations in demo mode
    if (isDemoModeEnabled() && responseData && responseData.success && responseData.data && typeof responseData.data === 'object') {
      try {
        // Enrich with users first
        responseData.data = await enrichWithUsers(responseData.data);
        // Then enrich picker fields from relations
        responseData.data = await enrichEntityPickerFieldsFromRelations({
          schemaId,
          entity: responseData.data,
        });
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[GET /api/data/:id] Failed to enrich response: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    
    return NextResponse.json(responseData, { status: response.status });
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

    // Get schema to check allowDataRelatedTenants flag
    const schema = await getSchemaById(schemaId);
    const tenantIdsParam = request.nextUrl.searchParams.get('tenantIds');
    const tenantIds = tenantIdsParam
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    const allowDataRelatedTenants = schema?.allowDataRelatedTenants === true;

    // Check tenant visibility before allowing update
    if (allowDataRelatedTenants && tenantIds && tenantIds.length > 0) {
      const controller = await createController(schemaId);
      const getResponse = await controller.getById(id);
      
      try {
        const getResponseData = await getResponse.json();
        if (getResponseData && getResponseData.success && getResponseData.data) {
          const entity = getResponseData.data;
          const relatedTenants = entity['relatedTenants'];
          
          // If entity has relatedTenants, check if current tenant is included
          if (relatedTenants && Array.isArray(relatedTenants) && relatedTenants.length > 0) {
            const relatedIds = relatedTenants
              .map((item: any) => {
                if (typeof item === 'string') {
                  return String(item).trim();
                }
                if (item && item.id) {
                  return String(item.id).trim();
                }
                return null;
              })
              .filter((id: string | null): id is string => !!id);

            const normalizedTenantIds = tenantIds.map((id) => String(id).trim());
            const isVisible = relatedIds.some((id) => normalizedTenantIds.includes(id));
            
            if (!isVisible) {
              // Entity is not visible to the requested tenants
              return NextResponse.json(
                { success: false, error: 'Entity not found or not accessible for the requested tenants' },
                { status: 404 }
              );
            }
          }
          // If relatedTenants is empty/undefined, entity is visible to all (no filtering needed)
        } else if (!getResponseData || !getResponseData.success) {
          // Entity not found
          return NextResponse.json(
            { success: false, error: 'Entity not found' },
            { status: 404 }
          );
        }
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[PUT /api/data/:id] Failed to check tenant visibility: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with update if visibility check fails (fail open for now)
      }
    }

    // Read request body BEFORE passing to controller (body can only be read once)
    let requestBody: any = {};
    try {
      requestBody = await request.json();
    } catch (error) {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `[PUT /api/data/:id] Failed to parse request body: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // In demo mode, extract picker values and minimize them in request body before saving
    // This keeps minimal [{id}, {id}] format for tracing while using relations for operations
    let pickerValues: Record<string, any> = {};
    if (isDemoModeEnabled()) {
      try {
        // Schema already loaded above, reuse it
        if (schema) {
          // Extract picker field values before minimizing them
          const { extractPickerFieldValues, minimizePickerFieldValues: minimizeValues } = await import('@/gradian-ui/shared/domain/utils/field-value-relations.util');
          pickerValues = extractPickerFieldValues({ schema, data: requestBody });
          
          // Minimize picker values to [{id}, {id}] format (keep IDs for tracing)
          requestBody = minimizeValues({ schema, data: requestBody });
        }
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[PUT /api/data/:id] Failed to extract picker values: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Clone request with cleaned body (without picker values) for controller
    const clonedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(requestBody),
    });

    const controller = await createController(schemaId);
    const response = await controller.update(id, clonedRequest);

    // Parse response once so we can augment it (relations, enrichment) and then send
    let responseData: any;
    try {
      responseData = await response.json();
    } catch (error) {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `[PUT /api/data/:id] Failed to parse update response JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      responseData = null;
    }
    
    // Clear companies cache if a company was updated
    if (schemaId === 'companies') {
      clearCompaniesCache();
    }

    // In demo mode, synchronize HAS_FIELD_VALUE relations after entity update
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
        // Schema already loaded above, reuse it
        if (schema) {
          const minimizedEntity = minimizePickerFieldValues({
            schema,
            data: responseData.data,
          });
          
          // Update entity in storage with minimized values
          const repository = new BaseRepository(schemaId);
          await repository.update(id, minimizedEntity);
          
          // Update response data to reflect minimized entity
          responseData.data = minimizedEntity;
        }
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[PUT /api/data/:id] Failed to sync HAS_FIELD_VALUE relations: ${error instanceof Error ? error.message : String(error)}`,
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
          `[PUT /api/data/:id] Failed to enrich response: ${error instanceof Error ? error.message : String(error)}`,
        );
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

