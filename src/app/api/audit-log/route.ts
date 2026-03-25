import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { AuditLogService } from '@/lib/services/audit-log.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const service = new AuditLogService();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const action = searchParams.get('action') ?? undefined;
    const entityType = searchParams.get('entityType') ?? undefined;

    const options: Record<string, unknown> = {
      limit: Math.min(100, Math.max(1, limit)),
      offset: Math.max(0, offset),
    };

    if (action) options.action = action;
    if (entityType) options.entityType = entityType;

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      options.dateRange = { start: startDate, end: endDate };
    }

    const result = service.findByUser(getCurrentUserId(), options);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
