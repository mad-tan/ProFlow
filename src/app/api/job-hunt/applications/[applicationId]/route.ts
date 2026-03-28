import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { updateApplicationSchema } from '@/lib/validators/job-hunt.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { applicationId } = await params;
    const app = service.getApplication(applicationId, await getCurrentUserId());
    return successResponse(app);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { applicationId } = await params;
    const body = await request.json();

    const parsed = updateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const app = service.updateApplication(applicationId, await getCurrentUserId(), parsed.data);
    return successResponse(app);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { applicationId } = await params;
    await service.deleteApplication(applicationId, await getCurrentUserId());
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
