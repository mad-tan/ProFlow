import { getCurrentUserId } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { ProjectService } from '@/lib/services/project.service';
import { NoteService } from '@/lib/services/note.service';
import { ReminderService } from '@/lib/services/reminder.service';
import { ChecklistService } from '@/lib/services/checklist.service';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import { errorResponse } from '@/lib/utils/api-response';

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const tasks = new TaskService().listByUser(userId, {});
    const projects = new ProjectService().listByUser(userId, {});
    const notes = new NoteService().list(userId, {});
    const reminders = new ReminderService().listByUser(userId, {});
    const checklists = new ChecklistService().listByUser(userId, {});
    const timeEntries = new TimeTrackingService().listByUser(userId, {});
    const mentalHealth = new MentalHealthService();
    const checkIns = mentalHealth.getCheckIns(userId);
    const journalEntries = mentalHealth.getJournalEntries(userId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      tasks,
      projects,
      notes,
      reminders,
      checklists,
      timeEntries,
      checkIns,
      journalEntries,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="proflow-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
