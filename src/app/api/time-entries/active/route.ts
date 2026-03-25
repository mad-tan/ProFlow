import { getCurrentUserId } from '@/lib/auth';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET() {
  try {
    const service = new TimeTrackingService();
    const active = service.getActiveTimer(getCurrentUserId());
    return successResponse(active ?? null);
  } catch (error) {
    return errorResponse(error);
  }
}
