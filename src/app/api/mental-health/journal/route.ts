import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import { createJournalEntrySchema } from '@/lib/validators/mental-health.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';
import type { CreateJournalEntryData } from '@/lib/repositories/mental-health.repository';

export async function GET(request: NextRequest) {
  try {
    const service = new MentalHealthService();
    const { searchParams } = new URL(request.url);

    const options = {
      search: searchParams.get('search') ?? undefined,
      mood: searchParams.get('mood')
        ? (parseInt(searchParams.get('mood')!, 10) as 1 | 2 | 3 | 4 | 5)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : undefined,
    };

    const entries = service.getJournalEntries(getCurrentUserId(), options);
    return successResponse(entries);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new MentalHealthService();
    const body = await request.json();

    const parsed = createJournalEntrySchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const entry = service.createJournalEntry({
      userId: getCurrentUserId(),
      ...parsed.data,
    } as CreateJournalEntryData);

    return createdResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
