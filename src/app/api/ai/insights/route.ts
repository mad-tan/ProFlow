import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { TaskService } from '@/lib/services/task.service';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import { callLLMStructured, isLLMEnabled } from '@/lib/ai/provider';
import { z } from 'zod';

const insightSchema = z.object({
  insights: z.array(
    z.object({
      type: z.enum(['positive', 'warning', 'suggestion']),
      title: z.string(),
      message: z.string(),
    })
  ).min(1).max(5),
});

type InsightType = 'positive' | 'warning' | 'suggestion';

interface Insight {
  type: InsightType;
  title: string;
  message: string;
}

/** Fallback insights derived from real data without LLM */
function buildFallbackInsights(
  summary: Record<string, unknown>,
  tasks: Array<{ status: string; priority: string; dueDate?: string | null }>
): Insight[] {
  const insights: Insight[] = [];
  const total = Number(summary.totalTasks ?? 0);
  const done = Number(summary.completedTasks ?? 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = Number(summary.overdueTasks ?? 0);
  const mood = Number(summary.averageMood ?? summary.moodAverage ?? 0);
  const stress = Number(summary.averageStress ?? 0);
  const mins = Number(summary.totalTrackedMinutes ?? 0);

  if (pct >= 70) {
    insights.push({ type: 'positive', title: 'Strong completion rate', message: `You've completed ${pct}% of your tasks. Keep up the great momentum!` });
  } else if (total > 0) {
    insights.push({ type: 'suggestion', title: 'Boost your completion rate', message: `You're at ${pct}% completion. Try tackling one small task now to build momentum.` });
  }

  if (overdue > 0) {
    insights.push({ type: 'warning', title: `${overdue} overdue task${overdue > 1 ? 's' : ''}`, message: `You have ${overdue} overdue task${overdue > 1 ? 's' : ''}. Consider rescheduling or delegating to reduce pressure.` });
  }

  if (stress >= 4) {
    insights.push({ type: 'warning', title: 'High stress detected', message: 'Your recent check-ins show elevated stress. Consider taking short breaks between tasks.' });
  } else if (mood >= 4) {
    insights.push({ type: 'positive', title: 'Great mood streak', message: 'Your mood has been consistently positive. Keep up the healthy habits!' });
  }

  if (mins > 0) {
    const h = Math.floor(mins / 60);
    insights.push({ type: 'positive', title: 'Time tracking active', message: `You've tracked ${h > 0 ? `${h}h ` : ''}${mins % 60}m of focused work. Time awareness improves productivity.` });
  } else {
    insights.push({ type: 'suggestion', title: 'Start time tracking', message: 'Try using the timer for your next task. Tracking time builds focus and reveals where your day goes.' });
  }

  return insights.slice(0, 3);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const analyticsSvc = new AnalyticsService();
    const taskSvc = new TaskService();
    const mhSvc = new MentalHealthService();

    const summary = analyticsSvc.getSummary(userId) as unknown as Record<string, unknown>;
    const tasks = taskSvc.listByUser(userId, {}) as Array<{ status: string; priority: string; dueDate?: string | null; title: string }>;
    const recentCheckIns = mhSvc.getCheckIns(userId) as Array<{ date: string; moodRating: number; energyLevel: number; stressLevel: number; notes?: string }>;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const productivityScores = analyticsSvc.getProductivityScores(userId, thirtyDaysAgo.toISOString().split('T')[0], new Date().toISOString().split('T')[0]);

    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const urgentTasks = activeTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
    const overdueTasks = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
    const recentMoods = recentCheckIns.slice(0, 7);
    const avgMood = recentMoods.length > 0 ? recentMoods.reduce((s, c) => s + c.moodRating, 0) / recentMoods.length : 0;
    const avgStress = recentMoods.length > 0 ? recentMoods.reduce((s, c) => s + c.stressLevel, 0) / recentMoods.length : 0;

    if (!isLLMEnabled()) {
      const fallback = buildFallbackInsights(summary, tasks);
      return successResponse({ insights: fallback, source: 'computed' });
    }

    const dataContext = `
User Productivity Data (last 30 days):
- Total tasks: ${tasks.length} (${activeTasks.length} active, ${tasks.filter(t=>t.status==='done').length} completed)
- Task completion rate: ${tasks.length > 0 ? Math.round((tasks.filter(t=>t.status==='done').length / tasks.length) * 100) : 0}%
- Overdue tasks: ${overdueTasks.length}${overdueTasks.length > 0 ? ` (${overdueTasks.map(t=>t.title).slice(0,3).join(', ')})` : ''}
- Urgent/high priority tasks: ${urgentTasks.length}${urgentTasks.length > 0 ? ` (${urgentTasks.map(t=>t.title).slice(0,3).join(', ')})` : ''}
- Total time tracked: ${Math.floor(Number(summary.totalTrackedMinutes??0)/60)}h ${Number(summary.totalTrackedMinutes??0)%60}m
- Recent mood average (last 7 check-ins): ${avgMood > 0 ? avgMood.toFixed(1) + '/5' : 'No data'}
- Recent stress average: ${avgStress > 0 ? avgStress.toFixed(1) + '/5' : 'No data'}
- Productivity scores (last 7 days): ${productivityScores.slice(0,7).map(s=>`${s.date}: ${s.score}`).join(', ') || 'No data'}
- Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    `.trim();

    const systemPrompt = `You are an AI productivity coach for ProFlow. Generate 3 personalized, data-driven insights based on the user's actual productivity data.

Rules:
- Each insight must be directly based on the data provided — no generic advice
- Use specific numbers from the data (e.g., "You have 3 overdue tasks", not "you have some overdue tasks")
- Types: "positive" (celebrating good patterns), "warning" (flags issues needing attention), "suggestion" (actionable improvement tips)
- Title: short, 3-6 words
- Message: 1-2 sentences, specific and actionable
- If data is sparse (new user), give encouraging onboarding-style insights
- Return exactly 3 insights with a good mix of types

Respond ONLY with valid JSON matching: { "insights": [{ "type": "positive|warning|suggestion", "title": "...", "message": "..." }] }`;

    const result = await callLLMStructured(systemPrompt, dataContext, insightSchema);

    if (!result || !result.insights?.length) {
      const fallback = buildFallbackInsights(summary, tasks);
      return successResponse({ insights: fallback, source: 'computed' });
    }

    return successResponse({ insights: result.insights, source: 'ai' });
  } catch (error) {
    return errorResponse(error);
  }
}
