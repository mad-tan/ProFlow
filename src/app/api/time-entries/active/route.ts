import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

const DEFAULT_USER_ID = 'default-user';

export async function GET() {
  try {
    const service = new TimeTrackingService();
    const active = service.getActiveTimer(DEFAULT_USER_ID);
    return successResponse(active ?? null);
  } catch (error) {
    return errorResponse(error);
  }
}
