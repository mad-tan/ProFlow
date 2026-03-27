import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { SubtaskRepository } from '@/lib/repositories/subtask.repository';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string; subtaskId: string }> }) {
  try {
    const { subtaskId } = await params;
    await getCurrentUserId();
    const body = await req.json();
    const repo = new SubtaskRepository();
    const updated = repo.update(subtaskId, body);
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ taskId: string; subtaskId: string }> }) {
  try {
    const { subtaskId } = await params;
    await getCurrentUserId();
    const repo = new SubtaskRepository();
    repo.delete(subtaskId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
