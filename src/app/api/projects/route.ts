import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ProjectService } from '@/lib/services/project.service';
import { createProjectSchema } from '@/lib/validators/project.schema';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const service = new ProjectService();
    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      includeArchived: searchParams.get('includeArchived') === 'true',
    };

    const projects = service.listByUserWithTaskCounts(await getCurrentUserId(), filters);
    return successResponse(projects);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new ProjectService();
    const body = await request.json();

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const project = service.create({
      userId: await getCurrentUserId(),
      ...parsed.data,
    });

    return createdResponse(project);
  } catch (error) {
    return errorResponse(error);
  }
}
