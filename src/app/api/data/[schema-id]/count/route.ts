// Count API for assignment badges (tasks per user)
// GET /api/data/[schema-id]/count?userId=xxx&companyIds=id1,id2
// Returns: { success: true, data: { assignedToCount, initiatedByCount } }
// When demo mode is false, proxies to backend (URL_DATA_CRUD).

import { NextRequest, NextResponse } from 'next/server';
import { readSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { isValidSchemaId, getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { isDemoModeEnabled, proxyDataRequest } from '../../utils';

const normalizeCreatorId = (creator: unknown): string | null => {
  if (creator == null) return null;
  if (typeof creator === 'object' && creator !== null && 'id' in creator) {
    return String((creator as { id: unknown }).id);
  }
  return String(creator);
};

const isAssignedToUser = (entity: Record<string, unknown>, userId: string): boolean => {
  const assigned =
    entity?.assignedTo ??
    entity?.assigned_to ??
    entity?.assignees ??
    entity?.assignedUsers;

  if (!Array.isArray(assigned) || assigned.length === 0) return false;

  return assigned.some((item: unknown) => {
    if (item && typeof item === 'object' && 'id' in item) {
      return String((item as { id: unknown }).id) === userId;
    }
    return false;
  });
};

const isInitiatedByUser = (entity: Record<string, unknown>, userId: string): boolean => {
  const creatorId = normalizeCreatorId(
    entity.createdBy ?? entity.created_by ?? entity.creator ?? entity.created_by_id,
  );
  return creatorId !== null && creatorId === userId;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string }> }
) {
  // Reuse existing auth behaviour
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { 'schema-id': schemaId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const userId = searchParams.get('userId') ?? searchParams.get('userIds');
  if (!userId || userId.trim() === '') {
    return NextResponse.json(
      { success: false, error: 'Query parameter userId (or userIds) is required.' },
      { status: 400 }
    );
  }

  const primaryUserId = userId.split(',').map((id) => id.trim()).filter(Boolean)[0];
  if (!primaryUserId) {
    return NextResponse.json(
      { success: false, error: 'At least one userId is required.' },
      { status: 400 }
    );
  }

  if (!(await isValidSchemaId(schemaId))) {
    return NextResponse.json(
      { success: false, error: `Schema \"${schemaId}\" not found.` },
      { status: 404 }
    );
  }

  // When demo mode is false, proxy to backend (same path and query string).
  if (!isDemoModeEnabled()) {
    const targetPathWithQuery = `/api/data/${schemaId}/count${request.nextUrl.search}`;
    return proxyDataRequest(request, targetPathWithQuery);
  }

  const schema = await getSchemaById(schemaId);

  let entities: Record<string, unknown>[] = readSchemaData(schemaId);

  // Optionally respect companyIds like the list API, so counts line up with what user sees
  const companyIdsParam = searchParams.get('companyIds');
  if (companyIdsParam && !schema?.isNotCompanyBased && schemaId !== 'companies') {
    const companyIds = companyIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (companyIds.length > 0) {
      entities = entities.filter((entity: any) => {
        const relatedCompanies = entity?.relatedCompanies;
        if (Array.isArray(relatedCompanies) && relatedCompanies.length > 0) {
          const relatedIds = relatedCompanies
            .map((item: any) => (item?.id != null ? String(item.id) : null))
            .filter((id: string | null): id is string => id != null);
          return relatedIds.some((id) => companyIds.includes(id));
        }

        const entityCompanyId = entity?.companyId != null ? String(entity.companyId) : null;
        return entityCompanyId ? companyIds.includes(entityCompanyId) : false;
      });
    }
  }

  const assignedToCount = entities.filter((e) => isAssignedToUser(e, primaryUserId)).length;
  const initiatedByCount = entities.filter((e) => isInitiatedByUser(e, primaryUserId)).length;

  return NextResponse.json({
    success: true,
    data: {
      assignedToCount,
      initiatedByCount,
    },
  });
}

