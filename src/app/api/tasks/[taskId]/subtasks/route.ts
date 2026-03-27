import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { SubtaskRepository } from '@/lib/repositories/subtask.repository';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    await getCurrentUserId(); // auth guard
    const repo = new SubtaskRepository();
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
    const { title } = body;
    if (!title?.trim()) {
      return errorResponse(new Error('Title is required'));
    }
    const repo = new SubtaskRepository();
    const count = repo.findByTaskId(taskId).length;
    const subtask = repo.create({ taskId, userId, title: title.trim(), isCompleted: false, sortOrder: count });
    return createdResponse(subtask);
  } catch (error) {
    return errorResponse(error);
  }
}
