import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ChecklistService } from '@/lib/services/checklist.service';
import { successResponse, errorResponse, noContentResponse } from '@/lib/utils/api-response';

type RouteParams = { params: Promise<{ checklistId: string; itemId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ChecklistService();
    const { itemId } = await params;
    const body = await request.json();

    const item = service.updateItem(itemId, getCurrentUserId(), {
      content: body.content,
      isCompleted: body.isCompleted,
      sortOrder: body.sortOrder,
    });

    return successResponse(item);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ChecklistService();
    const { itemId } = await params;

    const item = service.toggleItem(itemId, getCurrentUserId());
    return successResponse(item);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ChecklistService();
    const { itemId } = await params;

    service.deleteItem(itemId, getCurrentUserId());
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
