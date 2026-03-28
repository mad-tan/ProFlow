import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { updateColdEmailSchema } from '@/lib/validators/job-hunt.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { emailId } = await params;
    const email = service.getEmail(emailId, await getCurrentUserId());
    return successResponse(email);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { emailId } = await params;
    const body = await request.json();

    const parsed = updateColdEmailSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const email = service.updateEmail(emailId, await getCurrentUserId(), parsed.data);
    return successResponse(email);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const service = new JobHuntService();
    const { emailId } = await params;
    await service.deleteEmail(emailId, await getCurrentUserId());
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
