import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const service = new AnalyticsService();
    const { searchParams } = new URL(request.url);

    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return errorResponse(
        new Error('Both "start" and "end" query parameters are required'),
        'Missing date range parameters'
      );
    }

    const data = service.getMentalHealthTrends(await getCurrentUserId(), { start, end });
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
