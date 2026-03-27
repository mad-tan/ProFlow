import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { TaskCommentRepository } from '@/lib/repositories/subtask.repository';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    await getCurrentUserId();
    const repo = new TaskCommentRepository();
    return successResponse(repo.findByTaskId(taskId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const userId = await getCurrentUserId();
    const body = await req.json();
    const { content } = body;
    if (!content?.trim()) {
      return errorResponse(new Error('Content is required'));
    }
    const repo = new TaskCommentRepository();
    const comment = repo.create({ taskId, userId, content: content.trim() });
    return createdResponse(comment);
  } catch (error) {
    return errorResponse(error);
  }
}
