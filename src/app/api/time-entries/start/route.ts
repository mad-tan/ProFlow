import { NextRequest } from 'next/server';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { createdResponse, errorResponse } from '@/lib/utils/api-response';

const DEFAULT_USER_ID = 'default-user';

export async function POST(request: NextRequest) {
  try {
    const service = new TimeTrackingService();
    const body = await request.json().catch(() => ({}));

    const taskId = body.taskId ?? undefined;
    const description = body.description ?? undefined;

    const entry = service.startTimer(DEFAULT_USER_ID, taskId, description);
    return createdResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
