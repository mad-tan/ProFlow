import { NextRequest } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { updateTaskSchema } from '@/lib/validators/task.schema';
import { successResponse, errorResponse, noContentResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

const DEFAULT_USER_ID = 'default-user';

type RouteParams = { params: Promise<{ taskId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new TaskService();
    const { taskId } = await params;
    const task = service.getById(taskId);
    return successResponse(task);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new TaskService();
    const { taskId } = await params;
    const body = await request.json();

    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const task = service.update(taskId, DEFAULT_USER_ID, parsed.data);
    return successResponse(task);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new TaskService();
    const { taskId } = await params;
    const body = await request.json();

    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const task = service.update(taskId, DEFAULT_USER_ID, parsed.data);
    return successResponse(task);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new TaskService();
    const { taskId } = await params;
    service.delete(taskId, DEFAULT_USER_ID);
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
