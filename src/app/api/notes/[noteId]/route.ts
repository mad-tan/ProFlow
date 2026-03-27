import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { NoteService } from '@/lib/services/note.service';
import { updateNoteSchema } from '@/lib/validators/note.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const service = new NoteService();
    const { noteId } = await params;
    const note = service.getById(noteId);
    return successResponse(note);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const service = new NoteService();
    const { noteId } = await params;
    const body = await request.json();

    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const note = service.update(noteId, await getCurrentUserId(), parsed.data);
    return successResponse(note);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const service = new NoteService();
    const { noteId } = await params;
    await service.delete(noteId, await getCurrentUserId());
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
