import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { TaskService } from '@/lib/services/task.service';
import { ReminderService } from '@/lib/services/reminder.service';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { ChecklistService } from '@/lib/services/checklist.service';
import { ProjectService } from '@/lib/services/project.service';
import { AnalyticsService } from '@/lib/services/analytics.service';

interface ActionResult {
  type: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

interface AIChatResponse {
  role: 'assistant';
  content: string;
  action?: ActionResult;
}

function parseDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  if (lower.includes('next week')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }
  if (lower.includes('tonight') || lower.includes('this evening')) {
    const d = new Date(now);
    d.setHours(20, 0, 0, 0);
    return d.toISOString();
  }

  // Try to extract time like "at 3pm", "at 15:00"
  const timeMatch = text.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  // Default: 1 hour from now
  const d = new Date(now);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

function parseDueDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (lower.includes('next week')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  if (lower.includes('today')) {
    return now.toISOString().split('T')[0];
  }
  return undefined;
}

function parsePriority(text: string): 'urgent' | 'high' | 'medium' | 'low' | 'none' {
  const lower = text.toLowerCase();
  if (lower.includes('urgent')) return 'urgent';
  if (lower.includes('high priority') || lower.includes('important')) return 'high';
  if (lower.includes('medium priority')) return 'medium';
  if (lower.includes('low priority')) return 'low';
  return 'none';
}

async function processMessage(message: string): Promise<AIChatResponse> {
  const lower = message.toLowerCase().trim();

  // ─── Create Task ──────────────────────────────────────────────
  if (lower.includes('create task') || lower.includes('add task') || lower.includes('new task') || lower.includes('add a task') || lower.includes('create a task')) {
    const titleMatch = message.match(/(?:called|named|titled|"|'|:)\s*["']?(.+?)["']?\s*$/i)
      || message.match(/(?:task)\s+(?:called|named|titled|to|for)?\s*["']?(.+?)["']?\s*$/i)
      || message.match(/(?:create|add|new)\s+(?:a\s+)?task\s+["']?(.+?)["']?\s*$/i);
    const title = titleMatch ? titleMatch[1].replace(/["']+$/, '').trim() : 'New Task';
    const priority = parsePriority(message);
    const dueDate = parseDueDate(message);

    try {
      const service = new TaskService();
      const task = service.create({
        userId: getCurrentUserId(),
        title,
        priority,
        dueDate,
        status: 'todo',
        tags: [],
        sortOrder: 0,
        metadata: {},
      });
      return {
        role: 'assistant',
        content: `Done! I've created the task "${title}"${dueDate ? ` due ${dueDate}` : ''}${priority !== 'none' ? ` with ${priority} priority` : ''}. You can find it in your Tasks page.`,
        action: { type: 'create_task', success: true, data: task },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't create the task. ${err instanceof Error ? err.message : 'Please try again.'}`,
        action: { type: 'create_task', success: false, error: String(err) },
      };
    }
  }

  // ─── Create Project ───────────────────────────────────────────
  if (lower.includes('create project') || lower.includes('add project') || lower.includes('new project') || lower.includes('create a project') || lower.includes('add a project')) {
    const titleMatch = message.match(/(?:called|named|titled|"|'|:)\s*["']?(.+?)["']?\s*$/i)
      || message.match(/(?:project)\s+(?:called|named|titled)?\s*["']?(.+?)["']?\s*$/i)
      || message.match(/(?:create|add|new)\s+(?:a\s+)?project\s+["']?(.+?)["']?\s*$/i);
    const name = titleMatch ? titleMatch[1].replace(/["']+$/, '').trim() : 'New Project';

    try {
      const service = new ProjectService();
      const project = service.create({
        userId: getCurrentUserId(),
        name,
        status: 'active',
        metadata: {},
      });
      return {
        role: 'assistant',
        content: `Done! I've created the project "${name}". You can find it in your Projects page.`,
        action: { type: 'create_project', success: true, data: project },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't create the project. ${err instanceof Error ? err.message : 'Please try again.'}`,
        action: { type: 'create_project', success: false, error: String(err) },
      };
    }
  }

  // ─── Set Reminder ─────────────────────────────────────────────
  if (lower.includes('remind') || lower.includes('set reminder') || lower.includes('set a reminder') || lower.includes('create reminder') || lower.includes('add reminder')) {
    const titleMatch = message.match(/(?:remind\s+me\s+(?:to|about))\s+["']?(.+?)["']?\s*(?:at|in|on|tomorrow|tonight|next|$)/i)
      || message.match(/(?:reminder\s+(?:to|about|for))\s+["']?(.+?)["']?\s*(?:at|in|on|tomorrow|tonight|next|$)/i)
      || message.match(/(?:remind|reminder)\s+["']?(.+?)["']?\s*$/i);
    const title = titleMatch ? titleMatch[1].replace(/["']+$/, '').trim() : 'Reminder';
    const remindAt = parseDate(message);

    try {
      const service = new ReminderService();
      const reminder = service.create({
        userId: getCurrentUserId(),
        title,
        remindAt,
        frequency: 'once',
      });
      return {
        role: 'assistant',
        content: `Done! I've set a reminder for "${title}" at ${new Date(remindAt).toLocaleString()}.`,
        action: { type: 'set_reminder', success: true, data: reminder },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't set the reminder. ${err instanceof Error ? err.message : 'Please try again.'}`,
        action: { type: 'set_reminder', success: false, error: String(err) },
      };
    }
  }

  // ─── Start Timer ──────────────────────────────────────────────
  if (lower.includes('start timer') || lower.includes('start tracking') || lower.includes('track time') || lower.includes('start a timer')) {
    const taskMatch = message.match(/(?:for|on)\s+["']?(.+?)["']?\s*$/i);
    const description = taskMatch ? taskMatch[1].replace(/["']+$/, '').trim() : undefined;

    try {
      const service = new TimeTrackingService();
      const entry = service.startTimer(getCurrentUserId(), undefined, description);
      return {
        role: 'assistant',
        content: description
          ? `Timer started for "${description}". I'll keep tracking until you tell me to stop.`
          : "Timer started! I'll keep tracking until you tell me to stop.",
        action: { type: 'start_timer', success: true, data: entry },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't start the timer. ${err instanceof Error ? err.message : 'You may already have an active timer.'}`,
        action: { type: 'start_timer', success: false, error: String(err) },
      };
    }
  }

  // ─── Stop Timer ───────────────────────────────────────────────
  if (lower.includes('stop timer') || lower.includes('stop tracking') || lower.includes('stop the timer')) {
    try {
      const service = new TimeTrackingService();
      const entry = service.stopTimer(getCurrentUserId());
      const duration = entry.durationMinutes ?? 0;
      return {
        role: 'assistant',
        content: `Timer stopped! You tracked ${duration} minute${duration !== 1 ? 's' : ''}.`,
        action: { type: 'stop_timer', success: true, data: entry },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't stop the timer. ${err instanceof Error ? err.message : 'You may not have an active timer.'}`,
        action: { type: 'stop_timer', success: false, error: String(err) },
      };
    }
  }

  // ─── Create Checklist ─────────────────────────────────────────
  if (lower.includes('create checklist') || lower.includes('new checklist') || lower.includes('add checklist') || lower.includes('create a checklist') || lower.includes('add a checklist')) {
    const titleMatch = message.match(/(?:called|named|titled|"|'|:)\s*["']?(.+?)["']?\s*$/i)
      || message.match(/(?:checklist)\s+(?:called|named|titled|for)?\s*["']?(.+?)["']?\s*$/i)
      || message.match(/(?:create|add|new)\s+(?:a\s+)?checklist\s+["']?(.+?)["']?\s*$/i);
    const title = titleMatch ? titleMatch[1].replace(/["']+$/, '').trim() : 'New Checklist';

    try {
      const service = new ChecklistService();
      const checklist = service.create({
        userId: getCurrentUserId(),
        title,
      });
      return {
        role: 'assistant',
        content: `Done! I've created the checklist "${title}". You can find it in your Checklists page.`,
        action: { type: 'create_checklist', success: true, data: checklist },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't create the checklist. ${err instanceof Error ? err.message : 'Please try again.'}`,
        action: { type: 'create_checklist', success: false, error: String(err) },
      };
    }
  }

  // ─── Show Summary / Analytics ─────────────────────────────────
  if (lower.includes('summary') || lower.includes('how am i doing') || lower.includes('productivity') || lower.includes('analytics') || lower.includes('stats') || lower.includes('overview')) {
    try {
      const service = new AnalyticsService();
      const summary = service.getSummary(getCurrentUserId());
      const s = summary as Record<string, unknown>;
      const totalTasks = s.totalTasks ?? 0;
      const completedTasks = s.completedTasks ?? 0;
      const pendingTasks = s.pendingTasks ?? s.todoTasks ?? 0;
      const totalTrackedMinutes = s.totalTrackedMinutes ?? 0;

      return {
        role: 'assistant',
        content: `Here's your productivity summary:\n\n` +
          `- **Total tasks**: ${totalTasks}\n` +
          `- **Completed**: ${completedTasks}\n` +
          `- **Pending**: ${pendingTasks}\n` +
          `- **Time tracked**: ${Math.round(Number(totalTrackedMinutes) / 60 * 10) / 10} hours\n\n` +
          `Visit the Analytics page for more detailed insights.`,
        action: { type: 'show_summary', success: true, data: summary },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't fetch your summary. ${err instanceof Error ? err.message : 'Please try again.'}`,
        action: { type: 'show_summary', success: false, error: String(err) },
      };
    }
  }

  // ─── List Tasks ───────────────────────────────────────────────
  if (lower.includes('my tasks') || lower.includes('list tasks') || lower.includes('show tasks') || lower.includes('what tasks') || lower.includes('pending tasks')) {
    try {
      const service = new TaskService();
      const tasks = service.listByUser(getCurrentUserId(), {});
      const taskList = (tasks as Array<{ title: string; status: string; priority: string }>)
        .slice(0, 10)
        .map((t, i) => `${i + 1}. **${t.title}** (${t.status}, ${t.priority})`)
        .join('\n');

      return {
        role: 'assistant',
        content: tasks.length === 0
          ? "You don't have any tasks yet. Would you like me to create one?"
          : `Here are your tasks:\n\n${taskList}${tasks.length > 10 ? `\n\n...and ${tasks.length - 10} more. Visit the Tasks page to see all.` : ''}`,
        action: { type: 'list_tasks', success: true, data: { count: tasks.length } },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't fetch your tasks. Please try again.`,
        action: { type: 'list_tasks', success: false, error: String(err) },
      };
    }
  }

  // ─── List Projects ────────────────────────────────────────────
  if (lower.includes('my projects') || lower.includes('list projects') || lower.includes('show projects') || lower.includes('what projects')) {
    try {
      const service = new ProjectService();
      const projects = service.listByUser(getCurrentUserId(), {});
      const projectList = (projects as Array<{ name: string; status: string }>)
        .slice(0, 10)
        .map((p, i) => `${i + 1}. **${p.name}** (${p.status})`)
        .join('\n');

      return {
        role: 'assistant',
        content: projects.length === 0
          ? "You don't have any projects yet. Would you like me to create one?"
          : `Here are your projects:\n\n${projectList}`,
        action: { type: 'list_projects', success: true, data: { count: projects.length } },
      };
    } catch (err) {
      return {
        role: 'assistant',
        content: `Sorry, I couldn't fetch your projects. Please try again.`,
        action: { type: 'list_projects', success: false, error: String(err) },
      };
    }
  }

  // ─── Help / Default ───────────────────────────────────────────
  return {
    role: 'assistant',
    content:
      "I can help you manage your productivity! Here's what I can do:\n\n" +
      '- **Create tasks**: "Add a task called Review PR"\n' +
      '- **Create projects**: "Create a project called Website Redesign"\n' +
      '- **Set reminders**: "Remind me to check emails at 3pm"\n' +
      '- **Track time**: "Start a timer for deep work" / "Stop timer"\n' +
      '- **Create checklists**: "Create a checklist called Morning Routine"\n' +
      '- **View tasks/projects**: "Show my tasks" / "List my projects"\n' +
      '- **Productivity summary**: "How am I doing?" / "Show my stats"',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return errorResponse(
        new Error('A "message" field of type string is required'),
        'Invalid request body'
      );
    }

    const response = await processMessage(message);
    return successResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
}
