import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { createJobListingSchema } from '@/lib/validators/job-hunt.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const { searchParams } = new URL(request.url);

    const options = {
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    };

    const jobs = service.listJobs(await getCurrentUserId(), options);
    return successResponse(jobs);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const body = await request.json();

    const parsed = createJobListingSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const job = service.createJob({
      userId: await getCurrentUserId(),
      ...parsed.data,
    });

    return createdResponse(job);
  } catch (error) {
    return errorResponse(error);
  }
}
