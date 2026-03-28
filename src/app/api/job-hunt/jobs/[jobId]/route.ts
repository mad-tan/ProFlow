import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { updateJobListingSchema } from '@/lib/validators/job-hunt.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { jobId } = await params;
    const job = service.getJob(jobId, await getCurrentUserId());
    return successResponse(job);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { jobId } = await params;
    const body = await request.json();

    const parsed = updateJobListingSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const job = service.updateJob(jobId, await getCurrentUserId(), parsed.data);
    return successResponse(job);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { jobId } = await params;
    await service.deleteJob(jobId, await getCurrentUserId());
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
