import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { updateLinkedInOutreachSchema } from '@/lib/validators/job-hunt.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { outreachId } = await params;
    const outreach = service.getOutreach(outreachId);
    return successResponse(outreach);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { outreachId } = await params;
    const body = await request.json();

    const parsed = updateLinkedInOutreachSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const outreach = service.updateOutreach(outreachId, await getCurrentUserId(), parsed.data);
    return successResponse(outreach);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { outreachId } = await params;
    await service.deleteOutreach(outreachId, await getCurrentUserId());
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
