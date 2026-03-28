import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { createLinkedInOutreachSchema } from '@/lib/validators/job-hunt.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const { searchParams } = new URL(request.url);

    const options = {
      status: searchParams.get('status') ?? undefined,
      listingId: searchParams.get('listingId') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    };

    const outreaches = service.listOutreaches(await getCurrentUserId(), options);
    return successResponse(outreaches);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const body = await request.json();

    const parsed = createLinkedInOutreachSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const outreach = service.createOutreach({
      userId: await getCurrentUserId(),
      ...parsed.data,
    });

    return createdResponse(outreach);
  } catch (error) {
    return errorResponse(error);
  }
}
