import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { createdResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const service = new TimeTrackingService();
    const body = await request.json().catch(() => ({}));

    const taskId = body.taskId ?? undefined;
    const description = body.description ?? undefined;

    const entry = service.startTimer(await getCurrentUserId(), taskId, description);
    return createdResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
