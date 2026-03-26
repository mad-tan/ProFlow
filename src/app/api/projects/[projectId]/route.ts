import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ProjectService } from '@/lib/services/project.service';
import { updateProjectSchema } from '@/lib/validators/project.schema';
import { successResponse, errorResponse, noContentResponse } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ProjectService();
    const { projectId } = await params;
    const project = service.getWithTaskCount(projectId);
    return successResponse(project);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ProjectService();
    const { projectId } = await params;
    const body = await request.json();

    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      throw ValidationError.fromZodError(parsed.error);
    }

    const project = service.update(projectId, await getCurrentUserId(), parsed.data);
    return successResponse(project);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ProjectService();
    const { projectId } = await params;
    service.delete(projectId, await getCurrentUserId());
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
