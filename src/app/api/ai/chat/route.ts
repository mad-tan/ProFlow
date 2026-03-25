import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { TaskService } from '@/lib/services/task.service';
import { ReminderService } from '@/lib/services/reminder.service';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { ChecklistService } from '@/lib/services/checklist.service';
import { ProjectService } from '@/lib/services/project.service';
import { AnalyticsService } from '@/lib/services/analytics.service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PendingIntent {
  type: string;
  step: string;
  collected: Record<string, unknown>;
}

interface ChatResponse {
  role: 'assistant';
  content: string;
  action?: { type: string; success: boolean; data?: unknown; error?: string };
  pendingIntent?: PendingIntent | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function lower(s: string) { return s.toLowerCase().trim(); }

function extractTitle(msg: string): string | null {
  const patterns = [
    /(?:called|named|titled)\s+["']?([^"'\n]+?)["']?\s*$/i,
    /["']([^"']+?)["']/,
    /(?:create|add|new|make)\s+(?:a\s+)?(?:task|project|checklist|reminder)\s+(?:called\s+|named\s+|titled\s+|for\s+)?["']?([a-zA-Z][^,\n(due|priority|by|at|on|in)]{2,60}?)["']?\s*(?:,|$|due|priority|by|at|on|in)/i,
  ];
  for (const p of patterns) {
    const m = msg.match(p);
    if (m?.[1]?.trim().length > 1) return m[1].trim().replace(/["']+$/, '').trim();
  }
  // Strip intent keywords and see what remains as the title
  const stripped = msg
    .replace(/\b(create|add|new|make|a|an|task|project|checklist|reminder|please|can you|could you|would you|i want to|i'd like to|help me)\b/gi, '')
    .replace(/\b(called|named|titled|for|to)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length > 2 && stripped.length < 80) return stripped;
  return null;
}

function extractDueDate(msg: string): string | null {
  const l = lower(msg);
  const now = new Date();
  if (/\bno deadline\b|\bno due date\b|\bskip\b|\bnone\b|\bno\b/.test(l)) return 'none';
  if (/\btoday\b/.test(l)) return now.toISOString().split('T')[0];
  if (/\btomorrow\b/.test(l)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (/\bnext week\b/.test(l)) {
    const d = new Date(now); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  if (/\bnext month\b/.test(l)) {
    const d = new Date(now); d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }
  // "in X days"
  const inDays = l.match(/in\s+(\d+)\s+days?/);
  if (inDays) {
    const d = new Date(now); d.setDate(d.getDate() + parseInt(inDays[1]));
    return d.toISOString().split('T')[0];
  }
  // explicit date pattern like "march 15", "15th march", "3/15", "2024-03-15"
  const explicit = msg.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return explicit[1];
  const monthDay = msg.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i);
  if (monthDay) {
    const d = new Date(`${monthDay[0]} ${now.getFullYear()}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

function extractPriority(msg: string): string | null {
  const l = lower(msg);
  if (/\bskip\b|\bnone\b|\bno priority\b/.test(l)) return 'none';
  if (/\burgent\b/.test(l)) return 'urgent';
  if (/\bhigh\b|\bimportant\b/.test(l)) return 'high';
  if (/\bmedium\b|\bnormal\b/.test(l)) return 'medium';
  if (/\blow\b/.test(l)) return 'low';
  return null;
}

function extractReminderTime(msg: string): string | null {
  const l = lower(msg);
  if (/\bskip\b|\bnone\b/.test(l)) return 'none';
  const now = new Date();

  if (/\btomorrow\b/.test(l)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  if (/\btonight\b|\bthis evening\b/.test(l)) {
    const d = new Date(now); d.setHours(20, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  if (/\btoday\b/.test(l)) {
    const d = new Date(now); d.setHours(17, 0, 0, 0);
    if (d <= now) d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString();
  }
  if (/\bnext week\b/.test(l)) {
    const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  // "at 3pm", "at 15:30"
  const timeMatch = msg.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ap = timeMatch[3]?.toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    const d = new Date(now); d.setHours(h, m, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  // "in X hours/minutes"
  const inHours = l.match(/in\s+(\d+)\s+hours?/);
  if (inHours) {
    const d = new Date(now); d.setHours(d.getHours() + parseInt(inHours[1]));
    return d.toISOString();
  }
  const inMins = l.match(/in\s+(\d+)\s+min(?:utes?)?/);
  if (inMins) {
    const d = new Date(now); d.setMinutes(d.getMinutes() + parseInt(inMins[1]));
    return d.toISOString();
  }
  return null;
}

function findTaskByName(userId: string, name: string): { id: string; title: string; status: string } | null {
  const service = new TaskService();
  const tasks = service.listByUser(userId, {}) as Array<{ id: string; title: string; status: string }>;
  const nl = name.toLowerCase();
  // Exact match first
  let found = tasks.find(t => t.title.toLowerCase() === nl);
  // Then partial
  if (!found) found = tasks.find(t => t.title.toLowerCase().includes(nl) || nl.includes(t.title.toLowerCase()));
  return found ?? null;
}

function isConfirm(msg: string): boolean {
  return /\b(yes|yeah|yep|yup|sure|confirm|ok|okay|do it|go ahead|delete it|remove it)\b/i.test(msg);
}

function isCancel(msg: string): boolean {
  return /\b(no|nope|cancel|nevermind|never mind|stop|abort|don't|dont)\b/i.test(msg);
}

function isSkip(msg: string): boolean {
  return /\b(skip|none|no|not now|later|don't|dont|pass)\b/i.test(msg);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Intent Detection ────────────────────────────────────────────────────────

type IntentType =
  | 'create_task' | 'delete_task' | 'complete_task' | 'list_tasks'
  | 'create_project' | 'list_projects'
  | 'set_reminder' | 'list_reminders'
  | 'start_timer' | 'stop_timer'
  | 'create_checklist'
  | 'show_summary'
  | 'help' | 'unknown';

function detectIntent(msg: string): IntentType {
  const l = lower(msg);

  if (/\b(delete|remove|trash)\b.*(task|todo)\b/i.test(msg) || /\b(task|todo).*(delete|remove|trash)\b/i.test(msg)) return 'delete_task';
  if (/\b(complete|finish|done|mark.*done|close)\b.*(task|todo)\b/i.test(msg) || /\b(task|todo).*(complete|done|finish)\b/i.test(msg)) return 'complete_task';
  if (/\b(create|add|new|make)\b.*(task|todo)\b/i.test(msg) || /\b(task|todo)\b.*(create|add|new)\b/i.test(msg)) return 'create_task';
  if (/\b(show|list|view|get|what are|my)\b.*(task|todo)\b/i.test(msg)) return 'list_tasks';

  if (/\b(create|add|new|make)\b.*(project)\b/i.test(msg)) return 'create_project';
  if (/\b(show|list|view|my)\b.*(project)\b/i.test(msg)) return 'list_projects';

  if (/\b(remind|reminder|set.*reminder|create.*reminder)\b/i.test(msg)) return 'set_reminder';
  if (/\b(show|list|my)\b.*(reminder)\b/i.test(msg)) return 'list_reminders';

  if (/\b(start|begin|track)\b.*(timer|time|tracking)\b/i.test(msg) || /\b(timer|track time)\b/i.test(msg) && !/stop|end/i.test(msg)) return 'start_timer';
  if (/\b(stop|end|pause)\b.*(timer|time|tracking)\b/i.test(msg) || /\bstop timer\b/i.test(msg)) return 'stop_timer';

  if (/\b(create|add|new|make)\b.*(checklist)\b/i.test(msg)) return 'create_checklist';

  if (/\b(summary|stats|analytics|overview|how am i doing|productivity|progress)\b/i.test(msg)) return 'show_summary';

  if (/\b(help|what can you do|commands|capabilities|features)\b/i.test(msg)) return 'help';

  return 'unknown';
}

// ─── Intent Handlers ─────────────────────────────────────────────────────────

async function handlePendingIntent(
  msg: string,
  pending: PendingIntent,
  userId: string
): Promise<ChatResponse> {
  const l = lower(msg);

  // Allow cancellation at any point
  if (isCancel(msg) && !['awaiting_delete_confirm'].includes(pending.step)) {
    return { role: 'assistant', content: "Okay, cancelled. Is there anything else I can help you with?", pendingIntent: null };
  }

  switch (pending.type) {

    // ── Create Task ──────────────────────────────────────────────
    case 'create_task': {
      const c = pending.collected;

      if (pending.step === 'awaiting_title') {
        // The whole message is the title
        const title = msg.trim().replace(/["']+$/, '').trim();
        if (!title || title.length < 1) {
          return { role: 'assistant', content: "I didn't catch the name. What should the task be called?", pendingIntent: pending };
        }
        c.title = title;
        return {
          role: 'assistant',
          content: `Got it — **"${title}"**. When is it due? (e.g., *tomorrow*, *next week*, *March 15*, or say *no deadline*)`,
          pendingIntent: { type: 'create_task', step: 'awaiting_due_date', collected: c },
        };
      }

      if (pending.step === 'awaiting_due_date') {
        const dueDate = extractDueDate(msg);
        if (dueDate && dueDate !== 'none') c.dueDate = dueDate;
        return {
          role: 'assistant',
          content: `What priority? (*urgent*, *high*, *medium*, *low*, or *skip*)`,
          pendingIntent: { type: 'create_task', step: 'awaiting_priority', collected: c },
        };
      }

      if (pending.step === 'awaiting_priority') {
        const priority = extractPriority(msg);
        if (priority && priority !== 'none') c.priority = priority;
        // Now execute
        try {
          const service = new TaskService();
          const task = service.create({
            userId,
            title: c.title as string,
            priority: (c.priority as string | undefined) ?? 'medium',
            dueDate: (c.dueDate as string | undefined) ?? null,
            status: 'todo',
            tags: [],
          });
          const parts = [`Done! ✓ Created task **"${c.title}"**`];
          if (c.dueDate) parts.push(`due ${formatDate(c.dueDate as string)}`);
          if (c.priority && c.priority !== 'medium') parts.push(`with **${c.priority}** priority`);
          return {
            role: 'assistant',
            content: parts.join(' ') + '. You can find it on the Tasks page.',
            action: { type: 'create_task', success: true, data: task },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Sorry, couldn't create the task: ${err instanceof Error ? err.message : 'unknown error'}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Create Project ───────────────────────────────────────────
    case 'create_project': {
      const c = pending.collected;
      if (pending.step === 'awaiting_name') {
        const name = msg.trim().replace(/["']+$/, '').trim();
        if (!name || name.length < 1) {
          return { role: 'assistant', content: "What should the project be called?", pendingIntent: pending };
        }
        c.name = name;
        return {
          role: 'assistant',
          content: `Nice! **"${name}"** — want to add a description? (or say *skip*)`,
          pendingIntent: { type: 'create_project', step: 'awaiting_description', collected: c },
        };
      }
      if (pending.step === 'awaiting_description') {
        if (!isSkip(msg)) c.description = msg.trim();
        try {
          const service = new ProjectService();
          const project = service.create({
            userId,
            name: c.name as string,
            description: c.description as string | undefined,
            status: 'active',
            metadata: {},
          });
          return {
            role: 'assistant',
            content: `Done! ✓ Created project **"${c.name}"**. You can find it on the Projects page.`,
            action: { type: 'create_project', success: true, data: project },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't create the project: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Set Reminder ─────────────────────────────────────────────
    case 'set_reminder': {
      const c = pending.collected;
      if (pending.step === 'awaiting_title') {
        c.title = msg.trim().replace(/["']+$/, '').trim();
        return {
          role: 'assistant',
          content: `When should I remind you? (e.g., *tomorrow*, *at 3pm*, *in 2 hours*)`,
          pendingIntent: { type: 'set_reminder', step: 'awaiting_time', collected: c },
        };
      }
      if (pending.step === 'awaiting_time') {
        const remindAt = extractReminderTime(msg);
        if (!remindAt || remindAt === 'none') {
          return { role: 'assistant', content: "I need a time for the reminder. When should I remind you? (e.g., *at 3pm*, *in 1 hour*, *tomorrow morning*)", pendingIntent: pending };
        }
        try {
          const service = new ReminderService();
          const reminder = service.create({
            userId,
            title: c.title as string,
            remindAt,
            frequency: 'once',
          });
          return {
            role: 'assistant',
            content: `Done! ✓ Reminder set for **"${c.title}"** at **${new Date(remindAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}**.`,
            action: { type: 'set_reminder', success: true, data: reminder },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't set the reminder: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Delete Task ──────────────────────────────────────────────
    case 'delete_task': {
      const c = pending.collected;
      if (pending.step === 'awaiting_name') {
        const name = msg.trim().replace(/["']+$/, '').trim();
        const task = findTaskByName(userId, name);
        if (!task) {
          return { role: 'assistant', content: `I couldn't find a task matching **"${name}"**. Check the spelling or try listing your tasks first ("show my tasks").`, pendingIntent: null };
        }
        c.taskId = task.id;
        c.taskTitle = task.title;
        return {
          role: 'assistant',
          content: `Are you sure you want to **permanently delete** the task **"${task.title}"**? This cannot be undone. (say *yes* to confirm or *no* to cancel)`,
          pendingIntent: { type: 'delete_task', step: 'awaiting_confirmation', collected: c },
        };
      }
      if (pending.step === 'awaiting_confirmation') {
        if (isCancel(msg)) {
          return { role: 'assistant', content: "Cancelled. The task was not deleted.", pendingIntent: null };
        }
        if (isConfirm(msg)) {
          try {
            const service = new TaskService();
            service.delete(c.taskId as string, userId);
            return {
              role: 'assistant',
              content: `Done. Task **"${c.taskTitle}"** has been deleted.`,
              action: { type: 'delete_task', success: true, data: { id: c.taskId } },
              pendingIntent: null,
            };
          } catch (err) {
            return { role: 'assistant', content: `Couldn't delete the task: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
          }
        }
        return { role: 'assistant', content: "Please say *yes* to delete or *no* to cancel.", pendingIntent: pending };
      }
      break;
    }

    // ── Complete Task ────────────────────────────────────────────
    case 'complete_task': {
      const c = pending.collected;
      if (pending.step === 'awaiting_name') {
        const name = msg.trim().replace(/["']+$/, '').trim();
        const task = findTaskByName(userId, name);
        if (!task) {
          return { role: 'assistant', content: `I couldn't find a task matching **"${name}"**. Try listing your tasks first.`, pendingIntent: null };
        }
        try {
          const service = new TaskService();
          service.update(task.id, userId, { status: 'done' });
          return {
            role: 'assistant',
            content: `Done! ✓ Marked **"${task.title}"** as complete.`,
            action: { type: 'complete_task', success: true, data: { id: task.id } },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't complete the task: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Create Checklist ─────────────────────────────────────────
    case 'create_checklist': {
      const c = pending.collected;
      if (pending.step === 'awaiting_title') {
        const title = msg.trim().replace(/["']+$/, '').trim();
        if (!title) return { role: 'assistant', content: "What should the checklist be called?", pendingIntent: pending };
        try {
          const service = new ChecklistService();
          const checklist = service.create({ userId, title });
          return {
            role: 'assistant',
            content: `Done! ✓ Created checklist **"${title}"**. You can find it on the Checklists page.`,
            action: { type: 'create_checklist', success: true, data: checklist },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't create the checklist: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }
      break;
    }
  }

  return { role: 'assistant', content: "I'm not sure what you mean. Type *cancel* to start over.", pendingIntent: pending };
}

async function handleFreshIntent(msg: string, intent: IntentType, userId: string): Promise<ChatResponse> {

  switch (intent) {

    // ── Create Task ──────────────────────────────────────────────
    case 'create_task': {
      const titleFromMsg = extractTitle(msg.replace(/\b(create|add|new|make)\s+(a\s+)?task\b/gi, '').trim());
      const priority = extractPriority(msg);
      const dueDate = extractDueDate(msg);

      if (!titleFromMsg) {
        return {
          role: 'assistant',
          content: "Sure! What should the task be called?",
          pendingIntent: { type: 'create_task', step: 'awaiting_title', collected: { priority: priority ?? undefined, dueDate: dueDate !== 'none' ? dueDate : undefined } },
        };
      }

      // Have title — ask for due date unless already provided
      if (!dueDate) {
        return {
          role: 'assistant',
          content: `Got it — **"${titleFromMsg}"**. When is it due? (e.g., *tomorrow*, *next week*, or *no deadline*)`,
          pendingIntent: { type: 'create_task', step: 'awaiting_due_date', collected: { title: titleFromMsg, priority: priority ?? undefined } },
        };
      }

      // Have title + due date — ask priority unless already provided
      const resolvedDue = dueDate !== 'none' ? dueDate : undefined;
      if (!priority) {
        return {
          role: 'assistant',
          content: `What priority should **"${titleFromMsg}"** have? (*urgent*, *high*, *medium*, *low*, or *skip*)`,
          pendingIntent: { type: 'create_task', step: 'awaiting_priority', collected: { title: titleFromMsg, dueDate: resolvedDue } },
        };
      }

      // Have everything — execute
      try {
        const service = new TaskService();
        const task = service.create({ userId, title: titleFromMsg, priority: priority !== 'none' ? priority : 'medium', dueDate: resolvedDue ?? null, status: 'todo', tags: [] });
        const parts = [`Done! ✓ Created task **"${titleFromMsg}"**`];
        if (resolvedDue) parts.push(`due ${formatDate(resolvedDue)}`);
        if (priority && priority !== 'medium' && priority !== 'none') parts.push(`with **${priority}** priority`);
        return { role: 'assistant', content: parts.join(' ') + '.', action: { type: 'create_task', success: true, data: task }, pendingIntent: null };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't create the task: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── Delete Task ──────────────────────────────────────────────
    case 'delete_task': {
      const nameFromMsg = extractTitle(msg.replace(/\b(delete|remove|trash)\s+(the\s+)?task\b/gi, '').trim());
      if (!nameFromMsg) {
        return {
          role: 'assistant',
          content: "Which task do you want to delete? Tell me its name.",
          pendingIntent: { type: 'delete_task', step: 'awaiting_name', collected: {} },
        };
      }
      const task = findTaskByName(userId, nameFromMsg);
      if (!task) {
        return {
          role: 'assistant',
          content: `I couldn't find a task matching **"${nameFromMsg}"**. Try saying "show my tasks" to see what you have.`,
          pendingIntent: null,
        };
      }
      return {
        role: 'assistant',
        content: `Are you sure you want to **permanently delete** the task **"${task.title}"**? (say *yes* to confirm or *no* to cancel)`,
        pendingIntent: { type: 'delete_task', step: 'awaiting_confirmation', collected: { taskId: task.id, taskTitle: task.title } },
      };
    }

    // ── Complete Task ────────────────────────────────────────────
    case 'complete_task': {
      const nameFromMsg = extractTitle(msg.replace(/\b(complete|finish|done|mark|close)\s+(the\s+)?(task\s+)?/gi, '').trim());
      if (!nameFromMsg) {
        return {
          role: 'assistant',
          content: "Which task do you want to mark as done? Tell me its name.",
          pendingIntent: { type: 'complete_task', step: 'awaiting_name', collected: {} },
        };
      }
      const task = findTaskByName(userId, nameFromMsg);
      if (!task) {
        return {
          role: 'assistant',
          content: `I couldn't find a task matching **"${nameFromMsg}"**. Try "show my tasks" to see your tasks.`,
          pendingIntent: null,
        };
      }
      try {
        const service = new TaskService();
        service.update(task.id, userId, { status: 'done' });
        return { role: 'assistant', content: `Done! ✓ Marked **"${task.title}"** as complete.`, action: { type: 'complete_task', success: true, data: { id: task.id } }, pendingIntent: null };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't complete the task: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── List Tasks ───────────────────────────────────────────────
    case 'list_tasks': {
      const service = new TaskService();
      const tasks = service.listByUser(userId, {}) as Array<{ id: string; title: string; status: string; priority: string; dueDate?: string | null }>;
      const active = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
      if (tasks.length === 0) {
        return { role: 'assistant', content: "You don't have any tasks yet. Say *create a task* to add one!", pendingIntent: null };
      }
      const list = active.slice(0, 8).map((t, i) => {
        const parts = [`${i + 1}. **${t.title}**`];
        if (t.priority && t.priority !== 'none' && t.priority !== 'medium') parts.push(`(${t.priority})`);
        if (t.dueDate) parts.push(`— due ${formatDate(t.dueDate)}`);
        return parts.join(' ');
      }).join('\n');
      const extra = active.length > 8 ? `\n\n...and ${active.length - 8} more on the Tasks page.` : '';
      return { role: 'assistant', content: `Here are your active tasks:\n\n${list}${extra}`, pendingIntent: null };
    }

    // ── Create Project ───────────────────────────────────────────
    case 'create_project': {
      const nameFromMsg = extractTitle(msg.replace(/\b(create|add|new|make)\s+(a\s+)?project\b/gi, '').trim());
      if (!nameFromMsg) {
        return {
          role: 'assistant',
          content: "Sure! What should the project be called?",
          pendingIntent: { type: 'create_project', step: 'awaiting_name', collected: {} },
        };
      }
      return {
        role: 'assistant',
        content: `Nice — **"${nameFromMsg}"**. Want to add a description? (or say *skip*)`,
        pendingIntent: { type: 'create_project', step: 'awaiting_description', collected: { name: nameFromMsg } },
      };
    }

    // ── List Projects ────────────────────────────────────────────
    case 'list_projects': {
      const service = new ProjectService();
      const projects = service.listByUser(userId, {}) as Array<{ id: string; name: string; status: string }>;
      if (projects.length === 0) {
        return { role: 'assistant', content: "You don't have any projects yet. Say *create a project* to add one!", pendingIntent: null };
      }
      const list = projects.slice(0, 8).map((p, i) => `${i + 1}. **${p.name}** — ${p.status}`).join('\n');
      return { role: 'assistant', content: `Here are your projects:\n\n${list}`, pendingIntent: null };
    }

    // ── Set Reminder ─────────────────────────────────────────────
    case 'set_reminder': {
      const stripped = msg.replace(/\b(set|create|add)?\s*(a\s+)?reminder\b/gi, '').replace(/\b(remind\s+me)\b/gi, '').trim();
      const titleFromMsg = extractTitle(stripped.replace(/\b(to|about|for)\b/gi, '').replace(/\b(at|in|on|by|tomorrow|tonight|today|next|this)\s+.*/gi, '').trim());
      const timeFromMsg = extractReminderTime(msg);

      if (!titleFromMsg) {
        return {
          role: 'assistant',
          content: "Sure! What would you like me to remind you about?",
          pendingIntent: { type: 'set_reminder', step: 'awaiting_title', collected: { time: timeFromMsg !== 'none' ? timeFromMsg : undefined } },
        };
      }
      if (!timeFromMsg || timeFromMsg === 'none') {
        return {
          role: 'assistant',
          content: `Got it — *"${titleFromMsg}"*. When should I remind you? (e.g., *at 3pm*, *tomorrow*, *in 2 hours*)`,
          pendingIntent: { type: 'set_reminder', step: 'awaiting_time', collected: { title: titleFromMsg } },
        };
      }
      try {
        const service = new ReminderService();
        const reminder = service.create({ userId, title: titleFromMsg, remindAt: timeFromMsg, frequency: 'once' });
        return {
          role: 'assistant',
          content: `Done! ✓ Reminder set for **"${titleFromMsg}"** at **${new Date(timeFromMsg).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}**.`,
          action: { type: 'set_reminder', success: true, data: reminder },
          pendingIntent: null,
        };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't set the reminder: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── List Reminders ───────────────────────────────────────────
    case 'list_reminders': {
      const service = new ReminderService();
      const reminders = service.listByUser(userId, { isActive: true }) as Array<{ title: string; remindAt: string }>;
      if (reminders.length === 0) {
        return { role: 'assistant', content: "You have no active reminders. Say *set a reminder* to create one!", pendingIntent: null };
      }
      const list = reminders.slice(0, 8).map((r, i) => `${i + 1}. **${r.title}** — ${new Date(r.remindAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`).join('\n');
      return { role: 'assistant', content: `Your active reminders:\n\n${list}`, pendingIntent: null };
    }

    // ── Start Timer ──────────────────────────────────────────────
    case 'start_timer': {
      const descMatch = msg.match(/(?:for|on|tracking)\s+["']?(.+?)["']?\s*$/i);
      const description = descMatch ? descMatch[1].trim() : undefined;
      try {
        const service = new TimeTrackingService();
        const entry = service.startTimer(userId, undefined, description);
        return {
          role: 'assistant',
          content: description
            ? `Timer started for **"${description}"** ⏱️. Say *stop timer* when you're done.`
            : `Timer started ⏱️. Say *stop timer* when you're done.`,
          action: { type: 'start_timer', success: true, data: entry },
          pendingIntent: null,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'error';
        if (message.toLowerCase().includes('already')) {
          return { role: 'assistant', content: "You already have an active timer running. Say *stop timer* first to stop it.", pendingIntent: null };
        }
        return { role: 'assistant', content: `Couldn't start the timer: ${message}`, pendingIntent: null };
      }
    }

    // ── Stop Timer ───────────────────────────────────────────────
    case 'stop_timer': {
      try {
        const service = new TimeTrackingService();
        const entry = service.stopTimer(userId);
        const dur = entry.durationMinutes ?? 0;
        const h = Math.floor(dur / 60);
        const m = dur % 60;
        const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        return {
          role: 'assistant',
          content: `Timer stopped ⏹️. You tracked **${durStr}**${entry.description ? ` on "${entry.description}"` : ''}.`,
          action: { type: 'stop_timer', success: true, data: entry },
          pendingIntent: null,
        };
      } catch (err) {
        return { role: 'assistant', content: "You don't have an active timer. Say *start timer* to begin tracking.", pendingIntent: null };
      }
    }

    // ── Create Checklist ─────────────────────────────────────────
    case 'create_checklist': {
      const titleFromMsg = extractTitle(msg.replace(/\b(create|add|new|make)\s+(a\s+)?checklist\b/gi, '').trim());
      if (!titleFromMsg) {
        return {
          role: 'assistant',
          content: "Sure! What should the checklist be called?",
          pendingIntent: { type: 'create_checklist', step: 'awaiting_title', collected: {} },
        };
      }
      try {
        const service = new ChecklistService();
        const checklist = service.create({ userId, title: titleFromMsg });
        return {
          role: 'assistant',
          content: `Done! ✓ Created checklist **"${titleFromMsg}"**. Find it on the Checklists page.`,
          action: { type: 'create_checklist', success: true, data: checklist },
          pendingIntent: null,
        };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't create the checklist: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── Show Summary ─────────────────────────────────────────────
    case 'show_summary': {
      try {
        const service = new AnalyticsService();
        const s = service.getSummary(userId) as Record<string, unknown>;
        const total = Number(s.totalTasks ?? 0);
        const done = Number(s.completedTasks ?? 0);
        const pending = Number(s.pendingTasks ?? s.todoTasks ?? 0);
        const mins = Number(s.totalTrackedMinutes ?? 0);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          role: 'assistant',
          content:
            `Here's your productivity snapshot:\n\n` +
            `📋 **Tasks**: ${done}/${total} completed (${pct}%)\n` +
            `⏳ **Pending**: ${pending}\n` +
            `⏱️ **Time tracked**: ${h > 0 ? `${h}h ${m}m` : `${m}m`}\n\n` +
            `Visit the Analytics page for full insights.`,
          action: { type: 'show_summary', success: true, data: s },
          pendingIntent: null,
        };
      } catch (err) {
        return { role: 'assistant', content: "Couldn't fetch your summary. Try the Analytics page directly.", pendingIntent: null };
      }
    }

    // ── Help ─────────────────────────────────────────────────────
    case 'help':
    default: {
      return {
        role: 'assistant',
        content:
          "Here's what I can do for you:\n\n" +
          "**Tasks**\n" +
          "- *Create a task called Review PR*\n" +
          "- *Delete task Review PR*\n" +
          "- *Mark task Review PR as done*\n" +
          "- *Show my tasks*\n\n" +
          "**Projects**\n" +
          "- *Create a project called Website Redesign*\n" +
          "- *Show my projects*\n\n" +
          "**Reminders**\n" +
          "- *Remind me to check emails at 3pm*\n" +
          "- *Set a reminder for standup tomorrow at 9am*\n\n" +
          "**Time Tracking**\n" +
          "- *Start a timer for deep work*\n" +
          "- *Stop timer*\n\n" +
          "**Checklists**\n" +
          "- *Create a checklist called Morning Routine*\n\n" +
          "**Analytics**\n" +
          "- *How am I doing?* / *Show my stats*\n\n" +
          "You can also provide details upfront like: *Create a high priority task called Fix Login Bug due tomorrow*",
        pendingIntent: null,
      };
    }
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, pendingIntent } = body;

    if (!message || typeof message !== 'string') {
      return errorResponse(new Error('"message" string is required'));
    }

    const userId = getCurrentUserId();
    let response: ChatResponse;

    if (pendingIntent) {
      // Continue an existing conversation flow
      response = await handlePendingIntent(message, pendingIntent, userId);
    } else {
      // Fresh message — detect intent
      const intent = detectIntent(message);
      response = await handleFreshIntent(message, intent, userId);
    }

    return successResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
}
