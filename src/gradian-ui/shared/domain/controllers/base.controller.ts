// Base Controller
// Generic controller for handling HTTP requests

import { NextRequest, NextResponse } from 'next/server';
import { IService } from '../interfaces/service.interface';
import { BaseEntity, FilterParams } from '../types/base.types';
import { handleDomainError } from '../errors/domain.errors';
import { parsePaginationParams, paginateArray, buildPaginationMeta } from '@/gradian-ui/shared/utils/pagination-utils';
import { parseSortArray, multiSort } from '@/gradian-ui/shared/utils/sort-utils';
import { isDemoModeEnabled } from '@/app/api/data/utils';

export class BaseController<T extends BaseEntity> {
  constructor(
    protected service: IService<T>,
    protected entityName: string = 'Entity',
    protected isNotCompanyBased: boolean = false
  ) {}

  /**
   * Extract filters from URL search params
   */
  protected extractFilters(searchParams: URLSearchParams): FilterParams {
    const filters: FilterParams = {};

    if (searchParams.has('search')) {
      filters.search = searchParams.get('search') || undefined;
    }

    if (searchParams.has('status')) {
      filters.status = searchParams.get('status') || undefined;
    }

    if (searchParams.has('category')) {
      filters.category = searchParams.get('category') || undefined;
    }

    // Handle includeIds - can be comma-separated string or multiple params
    if (searchParams.has('includeIds')) {
      const includeIdsParam = searchParams.get('includeIds');
      if (includeIdsParam) {
        filters.includeIds = includeIdsParam.split(',').map(id => id.trim());
      }
    } else if (searchParams.getAll('includeIds[]').length > 0) {
      filters.includeIds = searchParams.getAll('includeIds[]');
    }

    // Handle excludeIds - can be comma-separated string or multiple params
    if (searchParams.has('excludeIds')) {
      const excludeIdsParam = searchParams.get('excludeIds');
      if (excludeIdsParam) {
        filters.excludeIds = excludeIdsParam.split(',').map(id => id.trim());
      }
    } else if (searchParams.getAll('excludeIds[]').length > 0) {
      filters.excludeIds = searchParams.getAll('excludeIds[]');
    }

    // Handle companyIds - comma-separated string format: companyIds=id1,id2
    if (searchParams.has('companyIds')) {
      const companyIdsParam = searchParams.get('companyIds');
      if (companyIdsParam) {
        filters.companyIds = companyIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);
      }
    }

    // Backward compatibility: Handle single companyId (will be converted to companyIds array in repository)
    // Add any other query params as filters (excluding params we've already handled)
    searchParams.forEach((value, key) => {
      if (
        ![
          'search',
          'status',
          'category',
          'includeIds',
          'excludeIds',
          'includeIds[]',
          'excludeIds[]',
          'companyIds',
          'companyId',
          'tenantIds', // Used at schema visibility layer, not as a data field filter
          'tenantId',
          'sortArray',
          'sortBy',
          'sortOrder',
          'page',
          'limit',
        ].includes(key)
      ) {
        filters[key] = value;
      }
    });

    return filters;
  }

  /**
   * GET - Get all entities
   */
  async getAll(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url);
      const filters = this.extractFilters(searchParams);
      const hasPagination = searchParams.has('page') || searchParams.has('limit');
      const pagination = hasPagination
        ? parsePaginationParams({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
          })
        : null;

      // Parse sortArray parameter
      const sortArrayParam = searchParams.get('sortArray');
      const sortArray = parseSortArray(sortArrayParam);

      const result = await this.service.getAll(filters);

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      let processedData = result.data;

      // Apply multi-sort if sortArray is provided
      if (sortArray && Array.isArray(processedData)) {
        processedData = multiSort(processedData, sortArray);
      } else if (!sortArray && Array.isArray(processedData)) {
        // Fallback to single sort for backward compatibility
        const sortBy = searchParams.get('sortBy');
        const sortOrder = searchParams.get('sortOrder') || 'asc';
        if (sortBy) {
          processedData = multiSort(processedData, [{
            column: sortBy,
            isAscending: sortOrder === 'asc'
          }]);
        } else if (isDemoModeEnabled()) {
          // Default sorting by updatedAt descending in demo mode when no sort is specified
          processedData = multiSort(processedData, [{
            column: 'updatedAt',
            isAscending: false
          }]);
        }
      }

      if (pagination && Array.isArray(processedData)) {
        const totalItems = processedData.length;
        const pageItems = paginateArray(processedData, pagination.page, pagination.limit);
        const meta = buildPaginationMeta(totalItems, pagination.page, pagination.limit);
        return NextResponse.json(
          {
            ...result,
            data: pageItems,
            meta,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ ...result, data: processedData }, { status: 200 });
    } catch (error) {
      const errorResponse = handleDomainError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  }

  /**
   * GET - Get entity by ID
   */
  async getById(id: string): Promise<NextResponse> {
    try {
      const result = await this.service.getById(id);

      if (!result.success) {
        return NextResponse.json(result, { status: 404 });
      }

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const errorResponse = handleDomainError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  }

  /**
   * POST - Create new entity
   */
  async create(request: NextRequest, body?: any): Promise<NextResponse> {
    try {
      // Use provided body if available, otherwise read from request
      const requestBody = body !== undefined ? body : await request.json();
      
      // Skip company validation if schema is not company-based
      if (!this.isNotCompanyBased) {
        // SECURITY: Require companyId in request body (from Zustand store)
        // Validate that it's provided and not "All Companies" (-1)
        const companyId = requestBody.companyId;
        
        if (!companyId) {
          return NextResponse.json(
            { success: false, error: 'Company ID is required. Please select a company before creating a record.' },
            { status: 400 }
          );
        }
        
        // SECURITY: Validate companyId is not "All Companies" (-1) or empty
        if (companyId === '-1' || companyId === '' || companyId === null || companyId === undefined) {
          return NextResponse.json(
            { success: false, error: 'Cannot create records when "All Companies" is selected. Please select a specific company first.' },
            { status: 400 }
          );
        }
      }
      
      // CompanyId is provided in body - use it directly (or skip if not company-based)
      const enrichedBody = { ...requestBody };
      
      const result = await this.service.create(enrichedBody);

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      const errorResponse = handleDomainError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  }

  /**
   * PUT - Update entity
   */
  async update(id: string, request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      
      // Get existing entity to check if it has companyId
      const existingResult = await this.service.getById(id);
      const existingEntity = existingResult.success ? existingResult.data : null;
      
      const enrichedBody = { ...body };
      
      // Skip company validation if schema is not company-based
      if (!this.isNotCompanyBased) {
        // If entity already has companyId, preserve it (don't allow changing it)
        if (existingEntity && (existingEntity as any).companyId) {
          enrichedBody.companyId = (existingEntity as any).companyId;
        } else {
          // If entity doesn't have companyId, require it in request body (from Zustand store)
          const companyId = body.companyId;
          
          if (!companyId) {
            return NextResponse.json(
              { success: false, error: 'Company ID is required. Please select a company before updating this record.' },
              { status: 400 }
            );
          }
          
          // SECURITY: Validate companyId is not "All Companies" (-1) or empty
          if (companyId === '-1' || companyId === '' || companyId === null || companyId === undefined) {
            return NextResponse.json(
              { success: false, error: 'Cannot update records when "All Companies" is selected. Please select a specific company first.' },
              { status: 400 }
            );
          }
          
          enrichedBody.companyId = companyId;
        }
      }
      
      const result = await this.service.update(id, enrichedBody);

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const errorResponse = handleDomainError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  }

  /**
   * DELETE - Delete entity
   */
  async delete(id: string): Promise<NextResponse> {
    try {
      const result = await this.service.delete(id);

      if (!result.success) {
        return NextResponse.json(result, { status: 404 });
      }

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const errorResponse = handleDomainError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  }
}

