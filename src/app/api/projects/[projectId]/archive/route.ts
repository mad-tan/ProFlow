import { NextRequest } from 'next/server';
import { ProjectService } from '@/lib/services/project.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

const DEFAULT_USER_ID = 'default-user';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ProjectService();
    const { projectId } = await params;

    // Check current status to determine whether to archive or unarchive
    const existing = service.getById(projectId);
    let project;

    if (existing.status === 'archived') {
      project = service.unarchive(projectId, DEFAULT_USER_ID);
    } else {
      project = service.archive(projectId, DEFAULT_USER_ID);
    }

    return successResponse(project);
  } catch (error) {
    return errorResponse(error);
  }
}
