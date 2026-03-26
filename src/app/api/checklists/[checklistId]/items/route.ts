import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ChecklistService } from '@/lib/services/checklist.service';
import { createdResponse, errorResponse } from '@/lib/utils/api-response';

type RouteParams = { params: Promise<{ checklistId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ChecklistService();
    const { checklistId } = await params;
    const body = await request.json();

    const item = service.addItem(checklistId, await getCurrentUserId(), body.title, body.sortOrder);
    return createdResponse(item);
  } catch (error) {
    return errorResponse(error);
  }
}
