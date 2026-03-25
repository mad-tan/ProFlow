import { getCurrentUserId } from '@/lib/auth';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST() {
  try {
    const service = new TimeTrackingService();
    const entry = service.stopTimer(getCurrentUserId());
    return successResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
