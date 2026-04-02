import { getCurrentUserId } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task.service';
import { ProjectService } from '@/lib/services/project.service';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { errorResponse } from '@/lib/utils/api-response';
import { NotFoundError } from '@/lib/utils/errors';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    const { projectId } = await params;

    const projectService = new ProjectService();
    const project = projectService.getWithTaskCount(projectId);

    // Ensure the project belongs to the current user
    if ((project as any).userId !== userId) {
      throw new NotFoundError('Project', projectId);
    }

    const tasks = new TaskService().listByProject(projectId);

    // Get time entries for all tasks in this project
    const taskIds = new Set(tasks.map((t) => t.id));
    const allTimeEntries = new TimeTrackingService().listByUser(userId, {});
    const timeEntries = allTimeEntries.filter(
      (e) => e.taskId && taskIds.has(e.taskId)
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      project,
      tasks,
      timeEntries,
    };

    const slug = (project as any).name
      ? (project as any).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : projectId;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="proflow-project-${slug}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
