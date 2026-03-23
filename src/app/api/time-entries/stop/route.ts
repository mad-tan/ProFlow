import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

const DEFAULT_USER_ID = 'default-user';

export async function POST() {
  try {
    const service = new TimeTrackingService();
    const entry = service.stopTimer(DEFAULT_USER_ID);
    return successResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
