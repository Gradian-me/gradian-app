// Relations API Routes for Single Relation
// Handles GET and DELETE operations for a specific relation

import { NextRequest, NextResponse } from 'next/server';
import {
  getRelationById,
  deleteRelation,
} from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

/**
 * GET - Get single relation by ID
 * Example: GET /api/relations/01ARZ3NDEKTSV4RRFFQ69G5FAV
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication (unless route is excluded)
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  try {
    const { id } = await params;

    const relation = getRelationById(id);

    if (!relation) {
      return NextResponse.json(
        {
          success: false,
          error: `Relation with ID "${id}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: relation,
    });
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

/**
 * DELETE - Delete relation by ID
 * Example: DELETE /api/relations/01ARZ3NDEKTSV4RRFFQ69G5FAV
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication (unless route is excluded)
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  try {
    const { id } = await params;

    const relation = getRelationById(id);

    if (!relation) {
      return NextResponse.json(
        {
          success: false,
          error: `Relation with ID "${id}" not found`,
        },
        { status: 404 }
      );
    }

    deleteRelation(id);

    return NextResponse.json({
      success: true,
      message: 'Relation deleted successfully',
    });
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

