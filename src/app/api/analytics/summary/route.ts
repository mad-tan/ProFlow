import { NextRequest } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

const DEFAULT_USER_ID = 'default-user';

export async function GET(_request: NextRequest) {
  try {
    const service = new AnalyticsService();
    const summary = service.getSummary(DEFAULT_USER_ID);
    return successResponse(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
