import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ChecklistService } from '@/lib/services/checklist.service';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const service = new ChecklistService();
    const { searchParams } = new URL(request.url);

    const options: Record<string, unknown> = {};
    if (searchParams.get('isTemplate') === 'true') {
      return successResponse(service.listTemplates(await getCurrentUserId()));
    }

    if (searchParams.get('projectId')) {
      options.projectId = searchParams.get('projectId');
    }

    const checklists = service.listByUser(await getCurrentUserId(), options);
    return successResponse(checklists);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new ChecklistService();
    const body = await request.json();

    const checklist = service.create({
      userId: await getCurrentUserId(),
      title: body.title,
      description: body.description,
      isTemplate: body.isTemplate,
      projectId: body.projectId,
    });

    return createdResponse(checklist);
  } catch (error) {
    return errorResponse(error);
  }
}
