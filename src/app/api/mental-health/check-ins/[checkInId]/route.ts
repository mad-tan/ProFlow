import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import { updateMentalHealthCheckInSchema } from '@/lib/validators/mental-health.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';
import type { MentalHealthCheckIn } from '@/lib/types';

type RouteParams = { params: Promise<{ checkInId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new MentalHealthService();
    const { checkInId } = await params;
    const body = await request.json();

    const parsed = updateMentalHealthCheckInSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const checkIn = service.updateCheckIn(
      checkInId,
      parsed.data as Partial<Pick<MentalHealthCheckIn, 'moodRating' | 'energyLevel' | 'stressLevel' | 'sleepHours' | 'notes' | 'tags'>>
    );
    return successResponse(checkIn);
  } catch (error) {
    return errorResponse(error);
  }
}
