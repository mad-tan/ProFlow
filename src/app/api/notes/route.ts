import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { NoteService } from '@/lib/services/note.service';
import { createNoteSchema } from '@/lib/validators/note.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const service = new NoteService();
    const { searchParams } = new URL(request.url);

    const options = {
      search: searchParams.get('search') ?? undefined,
      pinned: searchParams.has('pinned')
        ? searchParams.get('pinned') === 'true'
        : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    };

    const notes = service.list(await getCurrentUserId(), options);
    return successResponse(notes);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new NoteService();
    const body = await request.json();

    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const note = service.create({
      userId: await getCurrentUserId(),
      ...parsed.data,
    });

    return createdResponse(note);
  } catch (error) {
    return errorResponse(error);
  }
}
