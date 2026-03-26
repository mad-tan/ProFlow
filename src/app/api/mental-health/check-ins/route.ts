import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import { createMentalHealthCheckInSchema } from '@/lib/validators/mental-health.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';
import type { CreateCheckInData } from '@/lib/repositories/mental-health.repository';

export async function GET(request: NextRequest) {
  try {
    const service = new MentalHealthService();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateRange =
      startDate && endDate ? { start: startDate, end: endDate } : undefined;

    const checkIns = service.getCheckIns(await getCurrentUserId(), dateRange);
    return successResponse(checkIns);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new MentalHealthService();
    const body = await request.json();

    const parsed = createMentalHealthCheckInSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const checkIn = service.createCheckIn({
      userId: await getCurrentUserId(),
      ...parsed.data,
    } as CreateCheckInData);

    return createdResponse(checkIn);
  } catch (error) {
    return errorResponse(error);
  }
}
