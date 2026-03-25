import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ChecklistService } from '@/lib/services/checklist.service';
import { successResponse, errorResponse, noContentResponse } from '@/lib/utils/api-response';

type RouteParams = { params: Promise<{ checklistId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ChecklistService();
    const { checklistId } = await params;
    const checklist = service.getWithItems(checklistId);
    return successResponse(checklist);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ChecklistService();
    const { checklistId } = await params;
    const body = await request.json();

    const checklist = service.update(checklistId, getCurrentUserId(), {
      title: body.title,
      description: body.description,
    });

    return successResponse(checklist);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ChecklistService();
    const { checklistId } = await params;
    service.delete(checklistId, getCurrentUserId());
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
