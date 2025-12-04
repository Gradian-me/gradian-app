// Migration API endpoint for converting popup picker fields to HAS_FIELD_VALUE relations
// SERVER-ONLY: This endpoint performs data migration

import { NextRequest, NextResponse } from 'next/server';
import { isDemoModeEnabled } from '../../data/utils';
import {
  migrateAllPickerFieldsToRelations,
  migratePickerFieldsForSchema,
} from '@/gradian-ui/shared/domain/utils/migrate-picker-fields.util';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';

/**
 * POST - Migrate all popup picker fields to HAS_FIELD_VALUE relations
 * Query parameters:
 * - schemaId (optional) - Migrate only a specific schema, otherwise migrates all schemas
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDemoModeEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Migration is only available in demo mode',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const schemaId = searchParams.get('schemaId');

    if (schemaId) {
      // Migrate specific schema
      const result = await migratePickerFieldsForSchema(schemaId);
      return NextResponse.json({
        success: true,
        data: result,
        message: `Migration completed for schema ${schemaId}`,
      });
    } else {
      // Migrate all schemas
      const results = await migrateAllPickerFieldsToRelations();
      
      const totalProcessed = results.reduce((sum, r) => sum + r.entitiesProcessed, 0);
      const totalRelations = results.reduce((sum, r) => sum + r.relationsCreated, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      
      return NextResponse.json({
        success: true,
        data: results,
        summary: {
          schemasProcessed: results.length,
          entitiesProcessed: totalProcessed,
          relationsCreated: totalRelations,
          errors: totalErrors,
        },
        message: `Migration completed: ${totalProcessed} entities processed, ${totalRelations} relations created`,
      });
    }
  } catch (error) {
    const errorResponse = handleDomainError(error);
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        code: errorResponse.code,
      },
      { status: errorResponse.statusCode }
    );
  }
}

