import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { createTaskSchema } from '@/lib/validators/task.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const service = new TaskService();
    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      dueDate: searchParams.get('dueDate') ?? undefined,
    };

    const tasks = service.listByUser(await getCurrentUserId(), filters);
    return successResponse(tasks);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new TaskService();
    const body = await request.json();

    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const task = service.create({
      userId: await getCurrentUserId(),
      ...parsed.data,
    });

    return createdResponse(task);
  } catch (error) {
    return errorResponse(error);
  }
}
