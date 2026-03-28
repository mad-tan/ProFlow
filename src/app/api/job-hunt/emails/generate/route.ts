import { getCurrentUserId } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { JobHuntService } from '@/lib/services/job-hunt.service';
import { generateColdEmail, generateFollowUp } from '@/lib/ai/email-generator';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const service = new JobHuntService();
    const userId = await getCurrentUserId();
    const resume = service.getResume(userId);

    if (!resume) {
      return errorResponse(new Error('No resume uploaded. Please upload your resume first.'));
    }

    const body = await request.json();
    const { recipientName, recipientTitle, company, jobTitle, style = 'formal', followUp, originalEmailId } = body;

    if (followUp && originalEmailId) {
      // Generate follow-up email
      const original = service.getEmail(originalEmailId);
      const result = await generateFollowUp(
        original.subject,
        original.body,
        original.recipientName,
        (original.followUpCount ?? 0) + 1
      );
      return successResponse(result);
    }

    // Generate new cold email
    if (!recipientName || !company) {
      return errorResponse(new Error('recipientName and company are required'));
    }

    const result = await generateColdEmail(
      resume,
      jobTitle ?? 'the open position',
      { name: recipientName, title: recipientTitle ?? null, company },
      style
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
