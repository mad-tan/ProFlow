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
import { NoteService } from '@/lib/services/note.service';
import { SubtaskRepository } from '@/lib/repositories/subtask.repository';
import type { TaskPriority } from '@/lib/types';
import { callLLM, callLLMStructured, isLLMEnabled } from '@/lib/ai/provider';
import { z } from 'zod';

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

/** Returns a YYYY-MM-DD string in LOCAL time, not UTC. */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function cleanExtractedTitle(t: string): string {
  return t
    .replace(/\s+in\s+[\w][\w\s]*?project\b.*/i, '')
    .replace(/\s+(?:due|by)\s+\S.*/i, '')
    .replace(/\s+(?:urgent|high|medium|low)\s*$/i, '')
    .replace(/\s+with\s+(?:urgent|high|medium|low)\s+priority.*/i, '')
    .trim();
}

function extractProjectFromMessage(msg: string, projects: Array<{id: string; name: string}>): string | undefined {
  if (!projects.length) return undefined;
  const inMatch = msg.match(/\bin\s+([a-zA-Z0-9\s]+?)\s+project\b/i);
  if (inMatch) {
    const nameInMsg = lower(inMatch[1]);
    const found = projects.find(p => lower(p.name).includes(nameInMsg) || nameInMsg.includes(lower(p.name)));
    if (found) return found.id;
  }
  for (const p of projects) {
    if (lower(msg).includes(lower(p.name))) return p.id;
  }
  return undefined;
}

function extractTitle(msg: string): string | null {
  const patterns = [
    /(?:called|named|titled)\s+["']?([^"'\n]+?)["']?\s*$/i,
    /["']([^"']+?)["']/,
    /(?:create|add|new|make)\s+(?:a\s+)?(?:task|project|checklist|reminder)\s+(?:called\s+|named\s+|titled\s+|for\s+)?["']?([a-zA-Z][^,\n(due|priority|by|at|on|in)]{2,60}?)["']?\s*(?:,|$|due|priority|by|at|on|in)/i,
  ];
  for (const p of patterns) {
    const m = msg.match(p);
    if (m?.[1] && m[1].trim().length > 1) return cleanExtractedTitle(m[1].trim().replace(/["']+$/, '').trim());
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
  if (/\btoday\b/.test(l)) return localDateStr(now);
  if (/\btomorrow\b/.test(l)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return localDateStr(d);
  }
  if (/\bnext week\b/.test(l)) {
    const d = new Date(now); d.setDate(d.getDate() + 7);
    return localDateStr(d);
  }
  if (/\bnext month\b/.test(l)) {
    const d = new Date(now); d.setMonth(d.getMonth() + 1);
    return localDateStr(d);
  }
  // "in X days"
  const inDays = l.match(/in\s+(\d+)\s+days?/);
  if (inDays) {
    const d = new Date(now); d.setDate(d.getDate() + parseInt(inDays[1]));
    return localDateStr(d);
  }
  // explicit date pattern like "march 15", "15th march", "3/15", "2024-03-15"
  const explicit = msg.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return explicit[1];
  const monthDay = msg.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i);
  if (monthDay) {
    const d = new Date(`${monthDay[0]} ${now.getFullYear()}`);
    if (!isNaN(d.getTime())) return localDateStr(d);
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
  | 'create_note' | 'list_notes' | 'delete_note'
  | 'show_summary'
  | 'generate_tasks'
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

  // Notes
  if (/\b(delete|remove)\b.*(note)\b/i.test(msg)) return 'delete_note';
  if (/\b(show|list|view|my)\b.*(note[s]?)\b/i.test(msg) || /\bmy notes\b/i.test(msg)) return 'list_notes';
  if (/\b(create|add|new|save|write|jot)\b.*(note)\b/i.test(msg) || /\bnote[d]?\b.*:/.test(msg)) return 'create_note';

  // Mental health
  if (/\b(log|track|record)\b.*(mood|feeling|mental|health|check.?in)\b/i.test(msg) || /\b(mood|check.?in|how.*feeling|feeling today)\b/i.test(msg)) return 'log_mood';
  if (/\b(journal|diary|write)\b/i.test(msg)) return 'write_journal';

  // Analytics
  if (/\b(summary|stats|analytics|overview|how am i doing|productivity|progress)\b/i.test(msg)) return 'show_summary';

  // Generate tasks from uploaded content
  if (/\b(generate|extract|create|make|build)\b.*(tasks?|subtasks?|breakdown|plan).*(from|using|with|based on)\b/i.test(msg)) return 'generate_tasks';
  if (/\b(from|using)\b.*(attached|upload|file|document|transcript|code)\b.*(tasks?|subtasks?|breakdown)\b/i.test(msg)) return 'generate_tasks';
  if (/\bgenerate\s+tasks?\b/i.test(msg)) return 'generate_tasks';

  if (/\b(help|what can you do|commands|capabilities|features)\b/i.test(msg)) return 'help';

  return 'unknown';
}

// ─── LLM Integration ─────────────────────────────────────────────────────────

const INTENT_VALUES = [
  'create_task','delete_task','complete_task','list_tasks','update_task',
  'create_project','list_projects','delete_project',
  'set_reminder','list_reminders','delete_reminder',
  'start_timer','stop_timer',
  'create_checklist','add_checklist_item',
  'log_mood','write_journal',
  'create_note','list_notes','delete_note',
  'show_summary','generate_tasks','help','unknown',
] as const;

const intentSchema = z.object({
  intent: z.enum(INTENT_VALUES),
  confidence: z.number().min(0).max(1),
});

const parsedRequestSchema = z.object({
  intent: z.enum(INTENT_VALUES),
  confidence: z.number().min(0).max(1),
  title: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).nullable().optional(),
  projectName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  reminderTime: z.string().nullable().optional(),
  moodRating: z.number().int().min(1).max(5).nullable().optional(),
  energyLevel: z.number().int().min(1).max(5).nullable().optional(),
  stressLevel: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  timerDescription: z.string().nullable().optional(),
  itemName: z.string().nullable().optional(),
  checklistName: z.string().nullable().optional(),
  noteTitle: z.string().nullable().optional(),
  noteContent: z.string().nullable().optional(),
});

type ParsedRequest = z.infer<typeof parsedRequestSchema>;

function buildSystemPrompt(userContext?: string): string {
  return `You are ProFlow AI, an intelligent assistant built into ProFlow — a personal productivity platform.

## ProFlow Capabilities
ProFlow helps users manage their work and wellbeing with these features:

### Tasks
- Create tasks with title, due date, priority (urgent/high/medium/low), and status
- Update task priority, due date, or status (todo/in_progress/in_review/done/cancelled/backlog)
- Delete tasks (requires confirmation)
- Mark tasks as complete
- List all active tasks

### Projects
- Create projects with name and optional description
- Delete projects (requires confirmation — also deletes associated tasks)
- List all projects with status

### Reminders
- Set reminders with a title and time (absolute like "at 3pm" or relative like "in 2 hours")
- Delete reminders
- List upcoming reminders

### Time Tracking
- Start a timer (optionally with a description of what you're working on)
- Stop the active timer (shows total time tracked)

### Checklists
- Create named checklists
- Add items to existing checklists

### Notes
- Create notes with a title and content
- List your recent notes
- Delete a note by name

### Mental Health & Wellbeing
- Log daily mood check-ins (mood 1-5, energy 1-5, stress 1-5, optional notes)
- Write journal entries with optional title and content

### Analytics & Productivity Insights
- Show productivity summary (tasks completed, time tracked, pending count)
- Full analytics available on the Analytics page

## Tone & Behavior
- Be concise, warm, and helpful
- Use markdown for formatting (bold for emphasis, bullet lists)
- When the user asks general questions about ProFlow, answer from the capability list above
- When the user asks for advice on productivity or wellbeing, give thoughtful, practical suggestions based on their data if available
- Always be encouraging and supportive about mental health topics

${userContext ? `## Current User Data\n${userContext}` : ''}

Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

/**
 * Use LLM to detect intent AND extract all entities from a user message in one call.
 * Returns null on failure (triggers regex fallback).
 */
async function parseRequestWithLLM(msg: string): Promise<ParsedRequest | null> {
  if (!isLLMEnabled()) return null;
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  const todayStr = localDateStr(today);
  const tomorrowStr = localDateStr(tomorrow);
  const nextWeekStr = localDateStr(nextWeek);

  const system = `You are an intent classifier and entity extractor for ProFlow productivity app.
Classify the user message into exactly one intent AND extract all relevant entities.

INTENTS:
- create_task, delete_task, complete_task, list_tasks, update_task
- create_project, delete_project, list_projects
- set_reminder, delete_reminder, list_reminders
- start_timer, stop_timer
- create_checklist, add_checklist_item
- log_mood, write_journal
- create_note, list_notes, delete_note
- show_summary, generate_tasks, help
- unknown (conversational/unclear)

NOTE: Use generate_tasks when the user wants to create multiple tasks from uploaded content, transcripts, documents, or any bulk text input.

ENTITY EXTRACTION RULES:
- title: name/title of task, project, reminder, checklist, or journal entry
- dueDate: YYYY-MM-DD. Today=${todayStr}, Tomorrow=${tomorrowStr}, Next week=${nextWeekStr}
- priority: urgent | high | medium | low | none
- projectName: project name from phrases like "in X project" or "under X"
- description: description text for a project or content after "with description", ":", "-"
- reminderTime: ISO 8601 datetime (e.g. today + specified time for "at 3pm")
- moodRating: number 1-5 for mood level
- energyLevel: number 1-5 for energy level
- stressLevel: number 1-5 for stress level
- notes: any extra notes for mood/journal
- content: body text for journal entries
- timerDescription: what the timer is tracking (e.g. "deep work", "meeting")
- itemName: checklist item to add
- checklistName: which checklist to add item to
- noteTitle: title of the note
- noteContent: body/content of the note

Only extract entities clearly present in the message. Use null for anything not mentioned.
Respond with valid JSON only.`;

  const result = await callLLMStructured(system, msg, parsedRequestSchema);
  return result ?? null;
}

/**
 * Use LLM to respond to conversational/unknown messages with full app context.
 * Returns null on failure (triggers fallback help response).
 */
async function handleConversationalWithLLM(
  msg: string,
  userId: string
): Promise<ChatResponse | null> {
  if (!isLLMEnabled()) return null;

  // Build user context from real data
  let userContext = '';
  try {
    const taskSvc = new TaskService();
    const projSvc = new ProjectService();
    const analyticsSvc = new AnalyticsService();
    const tasks = taskSvc.listByUser(userId, {}) as Array<{ title: string; status: string; priority: string; dueDate?: string | null }>;
    const projects = projSvc.listByUser(userId, {}) as Array<{ name: string; status: string }>;
    const summary = analyticsSvc.getSummary(userId) as unknown as Record<string, unknown>;
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const urgentTasks = activeTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
    userContext = [
      `- Total tasks: ${tasks.length} (${activeTasks.length} active, ${tasks.filter(t=>t.status==='done').length} done)`,
      urgentTasks.length > 0 ? `- High/urgent tasks: ${urgentTasks.map(t=>t.title).slice(0,5).join(', ')}` : '',
      `- Projects: ${projects.length} (${projects.map(p=>p.name).slice(0,5).join(', ')})`,
      `- Time tracked: ${Math.floor(Number(summary.totalTrackedMinutes??0)/60)}h ${Number(summary.totalTrackedMinutes??0)%60}m`,
    ].filter(Boolean).join('\n');
  } catch { /* ignore — proceed without user context */ }

  const systemPrompt = buildSystemPrompt(userContext);
  const response = await callLLM(systemPrompt, msg);
  if (!response) return null;

  return { role: 'assistant', content: response, pendingIntent: null };
}

// ─── Shared Task Creation ────────────────────────────────────────────────────

function createTaskFromCollected(c: Record<string, unknown>, userId: string): ChatResponse {
  try {
    const service = new TaskService();
    const task = service.create({
      userId,
      title: c.title as string,
      priority: ((c.priority as string | undefined) ?? 'medium') as TaskPriority,
      dueDate: (c.dueDate as string | undefined) ?? null,
      projectId: (c.projectId as string | undefined) ?? null,
      status: 'todo',
      tags: [],
    });
    const parts = [`Done! ✓ Created task **"${c.title}"**`];
    if (c.dueDate) parts.push(`due ${formatDate(c.dueDate as string)}`);
    if (c.priority && c.priority !== 'medium') parts.push(`with **${c.priority}** priority`);
    if (c.projectId) parts.push(`in project`);
    return { role: 'assistant', content: parts.join(' ') + '. You can find it on the Tasks page.', action: { type: 'create_task', success: true, data: task }, pendingIntent: null };
  } catch (err) {
    return { role: 'assistant', content: `Sorry, couldn't create the task: ${err instanceof Error ? err.message : 'unknown error'}`, pendingIntent: null };
  }
}

// ─── Generate Tasks from Content ────────────────────────────────────────────

const generatedTaskSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']),
  dueDate: z.string().nullable().optional(),
  subtasks: z.array(z.string()),
});

const generatedTasksResponseSchema = z.object({
  tasks: z.array(generatedTaskSchema),
});

type GeneratedTask = z.infer<typeof generatedTaskSchema>;

async function generateTasksFromContent(
  content: string,
  userMessage: string,
  userId: string
): Promise<{ tasks: GeneratedTask[] } | null> {
  if (!isLLMEnabled()) return null;

  // Get existing projects for context
  const projects = new ProjectService().listByUser(userId) as Array<{ id: string; name: string }>;
  const projectContext = projects.length > 0
    ? `\nUser's existing projects: ${projects.map(p => p.name).join(', ')}`
    : '';

  const today = localDateStr(new Date());

  const system = `You are a smart task planner for ProFlow, a productivity app. Analyze the provided content (transcripts, documents, code, notes, etc.) and generate a structured list of tasks and subtasks.

## Task Structure
Each task should have:
- title: Short, actionable task name (max 80 chars)
- description: Detailed description of what needs to be done (1-3 sentences)
- priority: urgent | high | medium | low | none — judge based on importance/urgency from context
- dueDate: YYYY-MM-DD format if a deadline is mentioned or can be inferred, otherwise null
- subtasks: Array of subtask titles (short, actionable items that break down the task)

## Rules
- Create practical, actionable tasks — not vague goals
- Each task should be independently completable
- Subtasks should be concrete steps to accomplish the parent task
- Infer priority from context (blockers/critical items = urgent/high, nice-to-haves = low)
- If dates are mentioned, convert to YYYY-MM-DD (today is ${today})
- Keep task count reasonable (3-15 tasks typically)
- Group related work into single tasks with subtasks rather than many tiny tasks
${projectContext}

## User Context
The user may provide additional instructions about how to organize the tasks. Follow their guidance.

Respond with valid JSON only.`;

  const userPrompt = userMessage
    ? `User instructions: ${userMessage}\n\n---\n\nContent to analyze:\n${content.slice(0, 12000)}`
    : `Content to analyze:\n${content.slice(0, 12000)}`;

  return await callLLMStructured(system, userPrompt, generatedTasksResponseSchema);
}

function formatTaskPreview(tasks: GeneratedTask[]): string {
  const lines: string[] = ['Here are the tasks I generated:\n'];
  tasks.forEach((t, i) => {
    const priority = t.priority !== 'none' ? ` [${t.priority}]` : '';
    const due = t.dueDate ? ` — due ${formatDate(t.dueDate)}` : '';
    lines.push(`**${i + 1}. ${t.title}**${priority}${due}`);
    if (t.description) lines.push(`   ${t.description}`);
    if (t.subtasks.length > 0) {
      t.subtasks.forEach(s => lines.push(`   • ${s}`));
    }
    lines.push('');
  });
  lines.push(`**Total: ${tasks.length} tasks** with ${tasks.reduce((n, t) => n + t.subtasks.length, 0)} subtasks.\n`);
  lines.push('Should I create all these tasks? (say **yes** to confirm or **no** to cancel)');
  return lines.join('\n');
}

function bulkCreateTasks(tasks: GeneratedTask[], userId: string, projectId?: string): { created: number; subtasksCreated: number } {
  const taskService = new TaskService();
  const subtaskRepo = new SubtaskRepository();
  let created = 0;
  let subtasksCreated = 0;

  for (const t of tasks) {
    try {
      const task = taskService.create({
        userId,
        title: t.title,
        description: t.description ?? undefined,
        priority: (t.priority ?? 'medium') as TaskPriority,
        dueDate: t.dueDate ?? null,
        projectId: projectId ?? null,
        status: 'todo',
        tags: [],
      });
      created++;

      for (let si = 0; si < t.subtasks.length; si++) {
        try {
          subtaskRepo.create({
            taskId: task.id,
            userId,
            title: t.subtasks[si],
            isCompleted: false,
            sortOrder: si,
          });
          subtasksCreated++;
        } catch { /* skip failed subtask */ }
      }
    } catch { /* skip failed task */ }
  }

  return { created, subtasksCreated };
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
        // Ask for project
        const projects = new ProjectService().listByUser(userId);
        if (projects.length === 0) {
          // No projects — skip straight to creation
          return createTaskFromCollected(c, userId);
        }
        const projectList = projects.map((p: { id: string; name: string }, i: number) => `**${i + 1}.** ${p.name}`).join(', ');
        return {
          role: 'assistant',
          content: `Which project? ${projectList} — or say *no project*`,
          pendingIntent: { type: 'create_task', step: 'awaiting_project', collected: { ...c, _projects: projects } },
        };
      }

      if (pending.step === 'awaiting_project') {
        const projects = (c._projects as { id: string; name: string }[]) ?? [];
        if (!isSkip(msg)) {
          const idx = parseInt(msg.trim()) - 1;
          const byIndex = !isNaN(idx) && projects[idx];
          const byName = projects.find(p => lower(p.name).includes(lower(msg.trim())));
          const match = byIndex || byName;
          if (match) c.projectId = match.id;
        }
        delete c._projects;
        return createTaskFromCollected(c, userId);
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
          const today = localDateStr(new Date());
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

    // ── Create Note (pending) ────────────────────────────────────
    case 'create_note': {
      const c = pending.collected;
      if (pending.step === 'awaiting_title') {
        const title = msg.trim().replace(/["']+$/, '').trim();
        if (!title) return { role: 'assistant', content: "What should the note be called?", pendingIntent: pending };
        c.title = title;
        return {
          role: 'assistant',
          content: `Great — **"${title}"**. What's the content? (or say *skip* to save without content)`,
          pendingIntent: { type: 'create_note', step: 'awaiting_content', collected: c },
        };
      }
      if (pending.step === 'awaiting_content') {
        const content = isSkip(msg) ? '' : msg.trim();
        try {
          const service = new NoteService();
          const note = service.create({ userId, title: c.title as string, content });
          return { role: 'assistant', content: `Done! ✓ Note saved — **"${note.title}"**.`, action: { type: 'create_note', success: true, data: note }, pendingIntent: null };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't save the note: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }
      break;
    }

    // ── Delete Note (pending) ────────────────────────────────────
    case 'delete_note': {
      if (pending.step === 'awaiting_confirmation') {
        if (isConfirm(msg)) {
          try {
            const service = new NoteService();
            service.delete(pending.collected.noteId as string, userId);
            return { role: 'assistant', content: `Done! Note **"${pending.collected.noteTitle}"** deleted.`, action: { type: 'delete_note', success: true }, pendingIntent: null };
          } catch (err) {
            return { role: 'assistant', content: `Couldn't delete note: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
          }
        } else {
          return { role: 'assistant', content: "Okay, the note was not deleted.", pendingIntent: null };
        }
      }
      break;
    }

    // ── Generate Tasks (approval flow) ──────────────────────────
    case 'generate_tasks': {
      const c = pending.collected;

      if (pending.step === 'awaiting_approval') {
        if (isConfirm(msg)) {
          // Check if user wants to assign to a project
          const projects = new ProjectService().listByUser(userId);
          if (projects.length > 0) {
            const projectList = projects.map((p: { id: string; name: string }, i: number) => `**${i + 1}.** ${p.name}`).join(', ');
            return {
              role: 'assistant',
              content: `Which project should these tasks go into? ${projectList} — or say **no project**`,
              pendingIntent: { type: 'generate_tasks', step: 'awaiting_project', collected: { ...c, _projects: projects } },
            };
          }
          // No projects — create immediately
          const tasks = c.generatedTasks as GeneratedTask[];
          const result = bulkCreateTasks(tasks, userId);
          return {
            role: 'assistant',
            content: `Done! Created **${result.created} tasks** with **${result.subtasksCreated} subtasks**. You can find them on the Tasks page.`,
            action: { type: 'bulk_create_tasks', success: true, data: result },
            pendingIntent: null,
          };
        }
        if (isCancel(msg)) {
          return { role: 'assistant', content: "No problem, tasks were not created. Let me know if you'd like to try again with different instructions.", pendingIntent: null };
        }
        return { role: 'assistant', content: "Please say **yes** to create these tasks or **no** to cancel.", pendingIntent: pending };
      }

      if (pending.step === 'awaiting_project') {
        const projects = (c._projects as { id: string; name: string }[]) ?? [];
        let projectId: string | undefined;
        if (!isSkip(msg)) {
          const idx = parseInt(msg.trim()) - 1;
          const byIndex = !isNaN(idx) && projects[idx];
          const byName = projects.find(p => lower(p.name).includes(lower(msg.trim())));
          const match = byIndex || byName;
          if (match && typeof match !== 'boolean') projectId = match.id;
        }
        const tasks = c.generatedTasks as GeneratedTask[];
        const result = bulkCreateTasks(tasks, userId, projectId);
        const projectNote = projectId ? ' in the selected project' : '';
        return {
          role: 'assistant',
          content: `Done! Created **${result.created} tasks** with **${result.subtasksCreated} subtasks**${projectNote}. You can find them on the Tasks page.`,
          action: { type: 'bulk_create_tasks', success: true, data: result },
          pendingIntent: null,
        };
      }
      break;
    }
  }

  return { role: 'assistant', content: "I'm not sure what you mean. Type *cancel* to start over.", pendingIntent: pending };
}

async function handleFreshIntent(msg: string, intent: IntentType, userId: string, parsed?: ParsedRequest | null): Promise<ChatResponse> {

  switch (intent) {

    // ── Create Task ──────────────────────────────────────────────
    case 'create_task': {
      const titleFromMsg = parsed?.title || extractTitle(msg.replace(/\b(create|add|new|make)\s+(a\s+)?task\b/gi, '').trim());
      const priority = parsed?.priority || extractPriority(msg);
      const dueDate = parsed?.dueDate || extractDueDate(msg);

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

      // Have title + due date + priority — check if project was already mentioned
      const projects = new ProjectService().listByUser(userId);
      const projectIdFromMsg = (parsed?.projectName
        ? projects.find(p => lower(p.name).includes(lower(parsed.projectName!)) || lower(parsed.projectName!).includes(lower(p.name)))?.id
        : undefined) || extractProjectFromMessage(msg, projects);
      if (projectIdFromMsg) {
        return createTaskFromCollected({ title: titleFromMsg, priority: priority !== 'none' ? priority : undefined, dueDate: resolvedDue, projectId: projectIdFromMsg }, userId);
      }
      if (projects.length === 0) {
        return createTaskFromCollected({ title: titleFromMsg, priority: priority !== 'none' ? priority : undefined, dueDate: resolvedDue }, userId);
      }
      const projectList = projects.map((p, i) => `**${i + 1}.** ${p.name}`).join(', ');
      return {
        role: 'assistant',
        content: `Which project? ${projectList} — or say *no project*`,
        pendingIntent: { type: 'create_task', step: 'awaiting_project', collected: { title: titleFromMsg, priority: priority !== 'none' ? priority : undefined, dueDate: resolvedDue, _projects: projects } },
      };
    }

    // ── Delete Task ──────────────────────────────────────────────
    case 'delete_task': {
      const nameFromMsg = parsed?.title || extractTitle(msg.replace(/\b(delete|remove|trash)\s+(the\s+)?task\b/gi, '').trim());
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
      const nameFromMsg = parsed?.title || extractTitle(msg.replace(/\b(complete|finish|done|mark|close)\s+(the\s+)?(task\s+)?/gi, '').trim());
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
      const nameFromMsg = parsed?.title || extractTitle(msg.replace(/\b(create|add|new|make)\s+(a\s+)?project\b/gi, '').trim());
      if (!nameFromMsg) {
        return {
          role: 'assistant',
          content: "Sure! What should the project be called?",
          pendingIntent: { type: 'create_project', step: 'awaiting_name', collected: {} },
        };
      }
      // If description was provided in the message, create immediately
      if (parsed?.description !== undefined && parsed.description !== null) {
        try {
          const project = new ProjectService().create({ userId, name: nameFromMsg, description: parsed.description || undefined, status: 'active' });
          return { role: 'assistant', content: `Done! ✓ Created project **"${nameFromMsg}"**. You can find it on the Projects page.`, action: { type: 'create_project', success: true, data: project }, pendingIntent: null };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't create the project: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
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
      const titleFromMsg = parsed?.title || extractTitle(stripped.replace(/\b(to|about|for)\b/gi, '').replace(/\b(at|in|on|by|tomorrow|tonight|today|next|this)\s+.*/gi, '').trim());
      const timeFromMsg = parsed?.reminderTime || extractReminderTime(msg);

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
      const description = parsed?.timerDescription || (descMatch ? descMatch[1].trim() : undefined);
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
      const titleFromMsg = parsed?.title || extractTitle(msg.replace(/\b(create|add|new|make)\s+(a\s+)?checklist\b/gi, '').trim());
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
      const nameFromMsg = parsed?.title || extractTitle(msg.replace(/\b(update|edit|change|modify|rename|set|move)\s+(the\s+)?(task\s+)?/gi, '').trim());
      const priority = parsed?.priority || extractPriority(msg);
      const dueDate = parsed?.dueDate || extractDueDate(msg);
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
      const nameFromMsg = parsed?.title || extractTitle(msg.replace(/\b(delete|remove|trash)\s+(the\s+)?project\b/gi, '').trim());
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
      const nameFromMsg = parsed?.title || extractTitle(msg.replace(/\b(delete|remove)\s+(the\s+)?reminder\b/gi, '').trim());
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
      const checklistNameFromMsg = parsed?.checklistName || (itemMatch ? itemMatch[2].trim() : extractTitle(msg.replace(/\badd\b.*(item|to|in|checklist)\b/gi, '').trim()));
      const itemNameFromMsg = parsed?.itemName || (itemMatch ? itemMatch[1].trim() : null);

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
      const moodFromMsg = parsed?.moodRating ?? (numMatch ? parseInt(numMatch[1]) : null);
      const energyFromMsg = parsed?.energyLevel ?? null;
      const stressFromMsg = parsed?.stressLevel ?? null;
      const notesFromMsg = parsed?.notes ?? null;

      // If LLM extracted all three ratings, log immediately
      if (moodFromMsg && energyFromMsg && stressFromMsg) {
        try {
          const service = new MentalHealthService();
          const today2 = localDateStr(new Date());
          const checkIn = service.createCheckIn({
            userId,
            date: today2,
            moodRating: moodFromMsg as 1|2|3|4|5,
            energyLevel: energyFromMsg as 1|2|3|4|5,
            stressLevel: stressFromMsg as 1|2|3|4|5,
            notes: notesFromMsg ?? undefined,
          });
          const moodLabels = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Great'];
          return { role: 'assistant', content: `Done! ✓ Check-in logged — mood: **${moodLabels[moodFromMsg]}** (${moodFromMsg}/5), energy: ${energyFromMsg}/5, stress: ${stressFromMsg}/5.`, action: { type: 'log_mood', success: true, data: checkIn }, pendingIntent: null };
        } catch (err) {
          const m2 = err instanceof Error ? err.message : 'error';
          if (m2.toLowerCase().includes('already')) return { role: 'assistant', content: "You've already logged a check-in today! You can edit it on the Mental Health page.", pendingIntent: null };
          return { role: 'assistant', content: `Couldn't save check-in: ${m2}`, pendingIntent: null };
        }
      }

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
      const titleFromMsg = parsed?.title || extractTitle(msg.replace(/\b(write|create|new|add)\s+(a\s+)?(journal|diary)\s+(entry\s+)?(about|called|titled|on)?\b/gi, '').trim());
      const contentFromMsg = parsed?.content ?? null;

      // If content was provided in the message, save immediately
      if (contentFromMsg) {
        try {
          const service = new MentalHealthService();
          const entry = service.createJournalEntry({ userId, title: titleFromMsg ?? undefined, content: contentFromMsg });
          return { role: 'assistant', content: `Done! ✓ Journal entry saved${titleFromMsg ? ` — **"${titleFromMsg}"**` : ''}.`, action: { type: 'write_journal', success: true, data: entry }, pendingIntent: null };
        } catch (err) {
          return { role: 'assistant', content: `Couldn't save journal entry: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
        }
      }

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

    // ── Create Note ───────────────────────────────────────────────
    case 'create_note': {
      const titleFromMsg = parsed?.noteTitle || parsed?.title ||
        extractTitle(msg.replace(/\b(create|add|new|save|write|jot)\s+(a\s+)?note\s*(called|titled|named)?\b/gi, '').trim());
      const contentFromMsg = parsed?.noteContent || parsed?.content ||
        msg.replace(/\b(create|add|new|save|write|jot)\s+(a\s+)?note\s*(called|titled|named)?\s*/gi, '').replace(/^["']|["']$/g, '').trim() || null;

      if (!titleFromMsg && !contentFromMsg) {
        return {
          role: 'assistant',
          content: "What would you like to note down? Give it a title.",
          pendingIntent: { type: 'create_note', step: 'awaiting_title', collected: {} },
        };
      }

      const finalTitle = titleFromMsg || (contentFromMsg ? contentFromMsg.split('\n')[0].slice(0, 60) : 'Note');
      const finalContent = contentFromMsg || '';

      try {
        const service = new NoteService();
        const note = service.create({ userId, title: finalTitle, content: finalContent });
        return { role: 'assistant', content: `Done! ✓ Note saved — **"${note.title}"**.`, action: { type: 'create_note', success: true, data: note }, pendingIntent: null };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't save the note: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── List Notes ────────────────────────────────────────────────
    case 'list_notes': {
      try {
        const service = new NoteService();
        const notes = service.list(userId, { limit: 5 });
        if (notes.length === 0) {
          return { role: 'assistant', content: "You don't have any notes yet. Say *add a note* to create one!", pendingIntent: null };
        }
        const lines = notes.map(n => `- **${n.title}**${n.content ? `: ${n.content.slice(0, 80)}${n.content.length > 80 ? '…' : ''}` : ''}`);
        return { role: 'assistant', content: `Here are your recent notes:\n\n${lines.join('\n')}`, pendingIntent: null };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't fetch notes: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
    }

    // ── Delete Note ───────────────────────────────────────────────
    case 'delete_note': {
      const nameRaw = parsed?.noteTitle || parsed?.title ||
        msg.replace(/\b(delete|remove)\s+(the\s+)?note\s*(called|titled|named)?\s*/gi, '').trim();
      if (!nameRaw) {
        return { role: 'assistant', content: "Which note should I delete? Please give me the note title.", pendingIntent: null };
      }
      try {
        const service = new NoteService();
        const notes = service.list(userId, {}) as Array<{ id: string; title: string }>;
        const nl = nameRaw.toLowerCase();
        const found = notes.find(n => n.title.toLowerCase() === nl) || notes.find(n => n.title.toLowerCase().includes(nl) || nl.includes(n.title.toLowerCase()));
        if (!found) {
          return { role: 'assistant', content: `I couldn't find a note called **"${nameRaw}"**. Check the Notes page to see all your notes.`, pendingIntent: null };
        }
        return {
          role: 'assistant',
          content: `Are you sure you want to delete the note **"${found.title}"**? This can't be undone.`,
          pendingIntent: { type: 'delete_note', step: 'awaiting_confirmation', collected: { noteId: found.id, noteTitle: found.title } },
        };
      } catch (err) {
        return { role: 'assistant', content: `Couldn't find the note: ${err instanceof Error ? err.message : 'error'}`, pendingIntent: null };
      }
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

    // ── Generate Tasks from File ────────────────────────────────
    case 'generate_tasks': {
      return {
        role: 'assistant',
        content: "To generate tasks, please attach a file using the 📎 button (transcript, document, code, notes, etc.) and I'll analyze it to create tasks and subtasks for you.",
        pendingIntent: null,
      };
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
          "**Generate Tasks from Files**\n" +
          "- Attach a file (transcript, code, document) using 📎 and say *generate tasks*\n" +
          "- I'll analyze the content and create tasks with subtasks for your approval\n\n" +
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
          "**Notes**\n" +
          "- *Add a note: buy groceries*\n" +
          "- *Show my notes*\n" +
          "- *Delete note buy groceries*\n\n" +
          "**Analytics**\n" +
          "- *How am I doing?* / *Show my stats*\n\n" +
          (isLLMEnabled() ? "*You can also ask me anything in natural language — I understand full sentences!*" : ""),
        pendingIntent: null,
      };
    }
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, pendingIntent, fileContent, fileName } = body;

    if (!message || typeof message !== 'string') {
      return errorResponse(new Error('"message" string is required'));
    }

    const userId = await getCurrentUserId();
    let response: ChatResponse;

    if (pendingIntent) {
      // Continue an existing guided conversation flow — no LLM needed
      response = await handlePendingIntent(message, pendingIntent, userId);
    } else if (fileContent && typeof fileContent === 'string') {
      // File was attached — generate tasks from it
      if (!isLLMEnabled()) {
        response = {
          role: 'assistant',
          content: "AI is not configured. Please set up an AI provider (Gemini or Groq) in your environment to use task generation from files.",
          pendingIntent: null,
        };
      } else {
        const result = await generateTasksFromContent(fileContent, message, userId);
        if (!result || result.tasks.length === 0) {
          response = {
            role: 'assistant',
            content: `I couldn't extract any tasks from **${fileName || 'the file'}**. Try attaching a different file or providing more context in your message.`,
            pendingIntent: null,
          };
        } else {
          const preview = formatTaskPreview(result.tasks);
          response = {
            role: 'assistant',
            content: preview,
            pendingIntent: {
              type: 'generate_tasks',
              step: 'awaiting_approval',
              collected: { generatedTasks: result.tasks },
            },
          };
        }
      }
    } else {
      // Fresh message — try LLM parse (intent + entities) first, fall back to regex
      let intent: IntentType;
      let parsed: ParsedRequest | null = null;
      const llmParsed = await parseRequestWithLLM(message);
      if (llmParsed) {
        parsed = llmParsed;
        intent = llmParsed.intent;
      } else {
        intent = detectIntent(message);
      }

      if (intent === 'unknown') {
        // Use LLM for conversational/unknown messages with full app knowledge
        const llmResponse = await handleConversationalWithLLM(message, userId);
        response = llmResponse ?? await handleFreshIntent(message, 'help', userId, parsed);
      } else {
        response = await handleFreshIntent(message, intent, userId, parsed);
      }
    }

    return successResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
}
