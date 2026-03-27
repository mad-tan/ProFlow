import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { TaskCommentRepository } from '@/lib/repositories/subtask.repository';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ taskId: string; commentId: string }> }) {
  try {
    const { commentId } = await params;
    await getCurrentUserId();
    const repo = new TaskCommentRepository();
    repo.delete(commentId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
