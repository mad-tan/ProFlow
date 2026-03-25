import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(_request: NextRequest) {
  try {
    const service = new AnalyticsService();
    const summary = service.getSummary(getCurrentUserId());
    return successResponse(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
