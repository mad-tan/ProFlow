import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { updateTimeEntrySchema } from '@/lib/validators/time-entry.schema';
import { successResponse, errorResponse, noContentResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

type RouteParams = { params: Promise<{ entryId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new TimeTrackingService();
    const { entryId } = await params;
    const body = await request.json();

    const parsed = updateTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const entry = service.update(entryId, await getCurrentUserId(), parsed.data);
    return successResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new TimeTrackingService();
    const { entryId } = await params;
    service.delete(entryId, await getCurrentUserId());
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
