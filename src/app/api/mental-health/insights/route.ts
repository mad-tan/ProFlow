import { getCurrentUserId } from '@/lib/auth';
import { MentalHealthService } from '@/lib/services/mental-health.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { callLLMStructured, isLLMEnabled } from '@/lib/ai/provider';
import { z } from 'zod';

const insightsSchema = z.object({
  summary: z.string(),
  burnoutRisk: z.enum(['low', 'moderate', 'high']),
  burnoutRiskReason: z.string(),
  patterns: z.array(z.object({
    title: z.string(),
    description: z.string(),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
  })),
  recommendations: z.array(z.string()),
  moodTrend: z.enum(['improving', 'declining', 'stable']),
  energyTrend: z.enum(['improving', 'declining', 'stable']),
  stressTrend: z.enum(['improving', 'declining', 'stable']),
  highlights: z.array(z.string()),
});

export type MentalHealthInsights = z.infer<typeof insightsSchema>;

export async function GET() {
  try {
    const service = new MentalHealthService();
    const userId = await getCurrentUserId();

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const checkIns = service.getCheckIns(userId, {
      start: twoWeeksAgo.toISOString(),
      end: now.toISOString(),
    });

    const burnout = service.calculateBurnoutRisk(userId);

    if (checkIns.length === 0) {
      return successResponse({
        summary: "No check-in data yet. Start logging your mood, energy, and stress levels to get personalized insights.",
        burnoutRisk: burnout.riskLevel,
        burnoutRiskReason: "Not enough data to assess burnout risk.",
        patterns: [],
        recommendations: [
          "Log your first check-in to start tracking your mental health.",
          "Try to check in at least once a day for the most accurate insights.",
          "Include notes about what's affecting your mood for better analysis.",
        ],
        moodTrend: "stable",
        energyTrend: "stable",
        stressTrend: "stable",
        highlights: [],
        checkinCount: 0,
        averages: burnout.averages,
        generatedAt: new Date().toISOString(),
        aiPowered: false,
      });
    }

    // Prepare data summary for the AI
    const avgMood = (checkIns.reduce((s, c) => s + c.moodRating, 0) / checkIns.length).toFixed(1);
    const avgEnergy = (checkIns.reduce((s, c) => s + c.energyLevel, 0) / checkIns.length).toFixed(1);
    const avgStress = (checkIns.reduce((s, c) => s + c.stressLevel, 0) / checkIns.length).toFixed(1);

    // Compute simple trends by comparing first half vs second half
    const half = Math.floor(checkIns.length / 2);
    const firstHalf = checkIns.slice(0, half || 1);
    const secondHalf = checkIns.slice(half);
    const moodDelta = (secondHalf.reduce((s, c) => s + c.moodRating, 0) / secondHalf.length) - (firstHalf.reduce((s, c) => s + c.moodRating, 0) / firstHalf.length);
    const energyDelta = (secondHalf.reduce((s, c) => s + c.energyLevel, 0) / secondHalf.length) - (firstHalf.reduce((s, c) => s + c.energyLevel, 0) / firstHalf.length);
    const stressDelta = (firstHalf.reduce((s, c) => s + c.stressLevel, 0) / firstHalf.length) - (secondHalf.reduce((s, c) => s + c.stressLevel, 0) / secondHalf.length);

    const notes = checkIns
      .filter((c) => c.notes)
      .slice(-8)
      .map((c) => `[${c.date}] ${c.notes}`)
      .join('\n');

    const recentData = checkIns.slice(-10).map((c) =>
      `${c.date}: mood=${c.moodRating}/5 energy=${c.energyLevel}/5 stress=${c.stressLevel}/5${c.sleepHours != null ? ` sleep=${c.sleepHours}h` : ''}`
    ).join('\n');

    let aiInsights: MentalHealthInsights | null = null;

    if (isLLMEnabled()) {
      const systemPrompt = `You are a compassionate mental health insights assistant. Analyze the user's mental health data and provide personalized, actionable insights. Be warm, encouraging, and specific. Focus on real patterns in the data.`;

      const userMessage = `Analyze my mental health data from the past ${checkIns.length} check-ins over the last 14 days:

AVERAGES:
- Mood: ${avgMood}/5
- Energy: ${avgEnergy}/5
- Stress: ${avgStress}/5

RECENT ENTRIES (newest last):
${recentData}

${notes ? `JOURNAL NOTES:\n${notes}` : ''}

BURNOUT RISK (rule-based): ${burnout.riskLevel}
${burnout.factors.length > 0 ? `Risk factors: ${burnout.factors.join(', ')}` : 'No risk factors detected'}

Provide insights, patterns you notice, and specific actionable recommendations.`;

      aiInsights = await callLLMStructured(systemPrompt, userMessage, insightsSchema);
    }

    if (!aiInsights) {
      // Fallback to rule-based insights
      const getTrend = (delta: number): 'improving' | 'declining' | 'stable' =>
        delta > 0.3 ? 'improving' : delta < -0.3 ? 'declining' : 'stable';

      aiInsights = {
        summary: `Over the past ${checkIns.length} check-ins, your average mood is ${avgMood}/5, energy is ${avgEnergy}/5, and stress is ${avgStress}/5.`,
        burnoutRisk: burnout.riskLevel,
        burnoutRiskReason: burnout.factors.length > 0 ? burnout.factors.join('. ') : 'Your indicators are within healthy ranges.',
        patterns: [
          ...(parseFloat(avgStress) >= 4 ? [{ title: 'High Stress Levels', description: `Your average stress (${avgStress}/5) has been elevated. This can impact productivity and wellbeing.`, sentiment: 'negative' as const }] : []),
          ...(parseFloat(avgEnergy) <= 2.5 ? [{ title: 'Low Energy', description: `Your average energy (${avgEnergy}/5) is below the midpoint. Consider reviewing sleep habits and workload.`, sentiment: 'negative' as const }] : []),
          ...(parseFloat(avgMood) >= 4 ? [{ title: 'Positive Mood', description: `Your average mood (${avgMood}/5) has been good — keep up whatever is working!`, sentiment: 'positive' as const }] : []),
        ],
        recommendations: [
          ...(parseFloat(avgStress) >= 4 ? ['Try taking short breaks every 90 minutes to reduce stress accumulation.'] : []),
          ...(parseFloat(avgEnergy) <= 2.5 ? ['Aim for 7-9 hours of sleep and consider a short walk in the morning for energy.'] : []),
          checkIns.length < 5 ? 'Log check-ins more consistently to get better pattern analysis.' : 'Great consistency with check-ins — keep it up!',
          'Use the journal feature to capture what\'s affecting your mood for more detailed insights.',
        ],
        moodTrend: getTrend(moodDelta),
        energyTrend: getTrend(energyDelta),
        stressTrend: getTrend(stressDelta),
        highlights: burnout.factors.length === 0 ? ['No burnout risk factors detected in the past 2 weeks.'] : burnout.factors,
      };
    }

    return successResponse({
      ...aiInsights,
      checkinCount: checkIns.length,
      averages: burnout.averages,
      generatedAt: new Date().toISOString(),
      aiPowered: isLLMEnabled(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
