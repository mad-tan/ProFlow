import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

interface AIChatAction {
  type: string;
  data: Record<string, unknown>;
}

interface AIChatResponse {
  role: 'assistant';
  content: string;
  action?: AIChatAction;
}

function parseIntent(message: string): AIChatResponse {
  const lower = message.toLowerCase().trim();

  // Create task intent
  if (lower.includes('create task') || lower.includes('add task') || lower.includes('new task')) {
    const titleMatch = message.match(/(?:called|named|titled|:)\s*["']?(.+?)["']?\s*$/i);
    const title = titleMatch ? titleMatch[1] : 'New Task';
    return {
      role: 'assistant',
      content: `I'll create a task called "${title}" for you.`,
      action: {
        type: 'create_task',
        data: { title },
      },
    };
  }

  // Set reminder intent
  if (lower.includes('remind') || lower.includes('set reminder') || lower.includes('set a reminder')) {
    const titleMatch = message.match(/(?:to|about)\s+["']?(.+?)["']?\s*(?:at|in|on|$)/i);
    const title = titleMatch ? titleMatch[1] : 'Reminder';
    return {
      role: 'assistant',
      content: `I'll set a reminder for "${title}".`,
      action: {
        type: 'set_reminder',
        data: { title },
      },
    };
  }

  // Start timer intent
  if (lower.includes('start timer') || lower.includes('start tracking') || lower.includes('track time')) {
    const taskMatch = message.match(/(?:for|on)\s+["']?(.+?)["']?\s*$/i);
    const taskName = taskMatch ? taskMatch[1] : undefined;
    return {
      role: 'assistant',
      content: taskName
        ? `I'll start tracking time for "${taskName}".`
        : "I'll start a timer for you.",
      action: {
        type: 'start_timer',
        data: { taskName },
      },
    };
  }

  // Stop timer intent
  if (lower.includes('stop timer') || lower.includes('stop tracking')) {
    return {
      role: 'assistant',
      content: "I'll stop your current timer.",
      action: {
        type: 'stop_timer',
        data: {},
      },
    };
  }

  // Show summary / analytics intent
  if (lower.includes('summary') || lower.includes('how am i doing') || lower.includes('productivity')) {
    return {
      role: 'assistant',
      content: "Let me pull up your productivity summary.",
      action: {
        type: 'show_summary',
        data: {},
      },
    };
  }

  // Create checklist intent
  if (lower.includes('checklist') || lower.includes('create checklist') || lower.includes('new checklist')) {
    const titleMatch = message.match(/(?:called|named|titled|:)\s*["']?(.+?)["']?\s*$/i);
    const title = titleMatch ? titleMatch[1] : 'New Checklist';
    return {
      role: 'assistant',
      content: `I'll create a checklist called "${title}" for you.`,
      action: {
        type: 'create_checklist',
        data: { title },
      },
    };
  }

  // Default fallback - no specific action detected
  return {
    role: 'assistant',
    content:
      "I can help you manage tasks, set reminders, track time, and view your productivity. Try saying things like:\n" +
      '- "Create a task called Review PR"\n' +
      '- "Remind me to check emails at 3pm"\n' +
      '- "Start a timer for deep work"\n' +
      '- "Show my productivity summary"',
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

    const response = parseIntent(message);
    return successResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
}
