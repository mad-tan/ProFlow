import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { TaskService } from '@/lib/services/task.service';
import { ReminderService } from '@/lib/services/reminder.service';
import { TimeTrackingService } from '@/lib/services/time-tracking.service';
import { ChecklistService } from '@/lib/services/checklist.service';
import { ProjectService } from '@/lib/services/project.service';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import type { TaskPriority } from '@/lib/types';

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
    if (m?.[1] && m[1].trim().length > 1) return m[1].trim().replace(/["']+$/, '').trim();
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

function findProjectByName(userId: string, name: string): { id: string; name: string; status: string } | null {
  const service = new ProjectService();
  const projects = service.listByUser(userId, {}) as Array<{ id: string; name: string; status: string }>;
  const nl = name.toLowerCase();
  let found = projects.find(p => p.name.toLowerCase() === nl);
  if (!found) found = projects.find(p => p.name.toLowerCase().includes(nl) || nl.includes(p.name.toLowerCase()));
  return found ?? null;
}

function findReminderByName(userId: string, name: string): { id: string; title: string } | null {
  const service = new ReminderService();
  const reminders = service.listByUser(userId, {}) as Array<{ id: string; title: string }>;
  const nl = name.toLowerCase();
  let found = reminders.find(r => r.title.toLowerCase() === nl);
  if (!found) found = reminders.find(r => r.title.toLowerCase().includes(nl) || nl.includes(r.title.toLowerCase()));
  return found ?? null;
}

function findChecklistByName(userId: string, name: string): { id: string; title: string } | null {
  const service = new ChecklistService();
  const lists = service.listByUser(userId) as Array<{ id: string; title: string }>;
  const nl = name.toLowerCase();
  let found = lists.find(c => c.title.toLowerCase() === nl);
  if (!found) found = lists.find(c => c.title.toLowerCase().includes(nl) || nl.includes(c.title.toLowerCase()));
  return found ?? null;
}

function extractStatus(msg: string): string | null {
  const l = msg.toLowerCase();
  if (/\bin[_\s]?progress\b|\bstarted\b|\bworking on\b/.test(l)) return 'in_progress';
  if (/\bin[_\s]?review\b/.test(l)) return 'in_review';
  if (/\bdone\b|\bcomplete[d]?\b|\bfinish(ed)?\b/.test(l)) return 'done';
  if (/\bbacklog\b/.test(l)) return 'backlog';
  if (/\btodo\b|\bto[_\s]?do\b|\bnot started\b/.test(l)) return 'todo';
  if (/\bcancell?ed?\b/.test(l)) return 'cancelled';
  return null;
}

function isConfirm(msg: string): boolean {
  return /\b(yes|yeah|yep|yup|sure|confirm|ok|okay|do it|go ahead|delete it|remove it)\b/i.test(msg);
}

function isCancel(msg: string): boolean {
  return /\b(no|nope|cancel|nevermind|never mind|stop|abort|don't|dont)\b/i.test(msg);
}

/** Matches only explicit cancel commands — NOT "no", so users can say "no due date" etc. */
function isExplicitCancel(msg: string): boolean {
  return /\b(cancel|nevermind|never mind|abort|don't|dont)\b/i.test(msg) ||
    /^nope$/i.test(msg.trim());
}

function isSkip(msg: string): boolean {
  return /\b(skip|none|no|not now|later|don't|dont|pass)\b/i.test(msg);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Intent Detection ────────────────────────────────────────────────────────

type IntentType =
  | 'create_task' | 'delete_task' | 'complete_task' | 'list_tasks' | 'update_task'
  | 'create_project' | 'list_projects' | 'delete_project'
  | 'set_reminder' | 'list_reminders' | 'delete_reminder'
  | 'start_timer' | 'stop_timer'
  | 'create_checklist' | 'add_checklist_item'
  | 'log_mood' | 'write_journal'
  | 'show_summary'
  | 'help' | 'unknown';

function detectIntent(msg: string): IntentType {
  // Tasks
  if (/\b(delete|remove|trash)\b.*(task|todo)\b/i.test(msg) || /\b(task|todo).*(delete|remove|trash)\b/i.test(msg)) return 'delete_task';
  if (/\b(complete|finish|done|mark.*done|close)\b.*(task|todo)\b/i.test(msg) || /\b(task|todo).*(complete|done|finish)\b/i.test(msg)) return 'complete_task';
  if (/\b(update|edit|change|modify|rename|set|move)\b.*(task|todo)\b/i.test(msg) || /\b(task|todo).*(update|edit|change|priority|due|status)\b/i.test(msg)) return 'update_task';
  if (/\b(create|add|new|make)\b.*(task|todo)\b/i.test(msg) || /\b(task|todo)\b.*(create|add|new)\b/i.test(msg)) return 'create_task';
  if (/\b(show|list|view|get|what are|my)\b.*(task|todo)\b/i.test(msg)) return 'list_tasks';

  // Projects
  if (/\b(delete|remove|trash)\b.*(project)\b/i.test(msg)) return 'delete_project';
  if (/\b(create|add|new|make)\b.*(project)\b/i.test(msg)) return 'create_project';
  if (/\b(show|list|view|my)\b.*(project)\b/i.test(msg)) return 'list_projects';

  // Reminders
  if (/\b(delete|remove)\b.*(reminder)\b/i.test(msg)) return 'delete_reminder';
  if (/\b(remind|reminder|set.*reminder|create.*reminder)\b/i.test(msg)) return 'set_reminder';
  if (/\b(show|list|my)\b.*(reminder)\b/i.test(msg)) return 'list_reminders';

  // Timer
  if (/\b(stop|end|pause)\b.*(timer|time|tracking)\b/i.test(msg) || /\bstop timer\b/i.test(msg)) return 'stop_timer';
  if (/\b(start|begin|track)\b.*(timer|time|tracking)\b/i.test(msg) || /\btimer\b/i.test(msg)) return 'start_timer';

  // Checklists
  if (/\badd\b.*(item|step|to).*(checklist|list)\b/i.test(msg) || /\b(checklist|list)\b.*(add|item)\b/i.test(msg)) return 'add_checklist_item';
  if (/\b(create|add|new|make)\b.*(checklist)\b/i.test(msg)) return 'create_checklist';

  // Mental health
  if (/\b(log|track|record)\b.*(mood|feeling|mental|health|check.?in)\b/i.test(msg) || /\b(mood|check.?in|how.*feeling|feeling today)\b/i.test(msg)) return 'log_mood';
  if (/\b(journal|diary|write|note)\b/i.test(msg)) return 'write_journal';

  // Analytics
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

  // Allow explicit cancellation at any point except delete/reminder confirmation steps
  if (isExplicitCancel(msg) && !['awaiting_confirmation'].includes(pending.step)) {
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
            priority: ((c.priority as string | undefined) ?? 'medium') as TaskPriority,
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

    // ── Update Task ──────────────────────────────────────────────
    case 'update_task': {
      const c = pending.collected;
      if (pending.step === 'awaiting_name') {
        const name = msg.trim().replace(/["']+$/, '').trim();
        const task = findTaskByName(userId, name);
        if (!task) return { role: 'assistant', content: `I couldn't find a task matching **"${name}"**. Try "show my tasks" first.`, pendingIntent: null };
        c.taskId = task.id;
        c.taskTitle = task.title;
        return {
          role: 'assistant',
          content: `Found **"${task.title}"**. What would you like to change? You can say:\n- *priority to high/medium/low/urgent*\n- *due date to tomorrow*\n- *status to in progress/done*`,
          pendingIntent: { type: 'update_task', step: 'awaiting_change', collected: c },
        };
      }
      if (pending.step === 'awaiting_change') {
        const updates: Record<string, unknown> = {};
        const priority = extractPriority(msg);
        const dueDate = extractDueDate(msg);
        const status = extractStatus(msg);
        if (priority && priority !== 'none') updates.priority = priority;
        if (dueDate && dueDate !== 'none') updates.dueDate = dueDate;
        if (dueDate === 'none') updates.dueDate = null;
        if (status) updates.status = status;
        if (Object.keys(updates).length === 0) {
          return { role: 'assistant', content: "I didn't catch what to change. Try: *priority to high*, *due date to tomorrow*, or *status to in progress*.", pendingIntent: pending };
        }
        try {
          const service = new TaskService();
          service.update(c.taskId as string, userId, updates as Parameters<typeof service.update>[2]);
          const changes = Object.entries(updates).map(([k, v]) => `${k} → **${v}**`).join(', ');
          return {
            role: 'assistant',
            content: `Done! ✓ Updated **"${c.taskTitle}"**: ${changes}.`,
            action: { type: 'update_task', success: true, data: { id: c.taskId, ...updates } },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't update the task: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Delete Project ───────────────────────────────────────────
    case 'delete_project': {
      const c = pending.collected;
      if (pending.step === 'awaiting_name') {
        const name = msg.trim().replace(/["']+$/, '').trim();
        const project = findProjectByName(userId, name);
        if (!project) return { role: 'assistant', content: `I couldn't find a project matching **"${name}"**. Try "show my projects" first.`, pendingIntent: null };
        c.projectId = project.id;
        c.projectName = project.name;
        return {
          role: 'assistant',
          content: `Are you sure you want to **permanently delete** project **"${project.name}"**? This will also delete all its tasks. (say *yes* to confirm)`,
          pendingIntent: { type: 'delete_project', step: 'awaiting_confirmation', collected: c },
        };
      }
      if (pending.step === 'awaiting_confirmation') {
        if (isCancel(msg)) return { role: 'assistant', content: "Cancelled. The project was not deleted.", pendingIntent: null };
        if (isConfirm(msg)) {
          try {
            const service = new ProjectService();
            service.delete(c.projectId as string, userId);
            return {
              role: 'assistant',
              content: `Done. Project **"${c.projectName}"** has been deleted.`,
              action: { type: 'delete_project', success: true, data: { id: c.projectId } },
              pendingIntent: null,
            };
          } catch (err) {
            return { role: 'assistant', content: `Couldn't delete the project: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
          }
        }
        return { role: 'assistant', content: "Please say *yes* to delete or *no* to cancel.", pendingIntent: pending };
      }
      break;
    }

    // ── Delete Reminder ──────────────────────────────────────────
    case 'delete_reminder': {
      const c = pending.collected;
      if (pending.step === 'awaiting_name') {
        const name = msg.trim().replace(/["']+$/, '').trim();
        const reminder = findReminderByName(userId, name);
        if (!reminder) return { role: 'assistant', content: `I couldn't find a reminder matching **"${name}"**. Try "show my reminders" first.`, pendingIntent: null };
        c.reminderId = reminder.id;
        c.reminderTitle = reminder.title;
        return {
          role: 'assistant',
          content: `Delete reminder **"${reminder.title}"**? (say *yes* to confirm)`,
          pendingIntent: { type: 'delete_reminder', step: 'awaiting_confirmation', collected: c },
        };
      }
      if (pending.step === 'awaiting_confirmation') {
        if (isCancel(msg)) return { role: 'assistant', content: "Cancelled.", pendingIntent: null };
        if (isConfirm(msg)) {
          try {
            const service = new ReminderService();
            service.delete(c.reminderId as string, userId);
            return {
              role: 'assistant',
              content: `Done. Reminder **"${c.reminderTitle}"** has been deleted.`,
              action: { type: 'delete_reminder', success: true, data: { id: c.reminderId } },
              pendingIntent: null,
            };
          } catch (err) {
            return { role: 'assistant', content: `Couldn't delete the reminder: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
          }
        }
        return { role: 'assistant', content: "Please say *yes* to delete or *no* to cancel.", pendingIntent: pending };
      }
      break;
    }

    // ── Add Checklist Item ────────────────────────────────────────
    case 'add_checklist_item': {
      const c = pending.collected;
      if (pending.step === 'awaiting_checklist') {
        const name = msg.trim().replace(/["']+$/, '').trim();
        const list = findChecklistByName(userId, name);
        if (!list) return { role: 'assistant', content: `I couldn't find a checklist matching **"${name}"**. Try "show my checklists" or create one first.`, pendingIntent: null };
        c.checklistId = list.id;
        c.checklistTitle = list.title;
        return {
          role: 'assistant',
          content: `What item would you like to add to **"${list.title}"**?`,
          pendingIntent: { type: 'add_checklist_item', step: 'awaiting_item', collected: c },
        };
      }
      if (pending.step === 'awaiting_item') {
        const itemTitle = msg.trim().replace(/["']+$/, '').trim();
        if (!itemTitle) return { role: 'assistant', content: "What should the item be called?", pendingIntent: pending };
        try {
          const service = new ChecklistService();
          service.addItem(c.checklistId as string, userId, itemTitle);
          return {
            role: 'assistant',
            content: `Done! ✓ Added **"${itemTitle}"** to checklist **"${c.checklistTitle}"**.`,
            action: { type: 'add_checklist_item', success: true, data: { checklistId: c.checklistId, item: itemTitle } },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't add the item: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Log Mood ─────────────────────────────────────────────────
    case 'log_mood': {
      const c = pending.collected;
      if (pending.step === 'awaiting_mood') {
        const numMatch = msg.match(/\b([1-5])\b/);
        const mood = numMatch ? parseInt(numMatch[1]) : null;
        if (!mood) return { role: 'assistant', content: "Please rate your mood from 1 (terrible) to 5 (great).", pendingIntent: pending };
        c.moodRating = mood;
        return {
          role: 'assistant',
          content: `Energy level? Rate from 1 (exhausted) to 5 (energized).`,
          pendingIntent: { type: 'log_mood', step: 'awaiting_energy', collected: c },
        };
      }
      if (pending.step === 'awaiting_energy') {
        const numMatch = msg.match(/\b([1-5])\b/);
        const energy = numMatch ? parseInt(numMatch[1]) : 3;
        c.energyLevel = energy;
        return {
          role: 'assistant',
          content: `Stress level? Rate from 1 (relaxed) to 5 (very stressed).`,
          pendingIntent: { type: 'log_mood', step: 'awaiting_stress', collected: c },
        };
      }
      if (pending.step === 'awaiting_stress') {
        const numMatch = msg.match(/\b([1-5])\b/);
        const stress = numMatch ? parseInt(numMatch[1]) : 3;
        c.stressLevel = stress;
        return {
          role: 'assistant',
          content: `Any notes? (or say *skip*)`,
          pendingIntent: { type: 'log_mood', step: 'awaiting_notes', collected: c },
        };
      }
      if (pending.step === 'awaiting_notes') {
        if (!isSkip(msg)) c.notes = msg.trim();
        try {
          const service = new MentalHealthService();
          const today = new Date().toISOString().split('T')[0];
          const checkIn = service.createCheckIn({
            userId,
            date: today,
            moodRating: c.moodRating as 1|2|3|4|5,
            energyLevel: c.energyLevel as 1|2|3|4|5,
            stressLevel: c.stressLevel as 1|2|3|4|5,
            notes: c.notes as string | undefined,
          });
          const moodLabels = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Great'];
          return {
            role: 'assistant',
            content: `Done! ✓ Check-in logged — mood: **${moodLabels[c.moodRating as number]}** (${c.moodRating}/5), energy: ${c.energyLevel}/5, stress: ${c.stressLevel}/5.`,
            action: { type: 'log_mood', success: true, data: checkIn },
            pendingIntent: null,
          };
        } catch (err) {
          const msg2 = err instanceof Error ? err.message : 'error';
          if (msg2.toLowerCase().includes('already')) {
            return { role: 'assistant', content: "You've already logged a check-in today! You can edit it on the Mental Health page.", pendingIntent: null };
          }
          return { role: 'assistant', content: `Couldn't save check-in: ${msg2}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Write Journal ────────────────────────────────────────────
    case 'write_journal': {
      const c = pending.collected;
      if (pending.step === 'awaiting_title') {
        if (!isSkip(msg)) c.title = msg.trim().replace(/["']+$/, '').trim();
        return {
          role: 'assistant',
          content: `What would you like to write about?`,
          pendingIntent: { type: 'write_journal', step: 'awaiting_content', collected: c },
        };
      }
      if (pending.step === 'awaiting_content') {
        const content = msg.trim();
        if (!content) return { role: 'assistant', content: "Please write something for your journal entry.", pendingIntent: pending };
        try {
          const service = new MentalHealthService();
          const entry = service.createJournalEntry({ userId, title: c.title as string | undefined, content });
          return {
            role: 'assistant',
            content: `Done! ✓ Journal entry saved${c.title ? ` — **"${c.title}"**` : ''}.`,
            action: { type: 'write_journal', success: true, data: entry },
            pendingIntent: null,
          };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't save journal entry: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
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
        const task = service.create({ userId, title: titleFromMsg, priority: (priority !== 'none' ? priority : 'medium') as TaskPriority, dueDate: resolvedDue ?? null, status: 'todo', tags: [] });
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
      const reminders = service.listByUser(userId, { upcoming: true }) as Array<{ title: string; remindAt: string }>;
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

    // ── Update Task ──────────────────────────────────────────────
    case 'update_task': {
      const nameFromMsg = extractTitle(msg.replace(/\b(update|edit|change|modify|rename|set|move)\s+(the\s+)?(task\s+)?/gi, '').trim());
      const priority = extractPriority(msg);
      const dueDate = extractDueDate(msg);
      const status = extractStatus(msg);
      const hasChange = priority || dueDate || status;

      if (!nameFromMsg) {
        return {
          role: 'assistant',
          content: "Which task do you want to update? Tell me its name.",
          pendingIntent: { type: 'update_task', step: 'awaiting_name', collected: {} },
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
      if (!hasChange) {
        return {
          role: 'assistant',
          content: `Found **"${task.title}"**. What would you like to change?\n- *priority to high/medium/low/urgent*\n- *due date to tomorrow*\n- *status to in progress/done*`,
          pendingIntent: { type: 'update_task', step: 'awaiting_change', collected: { taskId: task.id, taskTitle: task.title } },
        };
      }
      const updates: Record<string, unknown> = {};
      if (priority && priority !== 'none') updates.priority = priority;
      if (dueDate && dueDate !== 'none') updates.dueDate = dueDate;
      if (dueDate === 'none') updates.dueDate = null;
      if (status) updates.status = status;
      try {
        const service = new TaskService();
        service.update(task.id, userId, updates as Parameters<typeof service.update>[2]);
        const changes = Object.entries(updates).map(([k, v]) => `${k} → **${v}**`).join(', ');
        return {
          role: 'assistant',
          content: `Done! ✓ Updated **"${task.title}"**: ${changes}.`,
          action: { type: 'update_task', success: true, data: { id: task.id, ...updates } },
          pendingIntent: null,
        };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't update the task: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── Delete Project ───────────────────────────────────────────
    case 'delete_project': {
      const nameFromMsg = extractTitle(msg.replace(/\b(delete|remove|trash)\s+(the\s+)?project\b/gi, '').trim());
      if (!nameFromMsg) {
        return {
          role: 'assistant',
          content: "Which project do you want to delete? Tell me its name.",
          pendingIntent: { type: 'delete_project', step: 'awaiting_name', collected: {} },
        };
      }
      const project = findProjectByName(userId, nameFromMsg);
      if (!project) {
        return {
          role: 'assistant',
          content: `I couldn't find a project matching **"${nameFromMsg}"**. Try "show my projects".`,
          pendingIntent: null,
        };
      }
      return {
        role: 'assistant',
        content: `Are you sure you want to **permanently delete** project **"${project.name}"**? (say *yes* to confirm or *no* to cancel)`,
        pendingIntent: { type: 'delete_project', step: 'awaiting_confirmation', collected: { projectId: project.id, projectName: project.name } },
      };
    }

    // ── Delete Reminder ──────────────────────────────────────────
    case 'delete_reminder': {
      const nameFromMsg = extractTitle(msg.replace(/\b(delete|remove)\s+(the\s+)?reminder\b/gi, '').trim());
      if (!nameFromMsg) {
        return {
          role: 'assistant',
          content: "Which reminder do you want to delete? Tell me its title.",
          pendingIntent: { type: 'delete_reminder', step: 'awaiting_name', collected: {} },
        };
      }
      const reminder = findReminderByName(userId, nameFromMsg);
      if (!reminder) {
        return {
          role: 'assistant',
          content: `I couldn't find a reminder matching **"${nameFromMsg}"**. Try "show my reminders".`,
          pendingIntent: null,
        };
      }
      return {
        role: 'assistant',
        content: `Delete reminder **"${reminder.title}"**? (say *yes* to confirm)`,
        pendingIntent: { type: 'delete_reminder', step: 'awaiting_confirmation', collected: { reminderId: reminder.id, reminderTitle: reminder.title } },
      };
    }

    // ── Add Checklist Item ────────────────────────────────────────
    case 'add_checklist_item': {
      // Try to extract checklist name from the message
      const itemMatch = msg.match(/\badd\s+(?:item\s+)?["']?([^"']+?)["']?\s+(?:to|in)\s+(?:checklist\s+)?["']?([^"']+?)["']?\s*$/i);
      const checklistNameFromMsg = itemMatch ? itemMatch[2].trim() : extractTitle(msg.replace(/\badd\b.*(item|to|in|checklist)\b/gi, '').trim());
      const itemNameFromMsg = itemMatch ? itemMatch[1].trim() : null;

      if (!checklistNameFromMsg) {
        return {
          role: 'assistant',
          content: "Which checklist do you want to add an item to?",
          pendingIntent: { type: 'add_checklist_item', step: 'awaiting_checklist', collected: {} },
        };
      }
      const list = findChecklistByName(userId, checklistNameFromMsg);
      if (!list) {
        return {
          role: 'assistant',
          content: `I couldn't find a checklist matching **"${checklistNameFromMsg}"**. Try creating one first.`,
          pendingIntent: null,
        };
      }
      if (!itemNameFromMsg) {
        return {
          role: 'assistant',
          content: `What item would you like to add to **"${list.title}"**?`,
          pendingIntent: { type: 'add_checklist_item', step: 'awaiting_item', collected: { checklistId: list.id, checklistTitle: list.title } },
        };
      }
      try {
        const service = new ChecklistService();
        service.addItem(list.id, userId, itemNameFromMsg);
        return {
          role: 'assistant',
          content: `Done! ✓ Added **"${itemNameFromMsg}"** to **"${list.title}"**.`,
          action: { type: 'add_checklist_item', success: true, data: { checklistId: list.id, item: itemNameFromMsg } },
          pendingIntent: null,
        };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't add the item: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── Log Mood ─────────────────────────────────────────────────
    case 'log_mood': {
      const numMatch = msg.match(/\b([1-5])\b/);
      const moodFromMsg = numMatch ? parseInt(numMatch[1]) : null;
      if (!moodFromMsg) {
        return {
          role: 'assistant',
          content: "Let's log your check-in! How's your mood today? Rate from 1 (terrible) to 5 (great).",
          pendingIntent: { type: 'log_mood', step: 'awaiting_mood', collected: {} },
        };
      }
      return {
        role: 'assistant',
        content: `Mood: ${moodFromMsg}/5. What's your energy level? Rate from 1 (exhausted) to 5 (energized).`,
        pendingIntent: { type: 'log_mood', step: 'awaiting_energy', collected: { moodRating: moodFromMsg } },
      };
    }

    // ── Write Journal ────────────────────────────────────────────
    case 'write_journal': {
      const titleFromMsg = extractTitle(msg.replace(/\b(write|create|new|add)\s+(a\s+)?(journal|diary)\s+(entry\s+)?(about|called|titled|on)?\b/gi, '').trim());
      if (!titleFromMsg) {
        return {
          role: 'assistant',
          content: "Let's write a journal entry! Give it a title (or say *skip* for no title).",
          pendingIntent: { type: 'write_journal', step: 'awaiting_title', collected: {} },
        };
      }
      return {
        role: 'assistant',
        content: `Journal entry: **"${titleFromMsg}"**. What would you like to write?`,
        pendingIntent: { type: 'write_journal', step: 'awaiting_content', collected: { title: titleFromMsg } },
      };
    }

    // ── Show Summary ─────────────────────────────────────────────
    case 'show_summary': {
      try {
        const service = new AnalyticsService();
        const s = service.getSummary(userId) as unknown as Record<string, unknown>;
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
          "- *Create a task called Review PR due tomorrow with high priority*\n" +
          "- *Update task Review PR priority to urgent*\n" +
          "- *Mark task Review PR as done*\n" +
          "- *Delete task Review PR*\n" +
          "- *Show my tasks*\n\n" +
          "**Projects**\n" +
          "- *Create a project called Website Redesign*\n" +
          "- *Delete project Website Redesign*\n" +
          "- *Show my projects*\n\n" +
          "**Reminders**\n" +
          "- *Remind me to check emails at 3pm*\n" +
          "- *Delete reminder standup*\n" +
          "- *Show my reminders*\n\n" +
          "**Time Tracking**\n" +
          "- *Start a timer for deep work*\n" +
          "- *Stop timer*\n\n" +
          "**Checklists**\n" +
          "- *Create a checklist called Morning Routine*\n" +
          "- *Add item Drink water to Morning Routine*\n\n" +
          "**Mental Health**\n" +
          "- *Log my mood* / *Check in*\n" +
          "- *Write a journal entry*\n\n" +
          "**Analytics**\n" +
          "- *How am I doing?* / *Show my stats*",
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
