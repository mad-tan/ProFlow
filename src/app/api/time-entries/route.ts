import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { createTimeEntrySchema } from '@/lib/validators/time-entry.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const service = new TimeTrackingService();
    const { searchParams } = new URL(request.url);

    const filters = {
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      taskId: searchParams.get('taskId') ?? undefined,
    };

    const entries = service.listByUser(getCurrentUserId(), filters);
    return successResponse(entries);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new TimeTrackingService();
    const body = await request.json();

    const parsed = createTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const entry = service.createManualEntry({
      userId: getCurrentUserId(),
      taskId: parsed.data.taskId,
      description: parsed.data.description,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime ?? new Date().toISOString(),
    });

    return createdResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
