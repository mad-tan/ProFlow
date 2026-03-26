import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { AuditLogService } from '@/lib/services/audit-log.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const service = new AuditLogService();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '30', 10)));
    const offset = (page - 1) * pageSize;
    const action = searchParams.get('action') ?? undefined;
    const entityType = searchParams.get('entityType') ?? undefined;

    const options: Record<string, unknown> = {
      limit: pageSize,
      offset,
    };

    if (action) options.action = action;
    if (entityType) options.entityType = entityType;

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      options.dateRange = { start: startDate, end: endDate };
    }

    const result = service.findByUser(await getCurrentUserId(), options as Parameters<typeof service.findByUser>[1]);
    const totalPages = Math.ceil(result.total / pageSize);

    return successResponse({
      entries: result.data,
      pagination: {
        page,
        pageSize,
        totalItems: result.total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
