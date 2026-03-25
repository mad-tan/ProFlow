import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ReminderService } from '@/lib/services/reminder.service';
import { successResponse, errorResponse, noContentResponse } from '@/lib/utils/api-response';

type RouteParams = { params: Promise<{ reminderId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ReminderService();
    const { reminderId } = await params;
    const reminder = service.getById(reminderId);
    return successResponse(reminder);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ReminderService();
    const { reminderId } = await params;
    const body = await request.json();

    const reminder = service.update(reminderId, getCurrentUserId(), {
      title: body.title,
      description: body.description,
      remindAt: body.remindAt,
      frequency: body.frequency,
      isActive: body.isActive,
    });

    return successResponse(reminder);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ReminderService();
    const { reminderId } = await params;

    const reminder = service.dismiss(reminderId, getCurrentUserId());
    return successResponse(reminder);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const service = new ReminderService();
    const { reminderId } = await params;

    service.delete(reminderId, getCurrentUserId());
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
