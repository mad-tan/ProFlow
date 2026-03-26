import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import { updateJournalEntrySchema } from '@/lib/validators/mental-health.schema';
import { successResponse, errorResponse, noContentResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';
import type { JournalEntry } from '@/lib/types';

type RouteParams = { params: Promise<{ entryId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new MentalHealthService();
    const { entryId } = await params;
    const entry = service.getJournalEntryById(entryId);
    return successResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new MentalHealthService();
    const { entryId } = await params;
    const body = await request.json();

    const parsed = updateJournalEntrySchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const entry = service.updateJournalEntry(
      entryId,
      await getCurrentUserId(),
      parsed.data as Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'tags'>>
    );
    return successResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new MentalHealthService();
    const { entryId } = await params;
    service.deleteJournalEntry(entryId, await getCurrentUserId());
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
