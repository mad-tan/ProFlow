import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ReminderService } from '@/lib/services/reminder.service';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const service = new ReminderService();
    const { searchParams } = new URL(request.url);

    const options: Record<string, unknown> = {};
    if (searchParams.get('isActive') !== null) {
      options.isActive = searchParams.get('isActive') === 'true';
    }
    if (searchParams.get('taskId')) {
      options.taskId = searchParams.get('taskId');
    }

    const reminders = service.listByUser(await getCurrentUserId(), options);
    return successResponse(reminders);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = new ReminderService();
    const body = await request.json();

    const reminder = service.create({
      userId: await getCurrentUserId(),
      taskId: body.taskId,
      title: body.title,
      description: body.description,
      remindAt: body.remindAt,
      frequency: body.frequency,
    });

    return createdResponse(reminder);
  } catch (error) {
    return errorResponse(error);
  }
}
