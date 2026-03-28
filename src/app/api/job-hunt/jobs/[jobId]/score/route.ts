import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { scoreJob } from '@/lib/ai/job-scorer';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const { jobId } = await params;

    const job = service.getJob(jobId);
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded. Please upload your resume first.'));
    }

    const result = await scoreJob(resume, job);

    const updated = service.updateJob(jobId, userId, {
      score: result.score,
      scoreReasons: result.reasons,
    } as Record<string, unknown>);

    return successResponse({ ...updated, scoring: result });
  } catch (error) {
    return errorResponse(error);
  }
}
